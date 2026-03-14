import { getAvailableTasks } from '@/services/tasks'
import { claimTask } from './actions'

export default async function TasksPage() {
  const tasks = await getAvailableTasks()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Available Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-zinc-500">No tasks available right now.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {tasks.map((task) => (
            <li key={task.task_id} className="rounded-lg border p-5">
              <p className="font-mono text-sm text-zinc-500">{task.external_id ?? task.task_id}</p>
              <p className="mt-1 text-sm capitalize text-zinc-700">{task.status}</p>
              <form action={claimTask} className="mt-4">
                <input type="hidden" name="taskId" value={task.task_id} />
                <button
                  type="submit"
                  className="rounded-full bg-black px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
                >
                  Claim
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
