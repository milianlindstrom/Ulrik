'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Repeat, Play, Pause, Trash2, Edit2, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { Project, RecurringTaskTemplate } from '@/lib/types'

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RecurringTaskTemplate | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    estimated_hours: '',
    recurrence_pattern: 'daily',
    day_of_week: '1',
    day_of_month: '1',
    time: '09:00',
    active: true,
  })

  useEffect(() => {
    fetchTemplates()
    fetchProjects()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/recurring')
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleCreate = async () => {
    try {
      const config: any = { time: formData.time }
      if (formData.recurrence_pattern === 'weekly') {
        config.day_of_week = parseInt(formData.day_of_week)
      } else if (formData.recurrence_pattern === 'monthly') {
        config.day_of_month = parseInt(formData.day_of_month)
      }

      await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id,
          priority: formData.priority,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          recurrence_pattern: formData.recurrence_pattern,
          recurrence_config: config,
          active: formData.active,
        }),
      })
      
      setShowCreateModal(false)
      resetForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingTemplate) return

    try {
      const config: any = { time: formData.time }
      if (formData.recurrence_pattern === 'weekly') {
        config.day_of_week = parseInt(formData.day_of_week)
      } else if (formData.recurrence_pattern === 'monthly') {
        config.day_of_month = parseInt(formData.day_of_month)
      }

      await fetch(`/api/recurring/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id,
          priority: formData.priority,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          recurrence_pattern: formData.recurrence_pattern,
          recurrence_config: config,
          active: formData.active,
        }),
      })
      
      setEditingTemplate(null)
      resetForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error updating template:', error)
    }
  }

  const handleToggleActive = async (template: RecurringTaskTemplate) => {
    try {
      await fetch(`/api/recurring/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !template.active }),
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error toggling template:', error)
    }
  }

  const handleDelete = async (template: RecurringTaskTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.title}"?`)) return

    try {
      await fetch(`/api/recurring/${template.id}`, {
        method: 'DELETE',
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleTriggerGeneration = async (template: RecurringTaskTemplate) => {
    try {
      await fetch('/api/recurring/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template.id }),
      })
      alert('Task generated successfully!')
      fetchTemplates()
    } catch (error) {
      console.error('Error generating task:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      priority: 'medium',
      estimated_hours: '',
      recurrence_pattern: 'daily',
      day_of_week: '1',
      day_of_month: '1',
      time: '09:00',
      active: true,
    })
  }

  const openEditModal = (template: RecurringTaskTemplate) => {
    const config = JSON.parse(template.recurrence_config as any)
    setFormData({
      title: template.title,
      description: template.description || '',
      project_id: template.project_id,
      priority: template.priority,
      estimated_hours: template.estimated_hours?.toString() || '',
      recurrence_pattern: template.recurrence_pattern,
      day_of_week: config.day_of_week?.toString() || '1',
      day_of_month: config.day_of_month?.toString() || '1',
      time: config.time || '09:00',
      active: template.active,
    })
    setEditingTemplate(template)
  }

  const getRecurrenceDescription = (template: RecurringTaskTemplate) => {
    const config = JSON.parse(template.recurrence_config as any)
    const time = config.time || '09:00'

    switch (template.recurrence_pattern) {
      case 'daily':
        return `Every day at ${time}`
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Every ${days[config.day_of_week || 1]} at ${time}`
      case 'monthly':
        return `Every month on day ${config.day_of_month || 1} at ${time}`
      default:
        return 'Custom schedule'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Repeat className="h-8 w-8" />
            Recurring Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage task templates that automatically generate on a schedule
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const project = projects.find((p) => p.id === template.project_id)
          return (
            <Card key={template.id} className={!template.active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.title}
                    {!template.active && (
                      <Badge variant="outline" className="text-xs">Paused</Badge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(template)}
                  >
                    {template.active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {project && (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: project.color + '40',
                        backgroundColor: project.color + '10',
                        color: project.color,
                      }}
                    >
                      {project.icon} {project.name}
                    </Badge>
                  )}
                  <Badge variant="outline">{template.priority}</Badge>
                  {template.estimated_hours && (
                    <Badge variant="outline">{template.estimated_hours}h</Badge>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {getRecurrenceDescription(template)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Next: {format(new Date(template.next_generation_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTriggerGeneration(template)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Generate Now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(template)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {templates.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Repeat className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No recurring tasks yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a template to automatically generate tasks on a schedule
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false)
            setEditingTemplate(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit' : 'Create'} Recurring Task Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Daily Standup"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.icon} {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Recurrence Pattern *</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.recurrence_pattern === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.recurrence_pattern === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingTemplate(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
