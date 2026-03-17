import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/services/users'
import { getPublishedInstructions } from '@/services/instructions'
import { Navbar } from '@/components/Navbar'
import type { Instruction } from '@/services/instructions'

// Role hierarchy order — used to decide which tabs to show
const ROLE_ORDER = ['trainee', 'trainer', 'reviewer', 'auditor', 'admin'] as const
type UserRole = typeof ROLE_ORDER[number]

const ROLE_LABELS: Record<string, string> = {
  trainee:  'General',
  trainer:  'Trainer',
  reviewer: 'Reviewer',
  auditor:  'Auditor',
  admin:    'Admin',
}

function roleRank(role: string): number {
  return ROLE_ORDER.indexOf(role as UserRole)
}

export default async function InstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    redirect('/auth/sign-in')
  }

  const instructions = await getPublishedInstructions()

  // Collect which target_roles actually have docs visible to this user
  const visibleRoles = Array.from(
    new Set(instructions.map((i) => i.target_role))
  ).sort((a, b) => roleRank(a) - roleRank(b))

  const { tab } = await searchParams
  const activeTab: string = tab && visibleRoles.includes(tab as UserRole)
    ? tab
    : visibleRoles[0] ?? ''

  const activeInstructions: Instruction[] = instructions.filter(
    (i) => i.target_role === activeTab
  )

  const userRank = roleRank(user.role)

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Instructions</h1>
          <p className="mt-1 text-secondary text-sm">
            Guidelines and documentation for your role.
          </p>
        </div>

        {visibleRoles.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
            <p className="text-secondary">No instructions have been published yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Role tabs */}
            <div className="flex gap-2 flex-wrap">
              {visibleRoles.map((role) => {
                const isActive = role === activeTab
                return (
                  <a
                    key={role}
                    href={`/instructions?tab=${role}`}
                    className={`rounded-full border px-5 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-500/20 border-orange-400/60 text-orange-300'
                        : 'border-white/20 text-white/50 hover:bg-white/5 hover:text-white/80 hover:border-white/30'
                    }`}
                  >
                    {ROLE_LABELS[role] ?? role}
                    {roleRank(role) > userRank && (
                      <span className="ml-1.5 text-xs opacity-60">(reference)</span>
                    )}
                  </a>
                )
              })}
            </div>

            {/* Docs list */}
            {activeInstructions.length === 0 ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
                <p className="text-secondary text-sm">No published documents in this section yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeInstructions.map((doc) => (
                  <article
                    key={doc.instruction_id}
                    className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8"
                  >
                    <h2 className="text-lg font-semibold mb-4">{doc.title}</h2>
                    <div className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                      {doc.content}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
