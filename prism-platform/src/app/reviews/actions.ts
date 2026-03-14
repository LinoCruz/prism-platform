'use server'

import { redirect } from 'next/navigation'
import {
  startReview as startReviewService,
  completeReview as completeReviewService,
  startAudit as startAuditService,
  completeAudit as completeAuditService,
} from '@/services/reviews'
import type { Enums } from '@/types/database.types'

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
