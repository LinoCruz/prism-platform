import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import type { MediaItem } from '@/types/media'

export type Instruction = Tables<'instructions'>
export type { MediaItem }

/** Returns all published instructions the current user is allowed to see (up to their role level). */
export async function getPublishedInstructions(): Promise<Instruction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instructions')
    .select('*')
    .eq('published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getInstruction(instructionId: string): Promise<Instruction | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instructions')
    .select('*')
    .eq('instruction_id', instructionId)
    .eq('published', true)
    .single()
  if (error) return null
  return data
}

/** Admin: returns ALL instructions regardless of published state. */
export async function getAllInstructions(): Promise<Instruction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instructions')
    .select('*')
    .order('target_role', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createInstruction(payload: {
  title: string
  content: string
  target_role: Instruction['target_role']
  display_order?: number
  media?: MediaItem[]
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('instructions')
    .insert({ ...payload, created_by: user.id })
  if (error) throw error
}

export async function updateInstruction(
  instructionId: string,
  payload: Partial<Pick<Instruction, 'title' | 'content' | 'target_role' | 'display_order' | 'published'>> & { media?: MediaItem[] }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('instructions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('instruction_id', instructionId)
  if (error) throw error
}

export async function deleteInstruction(instructionId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('instructions')
    .delete()
    .eq('instruction_id', instructionId)
  if (error) throw error
}
