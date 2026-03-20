import { getTasksForReview } from '@/services/tasks'
import { Navbar } from '@/components/Navbar'
import { StartReviewModal } from './StartReviewModal'

export default async function ReviewsPage() {
  const tasks = await getTasksForReview()

  return (
    <div className="min-h-screen relative overflow-hidden film-grain bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-4">
        <h1 className="mb-8 text-2xl font-semibold">Review Queue</h1>
        {tasks.length === 0 ? (
          <p className="text-zinc-500">No tasks awaiting review.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {tasks.map((task) => (
              <li key={task.task_id} className="rounded-lg border bg-black p-5">
                <p className="font-mono text-sm text-zinc-400">
                  {task.external_id ?? task.task_id}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {task.task_attempts.length} attempt(s)
                </p>
                <div className="mt-4">
                  <StartReviewModal
                    taskId={task.task_id}
                    versionId={task.current_version_id ?? ''}
                    externalId={task.external_id ?? task.task_id}
                    attemptCount={task.task_attempts.length}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
