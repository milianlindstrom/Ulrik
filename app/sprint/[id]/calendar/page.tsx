'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Task } from '@/lib/types'
import { Sprint, SprintTask } from '@/lib/types'
import { CustomGantt } from '@/components/custom-gantt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Rocket } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function SprintCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const sprintId = params.id as string
  
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editFormData, setEditFormData] = useState({
    start_date: '',
    due_date: '',
  })

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
      const sprintTaskList = st.map((st: SprintTask) => st.task).filter(Boolean)
      setTasks(sprintTaskList)
    } catch (error) {
      console.error('Error fetching sprint:', error)
    } finally {
      setLoading(false)
    }
  }, [sprintId])

  useEffect(() => {
    fetchSprint()
  }, [fetchSprint])

  const handleTaskClick = (task: Task) => {
    setEditingTask(task)
    setEditFormData({
      start_date: task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : '',
      due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateTask = async () => {
    if (!editingTask) return

    try {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: editFormData.start_date || null,
          due_date: editFormData.due_date || null,
        }),
      })
      setIsEditDialogOpen(false)
      setEditingTask(null)
      fetchSprint()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Filter tasks to only show those with dates or estimated hours
  const ganttTasks = tasks.filter(t => 
    (t.start_date && t.due_date) || (t.due_date && t.estimated_hours)
  )

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-muted-foreground">Loading sprint calendar...</div>
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
  const completedPoints = sprintTasks
    .filter(st => st.status === 'done' || st.task?.status === 'done')
    .reduce((sum, st) => sum + (st.story_points || 0), 0)

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/sprint/${sprintId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sprint Board
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">{sprint.name} - Calendar</h1>
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
              <span>{totalPoints} points ({completedPoints} completed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      {ganttTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No tasks with dates to display. Add start dates and due dates to tasks to see them on the timeline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <CustomGantt tasks={ganttTasks} />
      )}

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sprint Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Points:</span>
              <span className="font-semibold">{totalPoints}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed Points:</span>
              <span className="font-semibold text-emerald-400">{completedPoints}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate:</span>
              <span className="font-semibold">
                {totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Task Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tasks:</span>
              <span className="font-semibold">{sprintTasks.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold text-emerald-400">
                {sprintTasks.filter(st => st.status === 'done' || st.task?.status === 'done').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">In Progress:</span>
              <span className="font-semibold">
                {sprintTasks.filter(st => st.status === 'in-progress' || st.task?.status === 'in-progress').length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sprint Start:</span>
              <span className="font-semibold">
                {format(new Date(sprint.start_date), 'MMM d')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sprint End:</span>
              <span className="font-semibold">
                {format(new Date(sprint.end_date), 'MMM d')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tasks with Dates:</span>
              <span className="font-semibold">{ganttTasks.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Task Dates Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Dates</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Task</Label>
                <Input
                  id="task-title"
                  value={editingTask.title}
                  disabled
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={editFormData.due_date}
                    onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateTask}>
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
