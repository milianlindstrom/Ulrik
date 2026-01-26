'use client'

import { useDroppable } from '@dnd-kit/core'
import { Task } from '@/lib/types'
import { TaskCard } from './task-card'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  onDeleteTask: (taskId: string) => void
  onTaskClick?: (task: Task) => void
  accentColor?: 'gray' | 'blue' | 'purple' | 'orange' | 'green'
}

const accentColorClasses = {
  gray: {
    border: 'border-gray-500/30',
    bg: 'bg-gray-500/10',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    header: 'text-gray-300'
  },
  blue: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    header: 'text-blue-300'
  },
  purple: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    header: 'text-purple-300'
  },
  orange: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    header: 'text-orange-300'
  },
  green: {
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    header: 'text-green-300'
  },
}

export function KanbanColumn({ id, title, tasks, onDeleteTask, onTaskClick, accentColor = 'gray' }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const colors = accentColorClasses[accentColor]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-4 p-4 rounded-lg border-2 border-dashed min-h-[500px] transition-all",
        isOver ? `${colors.border} ${colors.bg}` : "border-border"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className={cn("text-lg font-semibold", colors.header)}>{title}</h2>
        <Badge variant="outline" className={cn("text-xs font-semibold", colors.badge)}>
          {tasks.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {id === 'backlog' && 'Your backlog is empty. Brain dump your ideas here! 💭'}
            {id === 'todo' && 'Nothing to do... yet. Move tasks from Backlog when ready.'}
            {id === 'in-progress' && 'No active work. Time to start something! 🚀'}
            {id === 'review' && 'Nothing to review. Keep shipping! ✨'}
            {id === 'done' && 'Nothing completed yet. You got this! 💪'}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onClick={onTaskClick} />
          ))
        )}
      </div>
    </div>
  )
}
