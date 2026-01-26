'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Task } from '@/lib/types'
import { Clock, Calendar, Trash2, Archive, Copy, Edit2, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface TaskDetailsModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: () => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskDetailsModal({ task, open, onOpenChange, onTaskUpdated, onTaskDeleted }: TaskDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Task>>({})

  useEffect(() => {
    if (task) {
      setFormData(task)
      setIsEditing(false)
    }
  }, [task])

  if (!task) return null

  const handleSave = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          project: formData.project,
          estimated_hours: formData.estimated_hours,
          due_date: formData.due_date,
        }),
      })
      setIsEditing(false)
      onTaskUpdated()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })
      onOpenChange(false)
      onTaskDeleted(task.id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleArchive = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      onOpenChange(false)
      onTaskUpdated()
    } catch (error) {
      console.error('Error archiving task:', error)
    }
  }

  const handleDuplicate = async () => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${task.title} (Copy)`,
          description: task.description,
          status: 'backlog',
          priority: task.priority,
          project: task.project,
          estimated_hours: task.estimated_hours,
        }),
      })
      onTaskUpdated()
    } catch (error) {
      console.error('Error duplicating task:', error)
    }
  }

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const statusColors = {
    backlog: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    todo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'in-progress': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    review: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    done: 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-lg font-semibold"
                />
              ) : (
                task.title
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as any })}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Badge variant="outline" className={cn('text-sm', statusColors[task.status])}>
                  {task.status}
                </Badge>
                <Badge variant="outline" className={cn('text-sm', priorityColors[task.priority])}>
                  {task.priority} priority
                </Badge>
              </>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            {isEditing ? (
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                placeholder="Add a description..."
              />
            ) : task.description ? (
              <div className="prose prose-sm prose-invert max-w-none bg-muted/30 p-4 rounded-lg">
                <ReactMarkdown>{task.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description</p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              {isEditing ? (
                <Input
                  value={formData.project || ''}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="e.g., Clyqra"
                />
              ) : (
                <div className="text-sm">
                  {task.project ? (
                    <Badge variant="outline">{task.project}</Badge>
                  ) : (
                    <span className="text-muted-foreground">No project</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || null })}
                  placeholder="0"
                />
              ) : (
                <div className="text-sm flex items-center gap-1">
                  {task.estimated_hours ? (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {task.estimated_hours}h
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not estimated</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Due Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.due_date ? format(new Date(formData.due_date), 'yyyy-MM-dd') : ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value || null })}
                />
              ) : (
                <div className="text-sm flex items-center gap-1">
                  {task.due_date ? (
                    <>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(task.due_date), 'MMMM dd, yyyy')}
                    </>
                  ) : (
                    <span className="text-muted-foreground">No due date</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span>{format(new Date(task.created_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last updated</span>
              <span>{format(new Date(task.updated_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </div>
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
