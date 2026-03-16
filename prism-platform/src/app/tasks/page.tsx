import { getAvailableTasks } from '@/services/tasks'
import { getCurrentUserRoles } from '@/services/users'
import { claimTask, signOut } from './actions'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import { PrismStripes } from '@/components/PrismStripes'
import { Navbar } from '@/components/Navbar'
import Link from 'next/link'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.user_metadata?.full_name ?? user?.email ?? 'there'

  const tasks = await getAvailableTasks()
  const roles = await getCurrentUserRoles()
  const isAdmin = roles.includes('admin')

  return (
    <div className="min-h-screen relative overflow-hidden film-grain bg-background text-foreground">
      {/* Cinematic ambient glow */}
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />

      {/* Header */}
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Available Tasks</h1>
          <p className="mt-2 text-sm text-secondary">
            Hello <span className="text-primary font-medium">{name}</span>, your call sheet is ready.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="slide-card relative overflow-hidden rounded-2xl bg-surface border border-border flex flex-col pt-1.5">
            <div className="slide-card-grain" />
            
            {/* Rainbow stripes going horizontally across the top */}
            <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />

            <div className="relative z-10 flex-1 p-10 flex flex-col items-center justify-center gap-3">
              <span className="text-4xl">🎬</span>
              <p className="text-muted">No tasks available right now. Stand by for the next scene.</p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <li key={task.task_id} className="group relative slide-card overflow-hidden rounded-2xl bg-surface border border-transparent hover:border-accent/40 transition-all duration-300 flex flex-col pt-1.5">
                <div className="slide-card-grain" />
                
                {/* Rainbow stripes going horizontally across the top */}
                <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10 p-6 flex-1 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center rounded bg-surface-hover px-2 py-1 text-[10px] uppercase font-mono tracking-widest text-secondary border border-border">
                        {task.status}
                      </span>
                    </div>
                    
                    <p className="font-mono text-xs text-muted mb-1 break-all">
                      ID: {task.external_id ?? task.task_id.split('-')[0]}
                    </p>
                    <h3 className="text-lg font-medium text-primary">Task Item</h3>
                  </div>

                  <form action={claimTask} className="mt-8">
                    <input type="hidden" name="taskId" value={task.task_id} />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-hover border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(52,67,218,0.15)]"
                    >
                      Claim Task &rarr;
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
