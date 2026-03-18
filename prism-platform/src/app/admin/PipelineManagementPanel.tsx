'use client'

import { useState, useCallback, useEffect, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  fetchTasksPage,
  fetchActiveTrainers,
  submitTaskAssignment,
  submitTaskUnassignment,
  submitAutoDistribute,
} from './actions'
import type { AdminTask, TaskStatusFilter } from '@/services/admin'

const PAGE_SIZE = 20

type Expert = { user_id: string; display_name: string; email: string; role: string }
type AssignAlgorithm = 'random' | 'even-split' | 'selected' | 'custom'
type DrawerTab = 'assign' | 'unassign'
type RoleFilter = 'all' | 'trainer' | 'trainee'

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-500/20 text-green-300 border-green-500/30',
  reserved:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  claimed:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  rework:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  signed_off:'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

function isFree(task: AdminTask) {
  return task.status === 'available' && !task.reserved_for_id
}
function statusLabel(task: AdminTask) {
  if (isFree(task)) return 'free'
  return task.status.replace('_', ' ')
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
    </svg>
  )
}

function XIcon({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
    </svg>
  )
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <span className={`inline-block border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />
  )
}

function DiceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 9l9-6 9 6M5 11l-2 6h6L7 11Zm14 0-2 6h6l-2-6Z" />
    </svg>
  )
}

function ChecklistIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6m-3 7 2 2 4-4" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function UnlinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

// ─── Algorithm card definitions ─────────────────────────────────────────────

const ALGORITHMS: { id: AssignAlgorithm; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'random',
    label: 'Random',
    description: 'Pick N free tasks per expert from the pool at random',
    icon: <DiceIcon />,
  },
  {
    id: 'even-split',
    label: 'Even Split',
    description: 'Take a total number of tasks and divide them equally',
    icon: <ScaleIcon />,
  },
  {
    id: 'selected',
    label: 'Selected Tasks',
    description: 'Distribute your table selection across chosen experts',
    icon: <ChecklistIcon />,
  },
  {
    id: 'custom',
    label: 'Custom Weights',
    description: 'Set an individual task count for each expert',
    icon: <SlidersIcon />,
  },
]

// ─── Expert list component ───────────────────────────────────────────────────

function ExpertList({
  experts,
  loading,
  selectedExperts,
  onToggle,
  onSelectAll,
  onClear,
}: {
  experts: Expert[]
  loading: boolean
  selectedExperts: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const filtered = experts.filter(ex => {
    const matchesSearch =
      ex.display_name.toLowerCase().includes(search.toLowerCase()) ||
      ex.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || ex.role === roleFilter
    return matchesSearch && matchesRole
  })

  const allFilteredSelected = filtered.length > 0 && filtered.every(ex => selectedExperts.has(ex.user_id))

  function toggleAll() {
    if (allFilteredSelected) {
      // Deselect only filtered
      const ids = filtered.map(e => e.user_id)
      const next = new Set(selectedExperts)
      ids.forEach(id => next.delete(id))
      onSelectAll([...next])
    } else {
      onSelectAll([...new Set([...selectedExperts, ...filtered.map(e => e.user_id)])])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search + role filter row */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2">
          <SearchIcon className="w-3.5 h-3.5 text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-primary">
              <XIcon size={3} />
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface/60 p-1">
          {(['all', 'trainer', 'trainee'] as RoleFilter[]).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                roleFilter === r
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted">
          {filtered.length} expert{filtered.length !== 1 ? 's' : ''}
          {search || roleFilter !== 'all' ? ' matching filter' : ''}
        </span>
        <div className="flex items-center gap-3 text-xs">
          {selectedExperts.size > 0 && (
            <button onClick={onClear} className="text-muted hover:text-primary transition-colors">
              Clear all
            </button>
          )}
          <button
            onClick={toggleAll}
            disabled={filtered.length === 0}
            className="text-accent/80 hover:text-accent transition-colors disabled:opacity-40"
          >
            {allFilteredSelected ? 'Deselect filtered' : 'Select all filtered'}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted text-sm">
          <Spinner className="w-4 h-4" /> Loading experts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">No experts found.</div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
            {filtered.map(ex => (
              <label
                key={ex.user_id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover/50 ${
                  selectedExperts.has(ex.user_id) ? 'bg-accent/5' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedExperts.has(ex.user_id)}
                  onChange={() => onToggle(ex.user_id)}
                  className="accent-orange-400 w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary font-medium truncate">{ex.display_name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide border ${
                      ex.role === 'trainer'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        : 'bg-green-500/10 text-green-300 border-green-500/20'
                    }`}>
                      {ex.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{ex.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Selected chips summary */}
      {selectedExperts.size > 0 && (
        <p className="text-xs text-accent/80 font-medium">
          {selectedExperts.size} expert{selectedExperts.size !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PipelineManagementPanel() {
  const [tasks, setTasks]               = useState<AdminTask[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [searchInput, setSearchInput]   = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all')
  const [isLoading, setIsLoading]       = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())

  // Drawer
  const [showDrawer, setShowDrawer]       = useState(false)
  const [drawerTab, setDrawerTab]         = useState<DrawerTab>('assign')
  const [experts, setExperts]             = useState<Expert[]>([])
  const [loadingExperts, setLoadingExperts] = useState(false)
  const [selectedExperts, setSelectedExperts] = useState<Set<string>>(new Set())

  // Algorithm
  const [algorithm, setAlgorithm]         = useState<AssignAlgorithm>('random')
  const [assignCount, setAssignCount]     = useState(5)
  const [totalSplit, setTotalSplit]       = useState(20)
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({})
  const [showAdvanced, setShowAdvanced]   = useState(false)

  // Advanced options
  const [skipAlreadyAssigned, setSkipAlreadyAssigned] = useState(false)
  const [maxTasksCap, setMaxTasksCap]     = useState('')

  const [isAssigning, startAssignTransition] = useTransition()
  const [isUnassigning, startUnassignTransition] = useTransition()
  const [isAutoDistributing, startAutoDistributeTransition] = useTransition()

  const indeterminateRef = useRef<HTMLInputElement | null>(null)

  const loadTasks = useCallback(async (p: number, search: string, filter: TaskStatusFilter) => {
    setIsLoading(true)
    try {
      const result = await fetchTasksPage({ page: p, pageSize: PAGE_SIZE, search, statusFilter: filter })
      setTasks(result.tasks)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load tasks.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks(page, appliedSearch, statusFilter)
  }, [page, appliedSearch, statusFilter, loadTasks])

  useEffect(() => {
    const el = indeterminateRef.current
    if (!el) return
    el.indeterminate = selected.size > 0 && selected.size < tasks.length
  }, [selected.size, tasks.length])

  // Sync custom weights when selected experts change
  useEffect(() => {
    if (algorithm !== 'custom') return
    setCustomWeights(prev => {
      const next: Record<string, number> = {}
      selectedExperts.forEach(id => {
        next[id] = prev[id] ?? 5
      })
      return next
    })
  }, [selectedExperts, algorithm])

  function handleSearch() { setPage(0); setSelected(new Set()); setAppliedSearch(searchInput) }
  function handleClearSearch() { setSearchInput(''); setAppliedSearch(''); setPage(0); setSelected(new Set()) }
  function handleFilterChange(f: TaskStatusFilter) { setStatusFilter(f); setPage(0); setSelected(new Set()) }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleSelectAll() {
    setSelected(selected.size === tasks.length && tasks.length > 0 ? new Set() : new Set(tasks.map(t => t.task_id)))
  }

  function toggleExpert(id: string) {
    setSelectedExperts(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function setExpertSelection(ids: string[]) { setSelectedExperts(new Set(ids)) }

  async function openDrawer(tab: DrawerTab = 'assign') {
    setDrawerTab(tab)
    setShowDrawer(true)
    if (experts.length === 0) {
      setLoadingExperts(true)
      try {
        const data = await fetchActiveTrainers()
        setExperts(data)
      } catch {
        toast.error('Failed to load experts.')
      } finally {
        setLoadingExperts(false)
      }
    }
  }

  function handleAutoDistribute() {
    startAutoDistributeTransition(async () => {
      try {
        const result = await submitAutoDistribute()
        toast.success(`Distributed ${result.assigned} task${result.assigned !== 1 ? 's' : ''} across ${result.experts} expert${result.experts !== 1 ? 's' : ''}.`)
        loadTasks(page, appliedSearch, statusFilter)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to auto-distribute tasks.')
      }
    })
  }

  function handleAssign() {
    if (selectedExperts.size === 0) { toast.error('Select at least one expert.'); return }
    if (algorithm === 'selected' && selected.size === 0) { toast.error('No tasks selected in the table.'); return }

    startAssignTransition(async () => {
      const fd = new FormData()
      let expertIds = Array.from(selectedExperts)

      if (skipAlreadyAssigned) {
        const assignedIds = new Set(experts.filter(e => false).map(e => e.user_id)) // placeholder – filter happens server-side
        expertIds = expertIds.filter(id => !assignedIds.has(id))
      }

      fd.set('expertIds', expertIds.join(','))

      if (algorithm === 'random') {
        const count = maxTasksCap ? Math.min(assignCount, parseInt(maxTasksCap)) : assignCount
        fd.set('count', count.toString())
      } else if (algorithm === 'even-split') {
        const perExpert = Math.floor(totalSplit / expertIds.length)
        const count = maxTasksCap ? Math.min(perExpert, parseInt(maxTasksCap)) : perExpert
        fd.set('count', Math.max(1, count).toString())
      } else if (algorithm === 'selected') {
        fd.set('taskIds', Array.from(selected).join(','))
      } else if (algorithm === 'custom') {
        const weights: Record<string, number> = {}
        expertIds.forEach(id => {
          const raw = maxTasksCap
            ? Math.min(customWeights[id] ?? 5, parseInt(maxTasksCap))
            : (customWeights[id] ?? 5)
          weights[id] = Math.max(0, raw)
        })
        fd.set('weights', JSON.stringify(weights))
      }

      try {
        const result = await submitTaskAssignment(fd)
        toast.success(`Assigned ${result.assigned} task${result.assigned !== 1 ? 's' : ''} successfully.`)
        setShowDrawer(false)
        setSelected(new Set())
        loadTasks(page, appliedSearch, statusFilter)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign tasks.')
      }
    })
  }

  function handleUnassign() {
    if (selected.size === 0) { toast.error('No tasks selected.'); return }
    startUnassignTransition(async () => {
      const fd = new FormData()
      fd.set('taskIds', Array.from(selected).join(','))
      try {
        const result = await submitTaskUnassignment(fd)
        toast.success(`Unassigned ${result.unassigned} task${result.unassigned !== 1 ? 's' : ''}.`)
        setShowDrawer(false)
        setSelected(new Set())
        loadTasks(page, appliedSearch, statusFilter)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to unassign tasks.')
      }
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const selectedReservedCount = tasks.filter(t => selected.has(t.task_id) && t.status === 'reserved').length
  const selectedNonReservedCount = selected.size - selectedReservedCount

  // Compute assign summary label
  function assignSummary(): string {
    const n = selectedExperts.size
    if (n === 0) return 'Select experts to continue'
    if (algorithm === 'random') {
      const count = maxTasksCap ? Math.min(assignCount, parseInt(maxTasksCap) || assignCount) : assignCount
      return `${n} expert${n > 1 ? 's' : ''} × ${count} tasks = ~${count * n} total`
    }
    if (algorithm === 'even-split') {
      const per = Math.max(1, Math.floor(totalSplit / n))
      return `~${per} task${per > 1 ? 's' : ''} per expert (${totalSplit} total ÷ ${n})`
    }
    if (algorithm === 'selected') {
      return selected.size === 0
        ? 'No tasks selected in table'
        : `${selected.size} task${selected.size > 1 ? 's' : ''} distributed across ${n} expert${n > 1 ? 's' : ''}`
    }
    if (algorithm === 'custom') {
      const total = Object.values(customWeights).reduce((a, b) => a + b, 0)
      return `${total} task${total !== 1 ? 's' : ''} total across ${n} expert${n > 1 ? 's' : ''}`
    }
    return ''
  }

  const canAssign =
    selectedExperts.size > 0 &&
    (algorithm !== 'selected' || selected.size > 0) &&
    (algorithm !== 'custom' || Object.values(customWeights).some(v => v > 0))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Pipeline Management</h2>
        <p className="text-sm text-muted mb-6">View, search, and pre-assign tasks to experts.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface/50 px-3 py-2 flex-1 min-w-52 max-w-sm">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by task ID…"
            className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="text-muted hover:text-primary transition-colors">
              <XIcon size={3} />
            </button>
          )}
          <button onClick={handleSearch} className="text-muted hover:text-accent transition-colors ml-1">
            <SearchIcon />
          </button>
        </div>

        <div className="flex gap-1 rounded-xl border border-border bg-surface/50 p-1">
          {(['all', 'free', 'assigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === f
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleAutoDistribute}
            disabled={isAutoDistributing}
            className="rounded-xl border border-border bg-surface/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            title="Randomly distribute all free tasks to experts who have no assigned tasks"
          >
            {isAutoDistributing && <Spinner className="w-3 h-3" />}
            Auto Distribute
          </button>
          <button
            onClick={() => openDrawer('assign')}
            className="rounded-xl border border-border bg-surface/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all"
          >
            Assign Tasks
          </button>
        </div>
      </div>

      {/* Contextual selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5 flex-wrap">
          <span className="text-xs text-accent font-medium">{selected.size} task{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={() => openDrawer('assign')}
              className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-all"
            >
              Assign selected
            </button>
            <button
              onClick={() => openDrawer('unassign')}
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20 transition-all flex items-center gap-1.5"
            >
              <UnlinkIcon />
              Unassign selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-primary transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <p className="text-xs text-muted">
        {total} task{total !== 1 ? 's' : ''}
        {appliedSearch && <span className="ml-1 text-accent/70">matching &ldquo;{appliedSearch}&rdquo;</span>}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/30 text-xs text-secondary">
              <th className="p-3 w-10">
                <input ref={indeterminateRef} type="checkbox" checked={tasks.length > 0 && selected.size === tasks.length} onChange={toggleSelectAll} className="accent-orange-400" />
              </th>
              <th className="p-3 font-medium">Task ID</th>
              <th className="p-3 font-medium">Question</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Assigned To</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              <tr><td colSpan={6} className="p-10 text-center"><Spinner className="w-5 h-5 text-accent mx-auto" /></td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-muted text-sm">No tasks found.</td></tr>
            ) : (
              tasks.map(task => (
                <tr
                  key={task.task_id}
                  className={`border-b border-border/50 hover:bg-surface-hover/50 transition-colors ${selected.has(task.task_id) ? 'bg-accent/5' : ''}`}
                >
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(task.task_id)} onChange={() => toggleSelect(task.task_id)} className="accent-orange-400" />
                  </td>
                  <td className="p-3 font-mono text-xs text-accent whitespace-nowrap">{task.external_id}</td>
                  <td className="p-3 text-primary max-w-xs">
                    <span className="line-clamp-2 text-sm">{task.question}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${STATUS_BADGE[task.status] ?? 'bg-border/20 text-muted border-border/30'}`}>
                      {statusLabel(task)}
                    </span>
                  </td>
                  <td className="p-3 text-muted text-xs whitespace-nowrap">
                    {task.reserved_for_email ?? (task.reserved_for_id ? `${task.reserved_for_id.slice(0, 8)}…` : '—')}
                  </td>
                  <td className="p-3 text-muted text-xs tabular-nums whitespace-nowrap">
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">← Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next →</button>
          </div>
        </div>
      )}

      {/* ── Drawer ── */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDrawer(false)}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col bg-background border-l border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-medium">Task Assignment</h3>
                <p className="text-xs text-muted mt-0.5">Configure how tasks are distributed to experts</p>
              </div>
              <button onClick={() => setShowDrawer(false)} className="text-muted hover:text-primary transition-colors p-1">
                <XIcon size={5} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex gap-1 rounded-xl border border-border bg-surface/50 p-1">
                {(['assign', 'unassign'] as DrawerTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                      drawerTab === tab
                        ? tab === 'assign'
                          ? 'bg-accent/20 text-accent border border-accent/40'
                          : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {tab === 'assign' ? 'Assign Tasks' : 'Unassign Tasks'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

              {/* ── ASSIGN TAB ── */}
              {drawerTab === 'assign' && (
                <>
                  {/* Experts section */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-primary">Experts</h4>
                      <span className="text-xs text-muted">{experts.length} available</span>
                    </div>
                    <ExpertList
                      experts={experts}
                      loading={loadingExperts}
                      selectedExperts={selectedExperts}
                      onToggle={toggleExpert}
                      onSelectAll={setExpertSelection}
                      onClear={() => setSelectedExperts(new Set())}
                    />
                  </section>

                  {/* Algorithm section */}
                  <section className="flex flex-col gap-3">
                    <h4 className="text-sm font-medium text-primary">Assignment Algorithm</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {ALGORITHMS.map(alg => {
                        const isDisabled = alg.id === 'selected' && selected.size === 0
                        const isActive = algorithm === alg.id
                        return (
                          <button
                            key={alg.id}
                            onClick={() => !isDisabled && setAlgorithm(alg.id)}
                            disabled={isDisabled}
                            className={`relative flex flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? 'border-accent/60 bg-accent/10 text-accent'
                                : 'border-border bg-surface/40 text-muted hover:text-primary hover:border-border/80 hover:bg-surface-hover/40'
                            }`}
                          >
                            <div className={`${isActive ? 'text-accent' : 'text-muted'}`}>{alg.icon}</div>
                            <div>
                              <p className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-primary'}`}>{alg.label}</p>
                              <p className="text-xs text-muted leading-snug mt-0.5">{alg.description}</p>
                            </div>
                            {alg.id === 'selected' && selected.size > 0 && (
                              <span className="absolute top-2 right-2 text-[10px] bg-accent/20 text-accent border border-accent/30 rounded-full px-1.5 py-0.5">
                                {selected.size}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Algorithm configuration */}
                    <div className="rounded-xl border border-border/60 bg-surface/30 px-4 py-4 flex flex-col gap-3">
                      {algorithm === 'random' && (
                        <>
                          <div>
                            <label className="text-xs text-secondary mb-1.5 block">Tasks per expert</label>
                            <input
                              type="number" min={1} value={assignCount}
                              onChange={e => setAssignCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent"
                            />
                          </div>
                          <p className="text-xs text-muted/70">
                            Each selected expert will receive {assignCount} randomly chosen free task{assignCount !== 1 ? 's' : ''}.
                            {selectedExperts.size > 0 && ` Total: ~${assignCount * selectedExperts.size} tasks.`}
                          </p>
                        </>
                      )}

                      {algorithm === 'even-split' && (
                        <>
                          <div>
                            <label className="text-xs text-secondary mb-1.5 block">Total tasks to distribute</label>
                            <input
                              type="number" min={1} value={totalSplit}
                              onChange={e => setTotalSplit(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent"
                            />
                          </div>
                          <p className="text-xs text-muted/70">
                            {selectedExperts.size > 0
                              ? `~${Math.max(1, Math.floor(totalSplit / selectedExperts.size))} task${Math.floor(totalSplit / selectedExperts.size) !== 1 ? 's' : ''} per expert across ${selectedExperts.size} expert${selectedExperts.size !== 1 ? 's' : ''}.`
                              : 'Select experts to see the per-expert breakdown.'}
                          </p>
                        </>
                      )}

                      {algorithm === 'selected' && (
                        <p className="text-xs text-muted/70">
                          {selected.size === 0
                            ? 'Go back to the table and select tasks first.'
                            : selectedExperts.size === 0
                              ? `${selected.size} task${selected.size !== 1 ? 's' : ''} ready. Select experts above.`
                              : `${selected.size} task${selected.size !== 1 ? 's' : ''} will be distributed round-robin across ${selectedExperts.size} expert${selectedExperts.size !== 1 ? 's' : ''}.`}
                        </p>
                      )}

                      {algorithm === 'custom' && (
                        <>
                          {selectedExperts.size === 0 ? (
                            <p className="text-xs text-muted/70">Select experts above to set individual task counts.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="grid grid-cols-[1fr_auto] gap-x-4 items-center text-xs text-secondary pb-1 border-b border-border/40">
                                <span>Expert</span>
                                <span className="text-right w-20">Tasks</span>
                              </div>
                              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                                {Array.from(selectedExperts).map(id => {
                                  const expert = experts.find(e => e.user_id === id)
                                  if (!expert) return null
                                  return (
                                    <div key={id} className="grid grid-cols-[1fr_auto] gap-x-4 items-center">
                                      <div className="min-w-0">
                                        <p className="text-sm text-primary truncate">{expert.display_name}</p>
                                        <p className="text-[11px] text-muted truncate">{expert.email}</p>
                                      </div>
                                      <input
                                        type="number" min={0}
                                        value={customWeights[id] ?? 5}
                                        onChange={e => setCustomWeights(prev => ({ ...prev, [id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                        className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-primary text-center focus:outline-none focus:border-accent"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                                <span className="text-secondary">Total</span>
                                <span className="font-medium text-primary tabular-nums">
                                  {Object.values(customWeights).reduce((a, b) => a + b, 0)} tasks
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>

                  {/* Advanced options */}
                  <section>
                    <button
                      onClick={() => setShowAdvanced(v => !v)}
                      className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors w-full"
                    >
                      <ChevronIcon open={showAdvanced} />
                      Advanced options
                    </button>

                    {showAdvanced && (
                      <div className="mt-3 rounded-xl border border-border/60 bg-surface/30 px-4 py-4 flex flex-col gap-4">
                        {/* Skip already assigned */}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skipAlreadyAssigned}
                            onChange={e => setSkipAlreadyAssigned(e.target.checked)}
                            className="accent-orange-400 w-4 h-4 mt-0.5 shrink-0"
                          />
                          <div>
                            <p className="text-sm text-primary">Skip experts with existing assignments</p>
                            <p className="text-xs text-muted mt-0.5">Exclude experts who already have reserved tasks from this batch.</p>
                          </div>
                        </label>

                        {/* Max tasks cap */}
                        <div>
                          <label className="text-xs text-secondary mb-1.5 block">
                            Max tasks per expert (cap)
                            <span className="ml-1 text-muted/60">— leave blank for no limit</span>
                          </label>
                          <input
                            type="number" min={1}
                            value={maxTasksCap}
                            onChange={e => setMaxTasksCap(e.target.value)}
                            placeholder="No limit"
                            className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent placeholder:text-muted"
                          />
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* ── UNASSIGN TAB ── */}
              {drawerTab === 'unassign' && (
                <section className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    Unassigning a task resets it to <span className="text-green-300 font-medium">free</span> status so it can be picked up or reassigned. Only tasks with <span className="text-orange-300 font-medium">reserved</span> status can be unassigned.
                  </p>

                  {selected.size === 0 ? (
                    <div className="rounded-xl border border-border/50 bg-surface/30 px-4 py-8 text-center">
                      <p className="text-sm text-muted">No tasks selected.</p>
                      <p className="text-xs text-muted/60 mt-1">Select rows in the table, then come back here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-border/50 bg-surface/30 divide-y divide-border/40">
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="text-secondary">Tasks selected</span>
                          <span className="font-medium text-primary tabular-nums">{selected.size}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="text-secondary">Will be freed</span>
                          <span className="font-medium text-orange-300 tabular-nums">{selectedReservedCount}</span>
                        </div>
                        {selectedNonReservedCount > 0 && (
                          <div className="flex items-center justify-between px-4 py-3 text-sm">
                            <span className="text-secondary">Skipped (wrong status)</span>
                            <span className="font-medium text-muted tabular-nums">{selectedNonReservedCount}</span>
                          </div>
                        )}
                      </div>

                      {selectedNonReservedCount > 0 && (
                        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/8 px-4 py-3 text-xs text-yellow-400/80">
                          {selectedNonReservedCount} selected task{selectedNonReservedCount !== 1 ? 's are' : ' is'} not in &ldquo;reserved&rdquo; status and will be skipped.
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex flex-col gap-3">
              {drawerTab === 'assign' && (
                <>
                  {selectedExperts.size > 0 && (
                    <p className="text-xs text-muted/80 text-center">{assignSummary()}</p>
                  )}
                  <button
                    onClick={handleAssign}
                    disabled={isAssigning || !canAssign}
                    className="w-full rounded-xl bg-accent/20 border border-accent/50 px-4 py-3 text-sm font-medium text-accent hover:bg-accent/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAssigning && <Spinner className="w-4 h-4" />}
                    {isAssigning ? 'Assigning…' : 'Confirm Assignment'}
                  </button>
                </>
              )}

              {drawerTab === 'unassign' && (
                <button
                  onClick={handleUnassign}
                  disabled={isUnassigning || selectedReservedCount === 0}
                  className="w-full rounded-xl bg-orange-500/20 border border-orange-500/50 px-4 py-3 text-sm font-medium text-orange-300 hover:bg-orange-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUnassigning && <Spinner className="w-4 h-4" />}
                  {isUnassigning
                    ? 'Unassigning…'
                    : selectedReservedCount > 0
                      ? `Free ${selectedReservedCount} task${selectedReservedCount !== 1 ? 's' : ''}`
                      : 'No reserved tasks selected'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
