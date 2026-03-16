'use client'

import { useState } from 'react'
import { PersonnelRosterPanel, type RosterUser } from './PersonnelRosterPanel'
import { DatasetUploader } from './DatasetUploader'

type Panel = 'home' | 'roster' | 'dataset' | 'placeholder1' | 'placeholder2' | 'placeholder3'

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: 'roster',       label: 'Personnel Roster'   },
  { id: 'dataset',      label: 'Dataset Deployment' },
  { id: 'placeholder1', label: 'Placeholder 1'      },
  { id: 'placeholder2', label: 'Placeholder 2'      },
  { id: 'placeholder3', label: 'Placeholder 3'      },
]

const BTN_BASE   = 'border-white/20 text-white/50 hover:bg-orange-500/10 hover:text-orange-300 hover:border-orange-400/30'
const BTN_ACTIVE = 'bg-orange-500/20 border-orange-400/60 text-orange-300'

export function AdminShell({ name, roster }: { name: string; roster: RosterUser[] }) {
  const [active, setActive] = useState<Panel>('home')

  return (
    <div className="flex gap-8 min-h-[60vh]">
      {/* Sidebar */}
      <aside className="flex flex-col gap-2 w-52 shrink-0 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner self-start">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium text-left transition-all ${
              active === item.id ? BTN_ACTIVE : BTN_BASE
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {active === 'home' && (
          <div className="flex flex-col justify-center h-full py-16">
            <p className="text-3xl font-semibold tracking-tight">
              Hey {name}, let&apos;s get to work.
            </p>
            <p className="mt-3 text-secondary text-sm">Select a section from the sidebar to get started.</p>
          </div>
        )}

        {active === 'roster' && <PersonnelRosterPanel users={roster} />}

        {active === 'dataset' && <DatasetUploader />}

        {(active === 'placeholder1' || active === 'placeholder2' || active === 'placeholder3') && (
          <div className="flex flex-col justify-center h-full py-16">
            <p className="text-xl font-medium text-muted">Coming soon.</p>
            <p className="mt-2 text-sm text-muted/60">This section is not yet implemented.</p>
          </div>
        )}
      </div>
    </div>
  )
}
