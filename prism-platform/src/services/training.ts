import { createClient } from '@/lib/supabase/server'

export async function getCourses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
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
