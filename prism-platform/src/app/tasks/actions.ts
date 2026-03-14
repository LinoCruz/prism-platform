'use server'

import { redirect } from 'next/navigation'
import { claimTask as claimTaskService, submitTask as submitTaskService } from '@/services/tasks'

export async function claimTask(formData: FormData) {
  const taskId = formData.get('taskId') as string
  await claimTaskService(taskId)
  redirect('/my-tasks')
}

export async function submitTask(formData: FormData) {
  const taskId = formData.get('taskId') as string
  const versionId = formData.get('versionId') as string
  await submitTaskService(taskId, versionId)
  redirect('/my-tasks')
}
