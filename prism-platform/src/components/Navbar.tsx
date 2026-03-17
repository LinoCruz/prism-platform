import Link from 'next/link'
import Logo from './Logo'
import { getCurrentUser } from '@/services/users'
import { UserMenu } from './UserMenu'

const ROLE_RANK: Record<string, number> = {
  trainee: 1, trainer: 2, reviewer: 3, auditor: 4, admin: 5,
}

function atLeast(userRole: string, required: string): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[required] ?? 0)
}

export async function Navbar() {
  let role = 'trainee'
  let displayName = ''
  let firstName: string | null = null
  let lastName: string | null = null
  let personalEmail: string | null = null
  try {
    const user = await getCurrentUser()
    role = user.role
    displayName = user.display_name
    firstName = user.first_name
    lastName = user.last_name
    personalEmail = user.personal_email
  } catch {
    // Not authenticated
  }

  const isReviewer = atLeast(role, 'reviewer')
  const isAuditor  = atLeast(role, 'auditor')
  const isAdmin    = atLeast(role, 'admin')

  return (
    <header className="relative z-30 pt-4 pb-4 border-b border-border/10 mb-8">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/tasks" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-secondary">
            <Link href="/tasks" className="hover:text-primary transition-colors">Available Tasks</Link>
            <Link href="/my-tasks" className="hover:text-primary transition-colors">My Tasks</Link>
            <Link href="/instructions" className="hover:text-primary transition-colors">Instructions</Link>
            {isReviewer && (
              <Link href="/reviews" className="hover:text-primary transition-colors">Review Queue</Link>
            )}
            {isAuditor && (
              <Link href="/audits" className="hover:text-primary transition-colors">Audit Queue</Link>
            )}
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
          <UserMenu displayName={displayName} firstName={firstName} lastName={lastName} personalEmail={personalEmail} />
        </div>
      </div>
    </header>
  )
}
