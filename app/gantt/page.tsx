'use client'

import { useEffect, useState } from 'react'
import { Task } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomGantt } from '@/components/custom-gantt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GanttPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [projects, setProjects] = useState<string[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])

  const fetchTasks = async () => {
    try {
      const url = selectedProject !== 'all' 
        ? `/api/tasks?project=${selectedProject}`
        : '/api/tasks'
      const res = await fetch(url)
      const data = await res.json()
      if (Array.isArray(data)) {
        setTasks(data)
      } else {
        setTasks([])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [selectedProject])

  useEffect(() => {
    // Extract unique projects
    const uniqueProjects = Array.from(
      new Set(tasks.filter(t => t.project).map(t => t.project as string))
    )
    setProjects(uniqueProjects)
    
    // Filter tasks
    if (selectedProject === 'all') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(t => t.project === selectedProject))
    }
  }, [tasks, selectedProject])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gantt Timeline</h1>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CustomGantt tasks={filteredTasks} />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Priority Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-red-500 border-2 border-red-600"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-yellow-500 border-2 border-yellow-600"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-blue-500 border-2 border-blue-600"></div>
              <span className="text-sm">Low Priority</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progress Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-white/20 rounded-sm"></div>
              <span className="text-sm">Backlog (0%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-white/20 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 w-1/4 bg-white/40"></div>
              </div>
              <span className="text-sm">To Do (25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-white/20 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 w-1/2 bg-white/40"></div>
              </div>
              <span className="text-sm">In Progress (50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-white/20 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 w-3/4 bg-white/40"></div>
              </div>
              <span className="text-sm">Review (75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-white/20 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-white/40"></div>
              </div>
              <span className="text-sm">Done (100%)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tasks:</span>
              <span className="font-semibold">{filteredTasks.filter(t => t.due_date && t.estimated_hours).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Hours:</span>
              <span className="font-semibold">
                {filteredTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0).toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold text-green-400">
                {filteredTasks.filter(t => t.status === 'done').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
