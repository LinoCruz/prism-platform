'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { submitRoleChange } from './actions'

const AVAILABLE_ROLES = ['trainee', 'trainer', 'reviewer', 'auditor', 'admin'] as const

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-green-500/10 text-green-400',
  onboarding: 'bg-amber-500/10 text-amber-400',
  suspended:  'bg-red-500/10 text-red-400',
}

export type RosterUser = {
  user_id: string
  name: string
  email: string
  status: string
  role: string
}

export function PersonnelRosterPanel({ users, currentUserId }: { users: RosterUser[]; currentUserId: string }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(userId: string, role: string) {
    setPendingKey(userId)

    startTransition(async () => {
      const fd = new FormData()
      fd.set('userId', userId)
      fd.set('role', role)

      try {
        await submitRoleChange(fd)
        toast.success(`Role changed to "${role}".`)
      } catch {
        toast.error(`Failed to change role to "${role}".`)
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Personnel Roster</h2>
        <p className="text-sm text-muted mb-6">Assign roles across the platform.</p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-sm text-secondary">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {users.map(u => {
            const isSelf = u.user_id === currentUserId
            const busy = isPending && pendingKey === u.user_id
            return (
              <tr key={u.user_id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="py-4 font-medium text-primary">
                  {u.name}
                  {isSelf && <span className="ml-2 text-[10px] text-muted font-normal">(you)</span>}
                </td>
                <td className="py-4 text-muted">{u.email}</td>
                <td className="py-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[u.status] ?? 'bg-secondary/10 text-secondary'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {busy && <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-secondary" />}
                    <select
                      value={u.role}
                      disabled={isSelf || busy}
                      onChange={e => handleRoleChange(u.user_id, e.target.value)}
                      title={isSelf ? 'Admins cannot change their own role' : undefined}
                      className="rounded border border-border bg-surface px-2 py-1 text-xs font-mono text-primary focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {AVAILABLE_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
