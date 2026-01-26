'use client'

import { Task } from '@/lib/types'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { format, differenceInDays, startOfWeek, endOfWeek, eachWeekOfInterval, addDays, isSameWeek } from 'date-fns'
import { cn } from '@/lib/utils'

interface CustomGanttProps {
  tasks: Task[]
}

export function CustomGantt({ tasks: allTasks }: CustomGanttProps) {
  // Filter tasks with due dates and estimated hours
  const tasks = allTasks.filter(t => t.due_date && t.estimated_hours)

  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          No tasks with estimated hours and due dates found.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Add estimated hours and due dates to tasks to see them in the Gantt view.
        </p>
      </Card>
    )
  }

  // Calculate date range
  const allDates = tasks.map(t => new Date(t.due_date!))
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  
  // Extend range by 1 week on each side
  const startDate = startOfWeek(addDays(minDate, -7))
  const endDate = endOfWeek(addDays(maxDate, 7))
  
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate })
  const totalDays = differenceInDays(endDate, startDate)

  const priorityColors = {
    high: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-100' },
    medium: { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-100' },
    low: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-100' },
  }

  const statusProgress = {
    backlog: 0,
    todo: 25,
    'in-progress': 50,
    review: 75,
    done: 100,
  }

  return (
    <Card className="bg-[#0f1419] border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 font-semibold text-gray-300">Task</div>
          <div className="col-span-9">
            <div className="flex">
              {weeks.map((week, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-sm font-medium text-gray-400 border-l border-gray-800 px-2 py-1"
                >
                  <div>{format(week, 'MMM dd')}</div>
                  <div className="text-xs text-gray-500">W{format(week, 'w')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="divide-y divide-gray-800">
        {tasks.map((task) => {
          const dueDate = new Date(task.due_date!)
          const estimatedDays = Math.ceil((task.estimated_hours || 1) / 8)
          const taskStart = addDays(dueDate, -estimatedDays)
          
          // Calculate position
          const daysFromStart = differenceInDays(taskStart, startDate)
          const leftPercent = (daysFromStart / totalDays) * 100
          const widthPercent = (estimatedDays / totalDays) * 100

          const colors = priorityColors[task.priority]
          const progress = statusProgress[task.status]

          return (
            <div key={task.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-900/30 transition-colors">
              {/* Task Info */}
              <div className="col-span-3 space-y-1">
                <div className="text-sm font-medium text-gray-200 line-clamp-1">
                  {task.title}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {task.project && (
                    <Badge variant="outline" className="text-xs">
                      {task.project}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {task.estimated_hours}h
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="col-span-9 relative">
                {/* Week grid */}
                <div className="absolute inset-0 flex">
                  {weeks.map((week, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 border-l border-gray-800",
                        isSameWeek(new Date(), week) && "bg-blue-500/5"
                      )}
                    />
                  ))}
                </div>

                {/* Task bar */}
                <div className="relative h-10 flex items-center">
                  <div
                    className={cn(
                      "absolute h-8 rounded-md border-2 overflow-hidden",
                      colors.bg,
                      colors.border,
                      "shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    )}
                    style={{
                      left: `${Math.max(0, leftPercent)}%`,
                      width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                    }}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute inset-0 bg-white/20 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                    
                    {/* Task label */}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center px-2",
                      colors.text,
                      "text-xs font-semibold truncate"
                    )}>
                      {task.title}
                    </div>
                  </div>

                  {/* Today marker */}
                  {(() => {
                    const today = new Date()
                    const daysToToday = differenceInDays(today, startDate)
                    const todayPercent = (daysToToday / totalDays) * 100
                    
                    if (todayPercent >= 0 && todayPercent <= 100) {
                      return (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                          style={{ left: `${todayPercent}%` }}
                        >
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
