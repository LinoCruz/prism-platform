import { getAvailableTasks, getReworkTasks, getInProgressTasks } from '@/services/tasks'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TasksListClient } from './TasksListClient'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.user_metadata?.full_name ?? user?.email ?? 'there'

  const [tasks, reworkTasks, inProgressTasks] = await Promise.all([
    getAvailableTasks(),
    getReworkTasks(),
    getInProgressTasks(),
  ])

  return (
    <div className="min-h-screen relative overflow-hidden film-grain bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-4">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Available Tasks</h1>
          <p className="mt-2 text-sm text-secondary">
            Hello <span className="text-primary font-medium">{name}</span>, your call sheet is ready.
          </p>
        </div>

        <TasksListClient initialTasks={tasks} initialReworkTasks={reworkTasks} initialInProgressTasks={inProgressTasks} />
      </main>
    </div>
  )
}
