'use client'

import { useEffect, useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Task, TaskStatus, Project } from '@/lib/types'
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'
import { ProjectSwitcher } from '@/components/project-switcher'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { NewTaskDialog } from '@/components/new-task-dialog'
import { QuickAddFab } from '@/components/quick-add-fab'
import { TaskDetailsModal } from '@/components/task-details-modal'
import { Confetti } from '@/components/confetti'
import { isToday, isTomorrow, differenceInDays, isBefore } from 'date-fns'

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (Array.isArray(data)) {
        setAllTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    // Filter tasks when project or filter selection changes
    let filtered = allTasks

    // Apply project filter
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(t => t.project_id === selectedProjectId)
    }

    // Apply quick filter
    const today = new Date()
    switch (activeFilter) {
      case 'high-priority':
        filtered = filtered.filter(t => t.priority === 'high')
        break
      case 'due-today':
        filtered = filtered.filter(t => t.due_date && isToday(new Date(t.due_date)))
        break
      case 'due-this-week':
        filtered = filtered.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          const days = differenceInDays(dueDate, today)
          return days >= 0 && days <= 7
        })
        break
      case 'overdue':
        filtered = filtered.filter(t => {
          if (!t.due_date || t.status === 'done') return false
          return isBefore(new Date(t.due_date), today) && !isToday(new Date(t.due_date))
        })
        break
      case 'no-due-date':
        filtered = filtered.filter(t => !t.due_date && t.status !== 'done')
        break
      default:
        // 'all' - no additional filtering
        break
    }

    setTasks(filtered)
  }, [selectedProjectId, activeFilter, allTasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = allTasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Trigger confetti if completing a task
    if (newStatus === 'done' && task.status !== 'done') {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)
    }

    // Optimistic update BEFORE API call (Phase 4: optimistic updates)
    const previousAllTasks = [...allTasks]
    const previousTasks = [...tasks]
    
    setAllTasks(allTasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    // Update on server
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error
      setAllTasks(previousAllTasks)
      setTasks(previousTasks)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsOpen(true)
  }

  const backlogTasks = tasks.filter(t => t.status === 'backlog')
  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress')
  const reviewTasks = tasks.filter(t => t.status === 'review')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const quickFilters = [
    { id: 'all', label: 'All Tasks', count: allTasks.length },
    { id: 'high-priority', label: 'High Priority', count: allTasks.filter(t => t.priority === 'high').length },
    { id: 'due-today', label: 'Due Today', count: allTasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length },
    { id: 'due-this-week', label: 'Due This Week', count: allTasks.filter(t => {
      if (!t.due_date) return false
      const days = differenceInDays(new Date(t.due_date), new Date())
      return days >= 0 && days <= 7
    }).length },
    { id: 'overdue', label: 'Overdue', count: allTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      return isBefore(new Date(t.due_date), new Date()) && !isToday(new Date(t.due_date))
    }).length },
    { id: 'no-due-date', label: 'No Due Date', count: allTasks.filter(t => !t.due_date && t.status !== 'done').length },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Kanban Board</h1>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <ProjectSwitcher
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            className="w-[200px] md:w-[250px]"
          />
          <Button onClick={() => setIsNewTaskOpen(true)} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b">
        {quickFilters.map(filter => (
          <Badge
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
            {filter.count > 0 && (
              <span className="ml-1.5 font-semibold">({filter.count})</span>
            )}
          </Badge>
        ))}
        {(activeFilter !== 'all' || selectedProjectId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => {
              setActiveFilter('all')
              setSelectedProjectId('all')
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KanbanColumn
            id="backlog"
            title="Backlog"
            tasks={backlogTasks}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            accentColor="gray"
          />
          <KanbanColumn
            id="todo"
            title="To Do"
            tasks={todoTasks}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            accentColor="blue"
          />
          <KanbanColumn
            id="in-progress"
            title="In Progress"
            tasks={inProgressTasks}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            accentColor="purple"
          />
          <KanbanColumn
            id="review"
            title="Review"
            tasks={reviewTasks}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            accentColor="orange"
          />
          <KanbanColumn
            id="done"
            title="Done"
            tasks={doneTasks}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            accentColor="green"
          />
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <NewTaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        onTaskCreated={fetchTasks}
      />
      
      <TaskDetailsModal
        task={selectedTask}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onTaskUpdated={fetchTasks}
        onTaskDeleted={handleDeleteTask}
      />
      
      <QuickAddFab onTaskCreated={fetchTasks} />
      
      <Confetti trigger={showConfetti} />
    </div>
  )
}
