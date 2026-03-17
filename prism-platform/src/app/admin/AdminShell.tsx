'use client'

import { useState } from 'react'
import { PersonnelRosterPanel, type RosterUser } from './PersonnelRosterPanel'
import { DatasetUploader } from './DatasetUploader'
import { InstructionsPanel } from './InstructionsPanel'
import { TasksManagementPanel } from './TasksManagementPanel'
import type { Instruction } from '@/services/instructions'

type Panel = 'home' | 'roster' | 'dataset' | 'instructions' | 'tasks' | 'placeholder2'

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: 'roster',       label: 'Personnel Roster'   },
  { id: 'dataset',      label: 'Dataset Deployment' },
  { id: 'instructions', label: 'Instructions'        },
  { id: 'tasks',        label: 'Task Management'    },
  { id: 'placeholder2', label: 'Placeholder 2'      },
]

const BTN_BASE   = 'border-white/20 text-white/50 hover:bg-orange-500/10 hover:text-orange-300 hover:border-orange-400/30'
const BTN_ACTIVE = 'bg-orange-500/20 border-orange-400/60 text-orange-300'

export function AdminShell({
  name,
  roster,
  currentUserId,
  instructions,
}: {
  name: string
  roster: RosterUser[]
  currentUserId: string
  instructions: Instruction[]
}) {
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
      <div className="flex-1 min-w-0 p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
        {active === 'home' && (
          <div className="flex flex-col justify-center h-full py-16">
            <p className="text-3xl font-semibold tracking-tight">
              Hey {name}, let&apos;s get to work.
            </p>
            <p className="mt-3 text-secondary text-sm">Select a section from the sidebar to get started.</p>
          </div>
        )}

        {active === 'roster' && <PersonnelRosterPanel users={roster} currentUserId={currentUserId} />}

        {active === 'dataset' && <DatasetUploader />}

        {active === 'instructions' && <InstructionsPanel instructions={instructions} />}

        {active === 'tasks' && <TasksManagementPanel />}

        {active === 'placeholder2' && (
          <div className="flex flex-col justify-center h-full py-16">
            <p className="text-xl font-medium text-muted">Coming soon.</p>
            <p className="mt-2 text-sm text-muted/60">This section is not yet implemented.</p>
          </div>
        )}
      </div>
    </div>
  )
}
