import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'

export async function getCurrentUser(): Promise<Tables<'users'>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function getCurrentUserRoles() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return [data.role]
}

export async function getNotifications({ unreadOnly = false } = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('notification_id', notificationId)
  if (error) throw error
}

export async function getAnnouncements({ activeOnly = true } = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('announcements')
    .select('*, announcement_reads(*)')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function markAnnouncementRead(announcementId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, user_id: user.id })
  if (error) throw error
}
