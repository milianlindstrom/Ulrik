'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Task, TaskStatus, Sprint, SprintTask } from '@/lib/types'
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowLeft, Calendar, Rocket } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { NewTaskDialog } from '@/components/new-task-dialog'
import { TaskDetailsModal } from '@/components/task-details-modal'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done']

export default function SprintBoardPage() {
  const params = useParams()
  const router = useRouter()
  const sprintId = params.id as string
  
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [taskStoryPoints, setTaskStoryPoints] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const fetchSprint = useCallback(async () => {
    if (!sprintId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/sprints/${sprintId}`)
      const data = await res.json()
      setSprint(data)
      
      // Extract sprint tasks and their associated tasks
      const st = data.sprint_tasks || []
      setSprintTasks(st)
      setAllTasks(st.map((st: SprintTask) => st.task).filter(Boolean))
    } catch (error) {
      console.error('Error fetching sprint:', error)
    } finally {
      setLoading(false)
    }
  }, [sprintId])

  const fetchAvailableTasks = useCallback(async () => {
    if (!sprint?.project_id) return
    
    try {
      const res = await fetch(`/api/tasks?project_id=${sprint.project_id}`)
      const data = await res.json()
      // Filter out tasks already in sprint
      const sprintTaskIds = new Set(sprintTasks.map(st => st.task_id))
      setAvailableTasks(data.filter((t: Task) => !sprintTaskIds.has(t.id) && !t.archived))
    } catch (error) {
      console.error('Error fetching available tasks:', error)
    }
  }, [sprint, sprintTasks])

  useEffect(() => {
    fetchSprint()
  }, [fetchSprint])

  useEffect(() => {
    if (sprint) {
      fetchAvailableTasks()
    }
  }, [sprint, fetchAvailableTasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find(t => t.id === event.active.id)
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

    // Find the sprint task
    const sprintTask = sprintTasks.find(st => st.task_id === taskId)
    if (!sprintTask) return

    // Optimistic update
    setAllTasks(allTasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    // Update task status
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      // Also update sprint task status
      await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status: newStatus,
        }),
      })
      
      fetchSprint()
    } catch (error) {
      console.error('Error updating task:', error)
      fetchSprint() // Revert on error
    }
  }

  const handleAddTaskToSprint = async (taskId: string, storyPoints?: number) => {
    try {
      await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          story_points: storyPoints || null,
        }),
      })
      setIsAddTaskOpen(false)
      fetchSprint()
    } catch (error) {
      console.error('Error adding task to sprint:', error)
    }
  }

  const handleRemoveTaskFromSprint = async (taskId: string) => {
    try {
      await fetch(`/api/sprints/${sprintId}/tasks?task_id=${taskId}`, {
        method: 'DELETE',
      })
      fetchSprint()
    } catch (error) {
      console.error('Error removing task from sprint:', error)
    }
  }

  // Group tasks by status
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = allTasks.filter(t => t.status === status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  // Get backlog tasks (tasks not in sprint but in project)
  const backlogTasks = availableTasks.filter(t => t.status === 'backlog')

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-muted-foreground">Loading sprint...</div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="p-6 md:p-8">
        <EmptyState
          icon={Rocket}
          title="Sprint not found"
          description="The sprint you're looking for doesn't exist"
          action={{
            label: 'Back to Sprints',
            onClick: () => router.push('/sprints'),
          }}
        />
      </div>
    )
  }

  const totalPoints = sprintTasks.reduce((sum, st) => sum + (st.story_points || 0), 0)

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/sprints')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sprints
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">{sprint.name}</h1>
            {sprint.description && (
              <p className="text-muted-foreground mb-4">{sprint.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d, yyyy')}
                </span>
              </div>
              <Badge variant={sprint.status === 'active' ? 'default' : 'outline'}>
                {sprint.status}
              </Badge>
              <span>{sprintTasks.length} tasks</span>
              <span>{totalPoints} points</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button onClick={() => setIsNewTaskOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Sprint Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Backlog Column */}
          <div className="flex-shrink-0 w-80">
            <KanbanColumn
              id="backlog"
              title="Backlog"
              tasks={backlogTasks}
              onDeleteTask={async (taskId) => {
                try {
                  await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
                  fetchSprint()
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

          {/* Sprint Status Columns */}
          {STATUSES.map((status) => {
            const tasks = tasksByStatus[status] || []
            return (
              <div key={status} className="flex-shrink-0 w-80">
                <KanbanColumn
                  id={status}
                  title={status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  tasks={tasks}
                  onDeleteTask={async (taskId) => {
                    try {
                      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
                      fetchSprint()
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

      {/* New Task Dialog */}
      <NewTaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultProjectId={sprint.project_id}
        onTaskCreated={() => {
          fetchSprint()
          fetchAvailableTasks()
        }}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onTaskUpdated={fetchSprint}
          onTaskDeleted={fetchSprint}
        />
      )}

      {/* Add Task to Sprint Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Task to Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {availableTasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No available tasks to add
              </div>
            ) : (
              availableTasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Label htmlFor={`points-${task.id}`} className="text-xs">
                      Story Points:
                    </Label>
                    <Input
                      id={`points-${task.id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={taskStoryPoints[task.id] || ''}
                      onChange={(e) => setTaskStoryPoints({
                        ...taskStoryPoints,
                        [task.id]: e.target.value
                      })}
                      placeholder="0"
                      className="w-20 h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const points = taskStoryPoints[task.id]
                        handleAddTaskToSprint(
                          task.id,
                          points ? parseFloat(points) : undefined
                        )
                        setTaskStoryPoints({
                          ...taskStoryPoints,
                          [task.id]: ''
                        })
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
