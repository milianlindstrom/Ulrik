'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Settings } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Project } from '@/lib/types'

interface ProjectSwitcherProps {
  value: string
  onChange: (projectId: string) => void
  className?: string
}

export function ProjectSwitcher({ value, onChange, className }: ProjectSwitcherProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const selectedProject = projects.find(p => p.id === value)

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue>
            <div className="flex items-center gap-2">
              {value === 'all' ? (
                <>
                  <FolderOpen className="h-4 w-4" />
                  <span>All Projects</span>
                </>
              ) : selectedProject ? (
                <>
                  <span>{selectedProject.icon}</span>
                  <span className="truncate">{selectedProject.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedProject._count?.tasks || 0})
                  </span>
                </>
              ) : (
                <span>Select Project</span>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>All Projects</span>
            </div>
          </SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <span>{project.icon}</span>
                <span>{project.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {project._count?.tasks || 0}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/projects')}
        title="Manage Projects"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  )
}
