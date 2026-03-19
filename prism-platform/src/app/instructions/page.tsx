import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/services/users'
import { getPublishedInstructions } from '@/services/instructions'
import { getCoursesByRole } from '@/services/training'
import { Navbar } from '@/components/Navbar'
import type { Instruction } from '@/services/instructions'

const GENERAL_ROLE = 'trainee'

const ROLE_LABELS: Record<string, string> = {
  trainee:  'General',
  trainer:  'Trainer',
  reviewer: 'Reviewer',
  auditor:  'Auditor',
  admin:    'Admin',
}

export default async function InstructionsPage() {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    redirect('/auth/sign-in')
  }

  const [allInstructions, roleCourses, generalCourses] = await Promise.all([
    getPublishedInstructions(),
    getCoursesByRole(user.role),
    user.role !== GENERAL_ROLE ? getCoursesByRole(GENERAL_ROLE) : Promise.resolve([]),
  ])

  // Merge courses: general first, then role-specific, deduped by course_id
  const seenIds = new Set<string>()
  const courses = [...generalCourses, ...roleCourses].filter((c) => {
    if (seenIds.has(c.course_id)) return false
    seenIds.add(c.course_id)
    return true
  })

  // Instructions relevant to this user: general + role-specific
  const instructions: Instruction[] = allInstructions.filter(
    (i) => i.target_role === GENERAL_ROLE || i.target_role === user.role
  )

  const generalInstructions = instructions.filter((i) => i.target_role === GENERAL_ROLE)
  const roleInstructions    = instructions.filter((i) => i.target_role === user.role && user.role !== GENERAL_ROLE)

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Courses &amp; Instructions</h1>
          <p className="mt-1 text-secondary text-sm">
            Training resources and guidelines for your role.
          </p>
        </div>

        {/* ── Instructions ── */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          {instructions.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
              <p className="text-secondary text-sm">No instructions published yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {generalInstructions.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-secondary mb-3">General</h3>
                  <div className="flex flex-col gap-3">
                    {generalInstructions.map((doc) => (
                      <InstructionCard key={doc.instruction_id} doc={doc} />
                    ))}
                  </div>
                </div>
              )}
              {roleInstructions.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-secondary mb-3">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {roleInstructions.map((doc) => (
                      <InstructionCard key={doc.instruction_id} doc={doc} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Courses ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Courses</h2>
          {courses.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
              <p className="text-secondary text-sm">No courses assigned to your role yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Link
                  key={course.course_id}
                  href={`/training/${course.course_id}`}
                  className="group flex flex-col rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold leading-snug group-hover:text-white transition-colors">
                      {course.title}
                    </h3>
                    {'mandatory' in course && course.mandatory && (
                      <span className="shrink-0 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs px-2 py-0.5">
                        Required
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-secondary text-xs leading-relaxed line-clamp-3 flex-1">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors">
                    <span>Start course</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function InstructionCard({ doc }: { doc: Instruction }) {
  return (
    <Link
      href={`/instructions/${doc.instruction_id}`}
      className="group flex items-center justify-between rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-6 py-5 hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div>
        <p className="text-sm font-semibold group-hover:text-white transition-colors">{doc.title}</p>
      </div>
      <svg
        className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0 ml-4"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
