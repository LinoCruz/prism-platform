import { getMyTasks } from '@/services/tasks'
import { Navbar } from '@/components/Navbar'
import { PrismStripes } from '@/components/PrismStripes'

const STATUS_BADGE: Record<string, string> = {
  claimed:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed:       'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  in_review:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sent_for_rework: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  fixed:           'bg-teal-500/20 text-teal-300 border-teal-500/30',
  approved:        'bg-green-500/20 text-green-300 border-green-500/30',
  auditing:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
  reviewer_fixing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  signed_off:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  canceled:        'bg-red-500/20 text-red-300 border-red-500/30',
}

function formatTaskTime(claimedAt: string, submittedAt: string | null): string {
  if (!submittedAt) return '—'
  const ms = new Date(submittedAt).getTime() - new Date(claimedAt).getTime()
  if (ms <= 0) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default async function MyTasksPage() {
  const attempts = await getMyTasks()

  return (
    <div className="min-h-screen relative overflow-hidden film-grain bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">My Tasks</h1>
          <p className="mt-2 text-sm text-secondary">Tasks you have completed.</p>
        </div>

        {attempts.length === 0 ? (
          <div className="slide-card relative overflow-hidden rounded-2xl bg-surface border border-border flex flex-col pt-1.5">
            <div className="slide-card-grain" />
            <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />
            <div className="relative z-10 flex-1 p-10 flex flex-col items-center justify-center gap-3">
              <span className="text-4xl">📋</span>
              <p className="text-muted">No completed tasks yet. Head to Available Tasks to get started.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-x-auto bg-surface">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-black/30 text-xs text-foreground/70 uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Task ID</th>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Task Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {attempts.map((attempt) => {
                  const task = attempt.tasks as { task_id: string; external_id: string | null; status: string; question: string | null } | null
                  const displayId = task?.external_id ?? attempt.task_id
                  const status = task?.status ?? '—'
                  const badgeClass = STATUS_BADGE[status] ?? 'bg-border/20 text-muted border-border/30'

                  return (
                    <tr key={attempt.attempt_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-accent bg-accent/15 px-1.5 py-0.5 rounded brightness-150">{displayId}</span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <span className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                          {task?.question ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${badgeClass}`}>
                          {status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70 tabular-nums whitespace-nowrap">
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70 tabular-nums whitespace-nowrap">
                        {formatTaskTime(attempt.claimed_at, attempt.submitted_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
