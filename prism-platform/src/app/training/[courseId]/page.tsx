import { getCourseWithModules } from '@/services/training'
import { startQuizAttempt } from '../actions'

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string }
}) {
  const course = await getCourseWithModules(params.courseId)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{course.title}</h1>
      {course.description && (
        <p className="mt-2 text-zinc-500">{course.description}</p>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Modules
        </h2>
        <ol className="flex flex-col gap-3">
          {course.course_modules
            .sort((a, b) => a.module_order - b.module_order)
            .map((mod) => (
              <li key={mod.module_id} className="rounded-lg border p-4">
                <p className="font-medium">{mod.title}</p>
                {mod.video_url && (
                  <a
                    href={mod.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:underline"
                  >
                    Watch video
                  </a>
                )}
              </li>
            ))}
        </ol>
      </section>

      {course.quizzes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Quiz
          </h2>
          {course.quizzes.map((quiz) => (
            <div key={quiz.quiz_id} className="rounded-lg border p-5">
              <p className="text-sm text-zinc-500">
                {quiz.quiz_questions.length} question(s)
              </p>
              <form action={startQuizAttempt} className="mt-4">
                <input type="hidden" name="quizId" value={quiz.quiz_id} />
                <button
                  type="submit"
                  className="rounded-full bg-black px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
                >
                  Start Quiz
                </button>
              </form>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
