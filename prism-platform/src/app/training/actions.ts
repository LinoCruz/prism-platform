'use server'

import { redirect } from 'next/navigation'
import {
  startQuizAttempt as startQuizAttemptService,
  completeQuizAttempt as completeQuizAttemptService,
} from '@/services/training'

export async function startQuizAttempt(formData: FormData) {
  const quizId = formData.get('quizId') as string
  const attempt = await startQuizAttemptService(quizId)
  redirect(`/training/quiz/${attempt.attempt_id}`)
}

export async function completeQuizAttempt(formData: FormData) {
  const attemptId = formData.get('attemptId') as string
  const score = parseFloat(formData.get('score') as string)
  const passed = score >= 70
  await completeQuizAttemptService(attemptId, score, passed)
  redirect('/training')
}
