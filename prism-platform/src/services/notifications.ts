import { createClient } from '@/lib/supabase/server'

export async function getUserNotifications(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
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

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}

export async function createNotification(
  userId: string,
  type: 'TASK_REWORK' | 'REVIEW_COMPLETED' | 'AUDIT_FEEDBACK' | 'COURSE_REQUIRED' | 'ANNOUNCEMENT',
  title: string,
  message: string,
  referenceType?: string,
  referenceId?: string,
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
    })
  if (error) throw error
}
