import { createClient } from '@/lib/supabase/server'
import type { Enums } from '@/types/database.types'

export async function getMyReviews() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_reviews')
    .select('*, tasks(*), task_versions(*)')
    .eq('reviewer_id', user.id)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function startReview(taskId: string, versionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { count } = await supabase
    .from('task_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)

  const { data, error } = await supabase
    .from('task_reviews')
    .insert({
      task_id: taskId,
      version_id: versionId,
      reviewer_id: user.id,
      review_number: (count ?? 0) + 1,
    })
    .select()
    .single()
  if (error) throw error

  // Mark task as in_review once a reviewer picks it up
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'in_review' })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}

export async function completeReview(
  reviewId: string,
  decision: Enums<'review_decision'>,
  score: number,
  feedback: string,
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_reviews')
    .update({
      decision,
      score,
      feedback,
      completed_at: new Date().toISOString(),
    })
    .eq('review_id', reviewId)
    .select()
    .single()
  if (error) throw error

  // Update task status based on decision
  const nextStatus = decision === 'approved' ? 'signed_off' : 'sent_for_rework'
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('task_id', data.task_id)
  if (statusError) throw statusError

  return data
}

export async function getMyAudits() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_audits')
    .select('*, task_reviews(*, tasks(*))')
    .eq('auditor_id', user.id)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function startAudit(reviewId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_audits')
    .insert({ review_id: reviewId, auditor_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeAudit(
  auditId: string,
  decision: Enums<'audit_decision'>,
  score: number,
  feedback: string,
  action: Enums<'audit_action'>,
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_audits')
    .update({
      decision,
      score,
      feedback,
      action,
      completed_at: new Date().toISOString(),
    })
    .eq('audit_id', auditId)
    .select()
    .single()
  if (error) throw error
  return data
}
