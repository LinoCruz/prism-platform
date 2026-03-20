import { createClient } from '@/lib/supabase/server'

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
