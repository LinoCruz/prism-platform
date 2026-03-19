import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export async function getCourses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getCoursesByRole(role: Database['public']['Enums']['user_role']) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_requirements')
    .select('courses(*), mandatory')
    .eq('role_required', role)
  if (error) throw error
  return data
    .filter((r) => r.courses !== null)
    .map((r) => ({ ...(r.courses as NonNullable<typeof r.courses>), mandatory: r.mandatory }))
}

export async function getCourseWithModules(courseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*, course_modules(*), quizzes(*, quiz_questions(*, quiz_options(*)))')
    .eq('course_id', courseId)
    .order('module_order', { referencedTable: 'course_modules', ascending: true })
    .single()
  if (error) throw error
  return data
}

export async function startQuizAttempt(quizId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeQuizAttempt(
  attemptId: string,
  score: number,
  passed: boolean,
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_attempts')
    .update({ score, passed, completed_at: new Date().toISOString() })
    .eq('attempt_id', attemptId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyRequirements() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_requirements')
    .select('*, training_requirements(*, courses(*))')
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllCourses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*, training_requirements(requirement_id, role_required, mandatory), course_modules(*)')
    .order('created_at', { ascending: false })
    .order('module_order', { referencedTable: 'course_modules', ascending: true })
  if (error) throw error
  return data
}

export async function createCourse(payload: { title: string; description?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCourse(courseId: string, payload: { title?: string; description?: string }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('courses')
    .update(payload)
    .eq('course_id', courseId)
  if (error) throw error
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('course_id', courseId)
  if (error) throw error
}

export async function addTrainingRequirement(payload: { course_id: string; role_required: Database['public']['Enums']['user_role']; mandatory: boolean }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('training_requirements')
    .insert(payload)
  if (error) throw error
}

export async function getModulesByCourse(courseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('module_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createModule(payload: { course_id: string; title: string; video_url?: string; module_order: number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('course_modules').insert(payload)
  if (error) throw error
}

export async function updateModule(moduleId: string, payload: { title?: string; video_url?: string | null; module_order?: number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('course_modules').update(payload).eq('module_id', moduleId)
  if (error) throw error
}

export async function deleteModule(moduleId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('course_modules').delete().eq('module_id', moduleId)
  if (error) throw error
}

export async function removeTrainingRequirement(requirementId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('training_requirements')
    .delete()
    .eq('requirement_id', requirementId)
  if (error) throw error
}

export async function getMyQuizAttempts(quizId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  if (quizId) {
    query = query.eq('quiz_id', quizId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}
