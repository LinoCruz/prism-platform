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

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return users
}

export type UserStatus = 'onboarding' | 'pending_entry_quiz' | 'training' | 'active' | 'disabled'

export async function updateUserStatus(userId: string, status: UserStatus) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    throw new Error('Admins cannot change their own status')
  }

  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateUserRole(userId: string, role: Role) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    throw new Error('Admins cannot change their own role')
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('user_id', userId)
  if (error) throw error
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
