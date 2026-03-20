'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  startReview as startReviewService,
  completeReview as completeReviewService,
  startAudit as startAuditService,
  completeAudit as completeAuditService,
} from '@/services/reviews'
import { createClient } from '@/lib/supabase/server'
import type { Enums } from '@/types/database.types'
import type { ReviewerEdits } from '@/services/reviews'

export async function startReview(formData: FormData) {
  const taskId = formData.get('taskId') as string
  const versionId = formData.get('versionId') as string
  const review = await startReviewService(taskId, versionId)
  redirect(`/reviews/${review.review_id}`)
}

export async function completeReview(formData: FormData) {
  const reviewId = formData.get('reviewId') as string
  const decision = formData.get('decision') as Enums<'review_decision'>
  const score = parseFloat(formData.get('score') as string)
  const feedback = formData.get('feedback') as string
  await completeReviewService(reviewId, decision, score, feedback)
  redirect('/reviews')
}

// ─── Modal split-flow actions ──────────────────────────────────────────────

// Open modal: create (or reuse) a review row and return its ID
export async function startReviewAction(
  taskId: string,
  versionId: string,
): Promise<{ reviewId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Reuse an existing open review (completed_at IS NULL) for this reviewer + task
    const { data: existing } = await supabase
      .from('task_reviews')
      .select('review_id')
      .eq('task_id', taskId)
      .eq('reviewer_id', user.id)
      .is('completed_at', null)
      .maybeSingle()

    if (existing) return { reviewId: existing.review_id }

    // Resolve versionId — fall back to current_version_id, or create a baseline version
    let resolvedVersionId = versionId
    if (!resolvedVersionId) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('current_version_id')
        .eq('task_id', taskId)
        .single()
      if (taskError) return { error: taskError.message }

      if (task.current_version_id) {
        resolvedVersionId = task.current_version_id
      } else {
        // Task was submitted without a version snapshot — create a baseline from raw QA fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rawTask } = await supabase
          .from('tasks')
          .select('question, original_question, original_answer, is_question_valid, question_invalid_reason, new_question, is_answer_valid, answer_invalid_reason, new_answer, is_temporal' as any)
          .eq('task_id', taskId)
          .single()

        const { data: newVersion, error: versionError } = await supabase
          .from('task_versions')
          .insert({
            task_id: taskId,
            version_number: 1,
            created_by_user_id: user.id,
            source: 'trainer',
            data_payload: rawTask ?? {},
          })
          .select('version_id')
          .single()
        if (versionError) return { error: versionError.message }

        await supabase
          .from('tasks')
          .update({ current_version_id: newVersion.version_id })
          .eq('task_id', taskId)

        resolvedVersionId = newVersion.version_id
      }
    }

    const review = await startReviewService(taskId, resolvedVersionId)
    return { reviewId: review.review_id }
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : JSON.stringify(e)
    return { error: msg }
  }
}

// Submit modal: complete an existing review by its ID
export async function completeReviewAction(
  reviewId: string,
  decision: Enums<'review_decision'>,
  score: number,
  feedback: string,
  edits?: ReviewerEdits,
): Promise<{ error?: string }> {
  try {
    await completeReviewService(reviewId, decision, score, feedback, edits)
    revalidatePath('/reviews')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to complete review' }
  }
}

// ─── Time tracking actions ─────────────────────────────────────────────────

// Start a new time segment (handles crash recovery: closes any open segment first)
export async function startTimeSegmentAction(
  taskId: string,
  referenceType: Enums<'time_reference_type'>,
  referenceId: string,
  role: Enums<'user_role'>,
): Promise<{ timeId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Crash recovery: close any open segment for this reference
    const { data: openSegment } = await supabase
      .from('task_time')
      .select('time_id, last_heartbeat_at, segment_start')
      .eq('reference_id', referenceId)
      .is('segment_end', null)
      .maybeSingle()

    if (openSegment) {
      const closeAt = openSegment.last_heartbeat_at ?? openSegment.segment_start
      await supabase
        .from('task_time')
        .update({ segment_end: closeAt })
        .eq('time_id', openSegment.time_id)
    }

    const { data, error } = await supabase
      .from('task_time')
      .insert({
        task_id: taskId,
        expert_id: user.id,
        role,
        reference_type: referenceType,
        reference_id: referenceId,
      })
      .select('time_id')
      .single()

    if (error) return { error: error.message }
    return { timeId: data.time_id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to start time segment' }
  }
}

// Fire-and-forget: update heartbeat timestamp on the active segment
export async function heartbeatAction(timeId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase
      .from('task_time')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('time_id', timeId)
      .is('segment_end', null)
  } catch {
    // Intentionally silent
  }
}

// Close an open segment (pause or submit)
export async function endTimeSegmentAction(timeId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase
      .from('task_time')
      .update({ segment_end: new Date().toISOString() })
      .eq('time_id', timeId)
      .is('segment_end', null)
  } catch {
    // Intentionally silent
  }
}

export interface TaskContent {
  question: string | null
  original_question: string | null
  original_answer: string | null
  is_question_valid: boolean | null
  question_invalid_reason: string | null
  new_question: string | null
  is_answer_valid: boolean | null
  answer_invalid_reason: string | null
  new_answer: string | null
  is_temporal: boolean | null
  temporal_values: string[]
  // fallback: raw data_payload if QA fields aren't populated
  dataPayload: Record<string, unknown> | null
}

export async function fetchTaskContentAction(taskId: string): Promise<{
  content?: TaskContent
  error?: string
}> {
  const supabase = await createClient()

  const [{ data: task, error }, { data: temporalValues }] = await Promise.all([
    supabase
      .from('tasks')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('*, task_versions!task_versions_task_id_fkey(version_id, data_payload)' as any)
      .eq('task_id', taskId)
      .single(),
    supabase
      .from('task_temporal_values')
      .select('value')
      .eq('task_id', taskId),
  ])
  if (error) return { error: (error as { message: string }).message }

  const raw = task as unknown as Record<string, unknown>
  const versions = raw.task_versions as { version_id: string; data_payload: unknown }[]
  const currentVersion = versions?.find((v) => v.version_id === raw.current_version_id)
  const payload = (currentVersion?.data_payload as Record<string, unknown>) ?? null

  // Prefer columns on tasks table; fall back to data_payload keys
  function col<T>(key: string): T | null {
    const v = raw[key]
    if (v !== undefined && v !== null) return v as T
    return (payload?.[key] as T) ?? null
  }

  return {
    content: {
      question: col<string>('question'),
      original_question: col<string>('original_question'),
      original_answer: col<string>('original_answer'),
      is_question_valid: col<boolean>('is_question_valid'),
      question_invalid_reason: col<string>('question_invalid_reason'),
      new_question: col<string>('new_question'),
      is_answer_valid: col<boolean>('is_answer_valid'),
      answer_invalid_reason: col<string>('answer_invalid_reason'),
      new_answer: col<string>('new_answer'),
      is_temporal: col<boolean>('is_temporal'),
      temporal_values: temporalValues?.map((r) => r.value) ?? [],
      dataPayload: payload,
    },
  }
}

export async function submitReviewAction(
  taskId: string,
  versionId: string,
  decision: Enums<'review_decision'>,
  score: number,
  feedback: string,
  edits?: ReviewerEdits,
): Promise<{ error?: string }> {
  try {
    const review = await startReviewService(taskId, versionId)
    await completeReviewService(review.review_id, decision, score, feedback, edits)
    revalidatePath('/reviews')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to submit review' }
  }
}

export async function startAudit(formData: FormData) {
  const reviewId = formData.get('reviewId') as string
  const audit = await startAuditService(reviewId)
  redirect(`/reviews/${audit.review_id}?auditId=${audit.audit_id}`)
}

export async function completeAudit(formData: FormData) {
  const auditId = formData.get('auditId') as string
  const decision = formData.get('decision') as Enums<'audit_decision'>
  const score = parseFloat(formData.get('score') as string)
  const feedback = formData.get('feedback') as string
  const action = formData.get('action') as Enums<'audit_action'>
  await completeAuditService(auditId, decision, score, feedback, action)
  redirect('/reviews')
}
