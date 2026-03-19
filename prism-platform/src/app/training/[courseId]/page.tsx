import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/services/users'
import { getCourseWithModules } from '@/services/training'
import { Navbar } from '@/components/Navbar'
import { startQuizAttempt } from '../actions'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  try {
    await getCurrentUser()
  } catch {
    redirect('/auth/sign-in')
  }

  const { courseId } = await params
  let course
  try {
    course = await getCourseWithModules(courseId)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/instructions"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Courses &amp; Instructions
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          {course.description && (
            <p className="mt-2 text-secondary text-sm">{course.description}</p>
          )}
        </div>

        {/* Modules */}
        {course.course_modules.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-medium uppercase tracking-widest text-secondary mb-4">Modules</h2>
            <ol className="flex flex-col gap-3">
              {[...course.course_modules]
                .sort((a, b) => a.module_order - b.module_order)
                .map((mod, idx) => (
                  <li
                    key={mod.module_id}
                    className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-start gap-4"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-secondary font-medium mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{mod.title}</p>
                      {mod.video_url && (
                        <a
                          href={mod.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          Watch video →
                        </a>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        )}

        {/* Quiz */}
        {course.quizzes.length > 0 && (
          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-secondary mb-4">Quiz</h2>
            {course.quizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 flex items-center justify-between gap-4"
              >
                <p className="text-sm text-secondary">
                  {quiz.quiz_questions.length} question{quiz.quiz_questions.length !== 1 ? 's' : ''}
                </p>
                <form action={startQuizAttempt}>
                  <input type="hidden" name="quizId" value={quiz.quiz_id} />
                  <button
                    type="submit"
                    className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-5 py-1.5 text-sm font-medium transition-all"
                  >
                    Start Quiz
                  </button>
                </form>
              </div>
            ))}
          </section>
        )}

        {course.course_modules.length === 0 && course.quizzes.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <p className="text-secondary text-sm">No content added to this course yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
