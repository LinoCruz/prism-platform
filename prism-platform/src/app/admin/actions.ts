'use server'

import { revalidatePath } from 'next/cache'
import { updateUserRole, uploadTaskDataset } from '@/services/admin'
import type { Database } from '@/types/database.types'

type Role = Database['public']['Enums']['user_role']

export async function submitRoleChange(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as Role
  const action = formData.get('action') as 'add' | 'remove'

  if (!userId || !role || !action) return

  await updateUserRole(userId, role, action === 'remove')
  revalidatePath('/admin')
}

export async function submitDataset(formData: FormData) {
  const file = formData.get('dataset') as File
  if (!file) return

  const text = await file.text()
  
  try {
    // Parse json
    const json = JSON.parse(text)
    if (!Array.isArray(json)) throw new Error('Dataset must be an array of objects')
    
    // Map to expected type
    const formatted = json.map((item: any) => ({
      external_id: item.task_id?.toString() || item.id?.toString() || item.external_id?.toString(),
      question: item.question?.toString() || item.text?.toString()
    })).filter(i => i.external_id && i.question)

    if (formatted.length > 0) {
      await uploadTaskDataset(formatted)
    }
  } catch (error) {
    console.error('Failed to parse or upload dataset', error)
  }

  revalidatePath('/admin')
}
