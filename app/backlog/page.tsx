'use client'

import { useEffect, useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Task, TaskStatus } from '@/lib/types'
import { Sprint } from '@/lib/types'
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Inbox, Rocket } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { NewTaskDialog } from '@/components/new-task-dialog'
import { TaskDetailsModal } from '@/components/task-details-modal'
import { useProject } from '@/contexts/project-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

export default function BacklogPage() {
  const { selectedProjectId } = useProject()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAIPrioritizing, setIsAIPrioritizing] = useState(false)
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false)
  const [taskToAddToSprint, setTaskToAddToSprint] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId || selectedProjectId === 'all') {
      setTasks([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks?project_id=${selectedProjectId}`)
      const data = await res.json()
      // Filter to backlog tasks
      const backlogTasks = (Array.isArray(data) ? data : []).filter(
        (t: Task) => t.status === 'backlog' && !t.archived
      )
      setTasks(backlogTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId])

  const fetchSprints = useCallback(async () => {
    if (!selectedProjectId || selectedProjectId === 'all') return
    
    try {
      const res = await fetch(`/api/sprints?project_id=${selectedProjectId}`)
      const data = await res.json()
      setSprints(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching sprints:', error)
    }
  }, [selectedProjectId])

  useEffect(() => {
    fetchTasks()
    fetchSprints()
  }, [fetchTasks, fetchSprints])

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
    const targetId = over.id as string

    // If dropped on a sprint, open dialog to add to sprint
    if (targetId.startsWith('sprint-')) {
      const sprintId = targetId.replace('sprint-', '')
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setTaskToAddToSprint(task)
        setIsSprintDialogOpen(true)
      }
      return
    }

    // Otherwise, update task status
    const newStatus = targetId as TaskStatus
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistic update
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      fetchTasks() // Revert on error
    }
  }

  const handleAIPrioritize = async () => {
    setIsAIPrioritizing(true)
    try {
      const taskIds = tasks.map(t => t.id)
      const res = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_ids: taskIds,
          project_id: selectedProjectId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get AI prioritization')
      }

      const data = await res.json()
      const suggestions = data.suggestions || []

      // Create a map of task_id to suggested order
      const orderMap = new Map<string, number>(
        suggestions.map((s: any) => [s.task_id, s.recommended_order] as [string, number])
      )

      // Sort tasks by suggested order
      const sorted = [...tasks].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 999
        const orderB = orderMap.get(b.id) ?? 999
        return orderA - orderB
      })

      setTasks(sorted)

      // Show notification with suggestions
      if (suggestions.length > 0) {
        console.log('AI Prioritization Results:', suggestions)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error prioritizing tasks:', error)
      // Fallback to simple priority sort
      const sorted = [...tasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      setTasks(sorted)
    } finally {
      setIsAIPrioritizing(false)
    }
  }

  const handleAddToSprint = async (sprintId: string, storyPoints?: number) => {
    if (!taskToAddToSprint) return

    try {
      await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskToAddToSprint.id,
          story_points: storyPoints || null,
        }),
      })
      setIsSprintDialogOpen(false)
      setTaskToAddToSprint(null)
      fetchTasks() // Remove from backlog
    } catch (error) {
      console.error('Error adding task to sprint:', error)
    }
  }

  if (!selectedProjectId || selectedProjectId === 'all') {
    return (
      <div className="p-6 md:p-8">
        <EmptyState
          icon={Inbox}
          title="Select a project"
          description="Please select a project to view its backlog"
          action={{
            label: 'Go to Projects',
            onClick: () => router.push('/projects'),
          }}
        />
      </div>
    )
  }

  const statusColumns: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done']
  const tasksByStatus = statusColumns.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Backlog</h1>
          <p className="text-muted-foreground">
            Manage your backlog and prioritize tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAIPrioritize}
            disabled={isAIPrioritizing || tasks.length === 0}
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isAIPrioritizing ? 'Prioritizing...' : 'AI Prioritize'}
          </Button>
          <Button onClick={() => setIsNewTaskOpen(true)}>
            <Inbox className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading backlog...</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No backlog tasks"
          description="Create tasks to start building your backlog"
          action={{
            label: 'Create Task',
            onClick: () => setIsNewTaskOpen(true),
          }}
        />
      ) : (
        <>
          {/* Active Sprints - Drop targets */}
          {sprints.filter(s => s.status === 'active' || s.status === 'planned').length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Drag to Sprint</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {sprints
                  .filter(s => s.status === 'active' || s.status === 'planned')
                  .map((sprint) => (
                    <Card
                      key={sprint.id}
                      id={`sprint-${sprint.id}`}
                      className="flex-shrink-0 w-64 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-4 w-4" />
                          <CardTitle className="text-sm">{sprint.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          {sprint._count?.sprint_tasks || 0} tasks
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* Backlog Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {statusColumns.map((status) => {
                const statusTasks = tasksByStatus[status] || []
                return (
                  <div key={status} className="flex-shrink-0 w-80">
                    <KanbanColumn
                      id={status}
                      title={status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                      tasks={statusTasks}
                      onDeleteTask={async (taskId) => {
                        try {
                          await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
                          fetchTasks()
                        } catch (error) {
                          console.error('Error deleting task:', error)
                        }
                      }}
                      onTaskClick={(task) => {
                        setSelectedTask(task)
                        setIsDetailsOpen(true)
                      }}
                      accentColor="gray"
                    />
                  </div>
                )
              })}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="opacity-90">
                  <TaskCard task={activeTask} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {/* New Task Dialog */}
      <NewTaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultProjectId={selectedProjectId}
        onTaskCreated={fetchTasks}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onTaskUpdated={fetchTasks}
          onTaskDeleted={fetchTasks}
        />
      )}

      {/* Add to Sprint Dialog */}
      <Dialog open={isSprintDialogOpen} onOpenChange={setIsSprintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task to Sprint</DialogTitle>
            <DialogDescription>
              Select a sprint to add "{taskToAddToSprint?.title}" to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {sprints
              .filter(s => s.status === 'active' || s.status === 'planned')
              .map((sprint) => (
                <Button
                  key={sprint.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddToSprint(sprint.id)}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {sprint.name}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
