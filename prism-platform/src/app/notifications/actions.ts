'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notifications'

export async function fetchNotificationsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return getUserNotifications(user.id)
}

export async function markReadAction(notificationId: string) {
  await markNotificationRead(notificationId)
}

export async function markAllReadAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await markAllNotificationsRead(user.id)
}
