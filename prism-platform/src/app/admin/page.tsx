import { getCurrentUserRoles } from '@/services/users'
import { getCurrentUser } from '@/services/users'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { AdminShell } from './AdminShell'

export default async function AdminDashboard() {
  const currentRoles = await getCurrentUserRoles()
  if (!currentRoles.includes('admin')) {
    redirect('/tasks')
  }

  const user = await getCurrentUser()

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />

      <header className="relative z-10 pt-4 border-b border-border/20">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between pb-4">
          <Link href="/tasks" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size="sm" />
            <span className="text-secondary text-sm font-medium ml-4">&larr; Back to Tasks</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-secondary">Manage personnel roles and task datasets.</p>
        </div>

        <AdminShell name={user.name ?? 'Admin'} />
      </main>
    </div>
  )
}
