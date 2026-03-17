'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { submitRoleChange, submitStatusChange } from './actions'

const AVAILABLE_ROLES   = ['trainee', 'trainer', 'reviewer', 'auditor', 'admin'] as const
const AVAILABLE_STATUSES = ['onboarding', 'pending_entry_quiz', 'training', 'active', 'disabled'] as const

const STATUS_TEXT_COLOR: Record<string, string> = {
  onboarding:        'text-amber-400',
  pending_entry_quiz:'text-purple-400',
  training:          'text-blue-400',
  active:            'text-green-400',
  inactive:          'text-slate-400',
  disabled:          'text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  onboarding:        'onboarding',
  pending_entry_quiz:'pending entry quiz',
  training:          'training',
  active:            'active',
  inactive:          'inactive',
  disabled:          'disabled',
}

export type RosterUser = {
  user_id:        string
  display_name:   string
  first_name:     string | null
  last_name:      string | null
  email:          string
  personal_email: string | null
  status:         string
  role:           string
  last_login_at:  string | null
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function getEffectiveStatus(user: RosterUser): string {
  if (user.status === 'disabled') return 'disabled'
  if (user.last_login_at && (Date.now() - new Date(user.last_login_at).getTime() > THREE_DAYS_MS)) {
    return 'inactive'
  }
  return user.status
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1)  return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30)    return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function PersonnelRosterPanel({ users, currentUserId }: { users: RosterUser[]; currentUserId: string }) {
  const [pendingRoleKey,   setPendingRoleKey]   = useState<string | null>(null)
  const [pendingStatusKey, setPendingStatusKey] = useState<string | null>(null)
  const [isPendingRole,    startRoleTransition]   = useTransition()
  const [isPendingStatus,  startStatusTransition] = useTransition()

  function handleRoleChange(userId: string, role: string) {
    setPendingRoleKey(userId)
    startRoleTransition(async () => {
      const fd = new FormData()
      fd.set('userId', userId)
      fd.set('role', role)
      try {
        await submitRoleChange(fd)
        toast.success(`Role changed to "${role}".`)
      } catch {
        toast.error(`Failed to change role to "${role}".`)
      } finally {
        setPendingRoleKey(null)
      }
    })
  }

  function handleStatusChange(userId: string, status: string) {
    setPendingStatusKey(userId)
    startStatusTransition(async () => {
      const fd = new FormData()
      fd.set('userId', userId)
      fd.set('status', status)
      try {
        await submitStatusChange(fd)
        toast.success(`Status changed to "${STATUS_LABELS[status] ?? status}".`)
      } catch {
        toast.error(`Failed to change status.`)
      } finally {
        setPendingStatusKey(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Personnel Roster</h2>
        <p className="text-sm text-muted mb-6">Manage user statuses and roles across the platform.</p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-sm text-secondary">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Work Email</th>
            <th className="pb-3 font-medium">Personal Email</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Last Connection</th>
            <th className="pb-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {users.map(u => {
            const isSelf       = u.user_id === currentUserId
            const busyRole     = isPendingRole   && pendingRoleKey   === u.user_id
            const busyStatus   = isPendingStatus && pendingStatusKey === u.user_id
            const effectiveStatus = getEffectiveStatus(u)
            const isInactive   = effectiveStatus === 'inactive'

            return (
              <tr key={u.user_id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="py-4 font-medium text-primary">
                  {u.display_name}
                  {isSelf && <span className="ml-2 text-[10px] text-muted font-normal">(you)</span>}
                </td>
                <td className="py-4 text-muted">{u.email}</td>
                <td className="py-4 text-muted">{u.personal_email ?? <span className="text-secondary/40 italic">not set</span>}</td>

                {/* Status dropdown — text colour reflects effective status */}
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {busyStatus && (
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-secondary" />
                    )}
                    <select
                      value={u.status}
                      disabled={isSelf || busyStatus}
                      onChange={e => handleStatusChange(u.user_id, e.target.value)}
                      title={isSelf ? 'Admins cannot change their own status' : isInactive ? `Inactive (base: ${STATUS_LABELS[u.status] ?? u.status})` : undefined}
                      className={`rounded border border-border bg-surface px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${STATUS_TEXT_COLOR[effectiveStatus] ?? 'text-primary'}`}
                    >
                      {AVAILABLE_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Last Connection */}
                <td className="py-4 text-muted tabular-nums">
                  {formatTimeAgo(u.last_login_at)}
                </td>

                {/* Role */}
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {busyRole && (
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-secondary" />
                    )}
                    <select
                      value={u.role}
                      disabled={isSelf || busyRole}
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
