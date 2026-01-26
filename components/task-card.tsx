'use client'

import { useDraggable } from '@dnd-kit/core'
import { Task } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Clock, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { format, differenceInDays, isBefore, isToday, isTomorrow } from 'date-fns'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onDelete?: (taskId: string) => void
  onClick?: (task: Task) => void
}

export function TaskCard({ task, isDragging = false, onDelete, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const priorityBorderColors = {
    low: 'border-l-blue-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500',
  }

  // Calculate due date status
  const getDueDateInfo = () => {
    if (!task.due_date) return null
    
    const dueDate = new Date(task.due_date)
    const today = new Date()
    const daysUntilDue = differenceInDays(dueDate, today)
    
    if (isBefore(dueDate, today) && !isToday(dueDate)) {
      return {
        text: 'Overdue',
        className: 'bg-red-500 text-white',
        icon: AlertCircle,
        showIcon: true
      }
    } else if (isToday(dueDate)) {
      return {
        text: 'Due today',
        className: 'bg-orange-500 text-white',
        icon: AlertCircle,
        showIcon: true
      }
    } else if (isTomorrow(dueDate)) {
      return {
        text: 'Due tomorrow',
        className: 'bg-orange-500/80 text-white',
        icon: Calendar,
        showIcon: false
      }
    } else if (daysUntilDue <= 3) {
      return {
        text: format(dueDate, 'MMM dd'),
        className: 'bg-yellow-500/30 text-yellow-300',
        icon: Calendar,
        showIcon: false
      }
    } else {
      return {
        text: format(dueDate, 'MMM dd'),
        className: 'text-muted-foreground',
        icon: Calendar,
        showIcon: false
      }
    }
  }

  const dueDateInfo = getDueDateInfo()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(task)}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 border-l-4",
        "hover:shadow-lg hover:-translate-y-0.5",
        isDragging && "opacity-50 shadow-2xl scale-105",
        priorityBorderColors[task.priority]
      )}
    >
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium line-clamp-2 flex-1">
            {task.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {task.estimated_hours && (
              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
                {task.estimated_hours}h
              </Badge>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {task.project && (
            <Badge variant="outline" className="text-xs font-medium">
              {task.project}
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-xs font-medium', priorityColors[task.priority])}>
            {task.priority.toUpperCase()}
          </Badge>
          {dueDateInfo && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
              dueDateInfo.className
            )}>
              {dueDateInfo.showIcon && <dueDateInfo.icon className="h-3 w-3" />}
              <Calendar className={cn("h-3 w-3", dueDateInfo.showIcon && "hidden")} />
              {dueDateInfo.text}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
