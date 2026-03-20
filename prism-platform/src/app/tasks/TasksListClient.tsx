'use client'

import { useState } from 'react'
import { PrismStripes } from '@/components/PrismStripes'
import { ClaimTaskModal } from './ClaimTaskModal'

type Task = {
  task_id: string
  external_id: string | null
  status: string
  question: string | null
}

function TaskRow({ task, onRemove }: { task: Task; onRemove: (id: string) => void }) {
  const displayId = task.external_id ?? task.task_id.split('-')[0]
  return (
    <li className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-hover/30 transition-colors">
      <span className="shrink-0 inline-flex items-center rounded bg-surface-hover px-2 py-0.5 text-[10px] uppercase font-mono tracking-widest text-secondary border border-border">
        {task.status === 'sent_for_rework' ? 'rework' : task.status}
      </span>
      <span className="shrink-0 font-mono text-xs text-muted w-28 truncate">
        {displayId}
      </span>
      <p className="flex-1 text-sm text-primary truncate min-w-0">
        {task.question ?? <span className="text-muted italic">No question</span>}
      </p>
      <div className="shrink-0 w-36">
        <ClaimTaskModal
          taskId={task.task_id}
          externalId={displayId}
          onSubmitted={() => onRemove(task.task_id)}
        />
      </div>
    </li>
  )
}

function TaskTable({ tasks, onRemove }: { tasks: Task[]; onRemove: (id: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface border border-border">
      <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />
      <ul className="relative z-10 pt-1.5 divide-y divide-border">
        {tasks.map((task) => (
          <TaskRow key={task.task_id} task={task} onRemove={onRemove} />
        ))}
      </ul>
    </div>
  )
}

export function TasksListClient({
  initialTasks,
  initialReworkTasks,
}: {
  initialTasks: Task[]
  initialReworkTasks: Task[]
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [reworkTasks, setReworkTasks] = useState(initialReworkTasks)

  function removeTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId))
  }

  function removeReworkTask(taskId: string) {
    setReworkTasks((prev) => prev.filter((t) => t.task_id !== taskId))
  }

  const hasNone = tasks.length === 0 && reworkTasks.length === 0

  if (hasNone) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-surface border border-border flex flex-col pt-1.5">
        <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />
        <div className="relative z-10 flex-1 p-10 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🎬</span>
          <p className="text-muted">No tasks available right now. Stand by for the next scene.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {tasks.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted mb-3">
            Available Tasks <span className="ml-1 text-secondary">({tasks.length})</span>
          </h2>
          <TaskTable tasks={tasks} onRemove={removeTask} />
        </section>
      )}

      {reworkTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium uppercase tracking-widest text-yellow-400/80">
              Pending Reworks
            </h2>
            <span className="inline-flex items-center rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
              {reworkTasks.length}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-surface border border-yellow-500/20">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500/40 via-yellow-400/60 to-yellow-500/40 z-20" />
            <ul className="relative z-10 pt-1.5 divide-y divide-border">
              {reworkTasks.map((task) => (
                <TaskRow key={task.task_id} task={task} onRemove={removeReworkTask} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
