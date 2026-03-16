import Link from 'next/link'
import { getTasksForReview } from '@/services/tasks'
import { startReview } from './actions'
import { Navbar } from '@/components/Navbar'

export default async function ReviewsPage() {
  const tasks = await getTasksForReview()

  return (
    <div className="min-h-screen bg-background text-foreground film-grain">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-4">
        <h1 className="mb-8 text-2xl font-semibold">Review Queue</h1>
        {tasks.length === 0 ? (
          <p className="text-zinc-500">No tasks awaiting review.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {tasks.map((task) => (
              <li key={task.task_id} className="rounded-lg border p-5">
                <Link
                  href={`/reviews/${task.task_id}`}
                  className="font-mono text-sm text-zinc-500 hover:underline"
                >
                  {task.external_id ?? task.task_id}
                </Link>
                <p className="mt-1 text-sm text-zinc-700">
                  {task.task_attempts.length} attempt(s)
                </p>
                <form action={startReview} className="mt-4">
                  <input type="hidden" name="taskId" value={task.task_id} />
                  <input type="hidden" name="versionId" value={task.current_version_id ?? ''} />
                  <button
                    type="submit"
                    className="rounded-full bg-black px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
                  >
                    Start Review
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
