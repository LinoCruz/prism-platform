'use server'

import { revalidatePath } from 'next/cache'
import { updateUserRole, uploadTaskDataset } from '@/services/admin'
import { createInstruction, updateInstruction, deleteInstruction } from '@/services/instructions'
import type { Database } from '@/types/database.types'

type Role = Database['public']['Enums']['user_role']

export async function submitRoleChange(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as Role

  if (!userId || !role) return

  await updateUserRole(userId, role)
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

export async function submitCreateInstruction(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target_role = formData.get('target_role') as Role
  const display_order = parseInt(formData.get('display_order') as string) || 0

  if (!title || !content || !target_role) return

  await createInstruction({ title, content, target_role, display_order })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitUpdateInstruction(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target_role = formData.get('target_role') as Role
  const display_order = parseInt(formData.get('display_order') as string) || 0
  const published = formData.get('published') === 'true'

  if (!instructionId) return

  await updateInstruction(instructionId, { title, content, target_role, display_order, published })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitDeleteInstruction(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  if (!instructionId) return

  await deleteInstruction(instructionId)
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitTogglePublished(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  const published = formData.get('published') === 'true'
  if (!instructionId) return

  await updateInstruction(instructionId, { published })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}
