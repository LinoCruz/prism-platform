import { getTaskById } from '@/services/tasks'
import { submitTask } from '../actions'

export default async function TaskDetailPage({
  params,
}: {
  params: { taskId: string }
}) {
  const task = await getTaskById(params.taskId)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-sm text-zinc-500">{task.external_id ?? task.task_id}</p>
      <h1 className="mt-1 text-2xl font-semibold capitalize">{task.status}</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Versions ({task.task_versions.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {task.task_versions.map((v) => (
            <li key={v.version_id} className="rounded-lg border p-4 text-sm">
              <span className="font-medium">v{v.version_number}</span>
              <span className="ml-3 text-zinc-500">{v.source}</span>
            </li>
          ))}
        </ul>
      </section>

      {task.status === 'claimed' && task.current_version_id && (
        <form action={submitTask} className="mt-8">
          <input type="hidden" name="taskId" value={task.task_id} />
          <input type="hidden" name="versionId" value={task.current_version_id} />
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Submit for Review
          </button>
        </form>
      )}
    </main>
  )
}
