'use server'

import { redirect } from 'next/navigation'
import { claimTask as claimTaskService, submitTask as submitTaskService, startTask, cancelTask, finishTask } from '@/services/tasks'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/sign-in')
}

export async function updateUserProfile(formData: FormData): Promise<{ error?: string }> {
  const firstName = (formData.get('firstName') as string)?.trim() || null
  const lastName = (formData.get('lastName') as string)?.trim() || null
  const personalEmail = (formData.get('personalEmail') as string)?.trim() || null

  if (!firstName) return { error: 'First name is required' }

  const displayName = lastName ? `${firstName} ${lastName}` : firstName

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ first_name: firstName, last_name: lastName, display_name: displayName, personal_email: personalEmail })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return {}
}

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

export async function startTaskAction(taskId: string): Promise<{ error?: string }> {
  try {
    await startTask(taskId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to start task' }
  }
}

export async function cancelTaskAction(taskId: string): Promise<{ error?: string }> {
  try {
    await cancelTask(taskId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to cancel task' }
  }
}

export async function finishTaskAction(taskId: string): Promise<{ error?: string }> {
  try {
    await finishTask(taskId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to submit task' }
  }
}
