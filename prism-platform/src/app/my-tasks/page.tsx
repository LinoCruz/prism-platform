import Link from 'next/link'
import { getMyTasks } from '@/services/tasks'

export default async function MyTasksPage() {
  const attempts = await getMyTasks()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">My Tasks</h1>
      {attempts.length === 0 ? (
        <p className="text-zinc-500">You have not claimed any tasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {attempts.map((attempt) => (
            <li key={attempt.attempt_id} className="rounded-lg border p-5">
              <Link
                href={`/tasks/${attempt.task_id}`}
                className="font-mono text-sm text-zinc-500 hover:underline"
              >
                {attempt.tasks?.external_id ?? attempt.task_id}
              </Link>
              <p className="mt-1 text-sm capitalize text-zinc-700">
                {attempt.tasks?.status}
                {' · '}attempt #{attempt.attempt_number}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {attempt.submitted_at ? `Submitted ${new Date(attempt.submitted_at).toLocaleDateString()}` : 'In progress'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
