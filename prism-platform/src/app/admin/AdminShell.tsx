'use client'

import { useState } from 'react'
import { PersonnelRosterPanel, type RosterUser } from './PersonnelRosterPanel'
import { DatasetUploader } from './DatasetUploader'
import { InstructionsPanel } from './InstructionsPanel'
import { PipelineManagementPanel } from './PipelineManagementPanel'
import { TaskInspectorPanel } from './TaskInspectorPanel'
import type { Instruction } from '@/services/instructions'

type Panel = 'home' | 'roster' | 'dataset' | 'instructions' | 'pipeline' | 'tasks' | 'placeholder2'

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: 'roster',       label: 'Personnel Roster'    },
  { id: 'dataset',      label: 'Dataset Deployment'  },
  { id: 'instructions', label: 'Instructions'         },
  { id: 'pipeline',     label: 'Pipeline Management' },
  { id: 'tasks',        label: 'Task Management'     },
  { id: 'placeholder2', label: 'Placeholder 2'       },
]

const BTN_BASE   = 'bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-white/25'
const BTN_ACTIVE = 'bg-orange-500/25 border-orange-400/60 text-orange-200'

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
    <div className="flex gap-4 min-h-[calc(100vh-10rem)]">
      {/* Sidebar */}
      <aside className="flex flex-col gap-1.5 w-48 shrink-0 p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner self-start sticky top-4">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium text-left transition-all ${
              active === item.id ? BTN_ACTIVE : BTN_BASE
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
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

        {active === 'pipeline' && <PipelineManagementPanel />}

        {active === 'tasks' && <TaskInspectorPanel />}

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
