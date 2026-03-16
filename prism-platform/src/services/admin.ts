import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRoles } from './users'
import type { Database } from '@/types/database.types'

type Role = Database['public']['Enums']['user_role']

export async function checkAdmin() {
  const roles = await getCurrentUserRoles()
  if (!roles.includes('admin')) {
    throw new Error('Unauthorized')
  }
}

export async function getAllUsersWithRoles() {
  await checkAdmin()
  const supabase = await createClient()
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (usersError) throw usersError

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')

  if (rolesError) throw rolesError

  return users.map(user => ({
    ...user,
    roles: roles.filter(r => r.user_id === user.user_id).map(r => r.role)
  }))
}

export async function updateUserRole(userId: string, role: Role, remove: boolean) {
  await checkAdmin()
  const supabase = await createClient()

  if (remove) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .match({ user_id: userId, role })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role })
    if (error) throw error
  }
}

export async function uploadTaskDataset(tasks: { external_id: string, question: string }[]) {
  await checkAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .upsert(
      tasks.map(t => ({
        external_id: t.external_id,
        question: t.question,
        status: 'available' as const
      })),
      { onConflict: 'external_id' }
    )

  if (error) throw error
  return data
}
