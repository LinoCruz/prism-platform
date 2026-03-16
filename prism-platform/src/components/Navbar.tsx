import Link from 'next/link'
import Logo from './Logo'
import { getCurrentUserRoles } from '@/services/users'
import { signOut } from '@/app/tasks/actions' // Reuse the signout from tasks or create a global one

export async function Navbar() {
  let isAdmin = false
  try {
    const roles = await getCurrentUserRoles()
    isAdmin = roles.includes('admin')
  } catch (err) {
    // Not authenticated
  }

  return (
    <header className="relative z-10 pt-4 pb-4 border-b border-border/10 mb-8">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/tasks" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-secondary">
            <Link href="/tasks" className="hover:text-primary transition-colors">Available Tasks</Link>
            <Link href="/my-tasks" className="hover:text-primary transition-colors">My Tasks</Link>
            <Link href="/reviews" className="hover:text-primary transition-colors">Reviews</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link 
              href="/admin" 
              className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 text-sm font-medium transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
            >
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-sm text-secondary hover:text-foreground hover:bg-surface-hover hover:border-accent/30 transition-all"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
