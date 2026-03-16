'use client'

import { useState, useEffect } from 'react'
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
  roles: string[]
}

export function PersonnelRosterPanel({ users }: { users: RosterUser[] }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (!openDropdown) return
    function close() { setOpenDropdown(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openDropdown])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Personnel Roster</h2>
        <p className="text-sm text-muted mb-6">Assign or revoke system roles across the platform.</p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-sm text-secondary">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Roles</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {users.map(u => (
            <tr key={u.user_id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
              <td className="py-4 font-medium text-primary">{u.name}</td>
              <td className="py-4 text-muted">{u.email}</td>
              <td className="py-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[u.status] ?? 'bg-secondary/10 text-secondary'}`}>
                  {u.status}
                </span>
              </td>
              <td className="py-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {u.roles.map(r => (
                    <form action={submitRoleChange} key={r} className="inline m-0">
                      <input type="hidden" name="userId" value={u.user_id} />
                      <input type="hidden" name="role" value={r} />
                      <input type="hidden" name="action" value="remove" />
                      <button type="submit" title={`Remove ${r}`} className="inline-flex items-center gap-1 rounded bg-secondary/10 px-2 py-1 text-xs font-mono tracking-wide text-primary hover:bg-red-500/20 hover:text-red-400 transition-colors border border-border">
                        {r} &times;
                      </button>
                    </form>
                  ))}
                  <div className="relative inline-block">
                    <span
                      onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === u.user_id ? null : u.user_id) }}
                      className="inline-flex items-center justify-center rounded border border-dashed border-border px-2 py-1 text-xs cursor-pointer hover:bg-surface-hover hover:border-accent text-muted transition-all select-none"
                    >
                      + Add
                    </span>
                    {openDropdown === u.user_id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1 flex flex-col bg-surface border border-border rounded-lg shadow-xl z-[100] min-w-[120px] overflow-hidden"
                      >
                        {AVAILABLE_ROLES.filter(ar => !u.roles.includes(ar)).map(ar => (
                          <form action={submitRoleChange} key={ar} className="m-0 border-b border-border/50 last:border-0">
                            <input type="hidden" name="userId" value={u.user_id} />
                            <input type="hidden" name="role" value={ar} />
                            <input type="hidden" name="action" value="add" />
                            <button type="submit" className="w-full text-left px-4 py-2 text-xs font-mono text-secondary hover:text-primary hover:bg-surface-hover transition-colors">
                              {ar}
                            </button>
                          </form>
                        ))}
                        {AVAILABLE_ROLES.filter(ar => !u.roles.includes(ar)).length === 0 && (
                          <div className="px-4 py-2 text-xs text-muted">All roles assigned</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
