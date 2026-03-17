'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { signOut, updateUserProfile } from '@/app/tasks/actions'

interface UserMenuProps {
  displayName: string
  firstName: string | null
  lastName: string | null
  personalEmail: string | null
}

export function UserMenu({ displayName, firstName, lastName, personalEmail }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openEditModal() {
    setOpen(false)
    setError('')
    setModalOpen(true)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateUserProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setModalOpen(false)
        window.location.reload()
      }
    })
  }

  return (
    <>
      {/* Dropdown trigger */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-secondary hover:text-foreground hover:bg-surface-hover hover:border-accent/30 transition-all"
        >
          <span className="hidden sm:inline">{displayName}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60">
              <p className="text-xs text-secondary">Signed in as</p>
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            </div>
            <button
              onClick={openEditModal}
              className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              My account
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-surface-hover transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Edit account modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface shadow-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">My account</h2>
            <p className="text-sm text-secondary mb-5">Update your profile information.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">
                    First name
                  </label>
                  <input
                    name="firstName"
                    defaultValue={firstName ?? ''}
                    required
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="First"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">
                    Last name
                  </label>
                  <input
                    name="lastName"
                    defaultValue={lastName ?? ''}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="Last"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">
                  Personal email
                </label>
                <input
                  name="personalEmail"
                  type="email"
                  defaultValue={personalEmail ?? ''}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder="you@example.com"
                />
                <p className="text-xs text-secondary/70">
                  This should be the same email you use for Hubstaff.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-secondary hover:text-foreground hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-all"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
