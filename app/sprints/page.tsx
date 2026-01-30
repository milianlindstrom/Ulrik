'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Calendar, Rocket, CheckCircle2, Clock, Play } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Sprint, Project, SprintStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useProject } from '@/contexts/project-context'

export default function SprintsPage() {
  const [sprints, setSprints] = useState<(Sprint & { total_points?: number })[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    project_id: '',
    status: 'planned' as SprintStatus,
  })
  const { selectedProjectId } = useProject()
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchSprints()
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
      // Set default project if one is selected
      if (selectedProjectId && selectedProjectId !== 'all' && !formData.project_id) {
        setFormData(prev => ({ ...prev, project_id: selectedProjectId }))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchSprints = async () => {
    try {
      const url = selectedProjectId && selectedProjectId !== 'all'
        ? `/api/sprints?project_id=${selectedProjectId}`
        : '/api/sprints'
      const res = await fetch(url)
      const data = await res.json()
      setSprints(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching sprints:', error)
    }
  }

  const handleOpenDialog = (sprint?: Sprint) => {
    if (sprint) {
      setEditingSprint(sprint)
      setFormData({
        name: sprint.name,
        description: sprint.description || '',
        start_date: sprint.start_date ? format(new Date(sprint.start_date), 'yyyy-MM-dd') : '',
        end_date: sprint.end_date ? format(new Date(sprint.end_date), 'yyyy-MM-dd') : '',
        project_id: sprint.project_id,
        status: sprint.status,
      })
    } else {
      setEditingSprint(null)
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        project_id: selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : '',
        status: 'planned',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingSprint) {
        // Update existing sprint
        await fetch(`/api/sprints/${editingSprint.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        // Create new sprint
        await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setIsDialogOpen(false)
      fetchSprints()
    } catch (error) {
      console.error('Error saving sprint:', error)
    }
  }

  const handleDelete = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint?')) return

    try {
      await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      })
      fetchSprints()
    } catch (error) {
      console.error('Error deleting sprint:', error)
    }
  }

  const getStatusBadge = (status: SprintStatus) => {
    const variants: Record<SprintStatus, { variant: 'default' | 'secondary' | 'outline', icon: typeof CheckCircle2 }> = {
      planned: { variant: 'outline', icon: Clock },
      active: { variant: 'default', icon: Play },
      completed: { variant: 'secondary', icon: CheckCircle2 },
    }
    const { variant, icon: Icon } = variants[status]
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredSprints = sprints.filter(s => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      return s.project_id === selectedProjectId
    }
    return true
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Sprints</h1>
          <p className="text-muted-foreground">
            Manage your sprint planning and track velocity
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      {filteredSprints.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No sprints yet"
          description="Create your first sprint to start planning your work"
          action={{
            label: 'Create Sprint',
            onClick: () => handleOpenDialog(),
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredSprints.map((sprint) => {
            const project = projects.find(p => p.id === sprint.project_id)
            return (
              <Card
                key={sprint.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/sprint/${sprint.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{sprint.name}</CardTitle>
                        {getStatusBadge(sprint.status)}
                      </div>
                      {sprint.description && (
                        <CardDescription className="mt-1">
                          {sprint.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDialog(sprint)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(sprint.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Start</div>
                        <div className="font-medium">
                          {format(new Date(sprint.start_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">End</div>
                        <div className="font-medium">
                          {format(new Date(sprint.end_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Tasks</div>
                      <div className="font-medium">
                        {sprint._count?.sprint_tasks || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Story Points</div>
                      <div className="font-medium">
                        {sprint.total_points || 0}
                      </div>
                    </div>
                  </div>
                  {project && (
                    <div className="mt-4 pt-4 border-t">
                      <Badge variant="outline" className="text-xs">
                        {project.name}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSprint ? 'Edit Sprint' : 'Create Sprint'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Sprint 1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Sprint goals and focus areas..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="project_id">Project *</Label>
              <select
                id="project_id"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SprintStatus })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSprint ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
