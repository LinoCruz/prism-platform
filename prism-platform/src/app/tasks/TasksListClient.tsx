'use client'

import { useState } from 'react'
import { PrismStripes } from '@/components/PrismStripes'
import { ClaimTaskButton } from './ClaimTaskButton'

type Task = {
  task_id: string
  external_id: string | null
  status: string
  question: string | null
}

export function TasksListClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)

  function removeTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.task_id !== taskId))
  }

  if (tasks.length === 0) {
    return (
      <div className="slide-card relative overflow-hidden rounded-2xl bg-surface border border-border flex flex-col pt-1.5">
        <div className="slide-card-grain" />
        <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />
        <div className="relative z-10 flex-1 p-10 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🎬</span>
          <p className="text-muted">No tasks available right now. Stand by for the next scene.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {tasks.map((task) => {
        const displayId = task.external_id ?? task.task_id.split('-')[0]
        return (
          <li
            key={task.task_id}
            className="group relative slide-card overflow-hidden rounded-2xl bg-surface border border-transparent hover:border-accent/40 transition-all duration-300 flex flex-col pt-1.5"
          >
            <div className="slide-card-grain" />
            <PrismStripes
              variant="horizontal"
              thickness={6}
              className="absolute top-0 left-0 right-0 z-20 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
            />

            <div className="relative z-10 p-6 flex-1 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center rounded bg-surface-hover px-2 py-1 text-[10px] uppercase font-mono tracking-widest text-secondary border border-border">
                    {task.status}
                  </span>
                </div>

                <p className="font-mono text-xs text-muted mb-1 break-all">
                  ID: {displayId}
                </p>
                {task.question && (
                  <p className="text-sm text-primary line-clamp-3 leading-relaxed">{task.question}</p>
                )}
              </div>

              <div className="mt-8">
                <ClaimTaskButton
                  taskId={task.task_id}
                  externalId={displayId}
                  onSubmitted={() => removeTask(task.task_id)}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
