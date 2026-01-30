'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Filter, Calendar } from 'lucide-react'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { cn } from '@/lib/utils'
import { Task } from '@/lib/types'
import { format, isAfter, isBefore } from 'date-fns'

interface FilterState {
  priority: string
  status: string
  dateFrom: string
  dateTo: string
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    priority: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks')
        const data = await res.json()
        setAllTasks(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching tasks:', error)
      }
    }
    fetchTasks()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K for search (standard command palette shortcut)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      // Also support Cmd/Ctrl+F as alternative
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
        setShowFilters(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let filtered = allTasks

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.project?.name?.toLowerCase().includes(query)
      )
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status)
    }

    // Date range filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(task => {
        if (!task.due_date) return false
        return isAfter(new Date(task.due_date), fromDate) || 
               new Date(task.due_date).toDateString() === fromDate.toDateString()
      })
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      filtered = filtered.filter(task => {
        if (!task.due_date) return false
        return isBefore(new Date(task.due_date), toDate) || 
               new Date(task.due_date).toDateString() === toDate.toDateString()
      })
    }

    setResults(filtered.slice(0, 20)) // Limit to 20 results
  }, [searchQuery, allTasks, filters])

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
    setResults([])
    setShowFilters(false)
    setFilters({
      priority: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    })
  }

  const hasActiveFilters = filters.priority !== 'all' || 
                          filters.status !== 'all' || 
                          filters.dateFrom !== '' || 
                          filters.dateTo !== ''

  const clearFilters = () => {
    setFilters({
      priority: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    })
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={handleClose}>
      <div className="container mx-auto px-4 pt-20" onClick={(e) => e.stopPropagation()}>
        <Card className="max-w-3xl mx-auto">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search tasks by title, description, or project... (Cmd/Ctrl+K)"
                className="pl-10 pr-20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-7 px-2",
                    hasActiveFilters && "bg-primary/10 text-primary"
                  )}
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {[filters.priority !== 'all' ? 1 : 0, filters.status !== 'all' ? 1 : 0, filters.dateFrom ? 1 : 0, filters.dateTo ? 1 : 0].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </Button>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Advanced Filters</Label>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Priority</Label>
                    <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Due From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Due To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {(searchQuery || hasActiveFilters) && (
              <div className="mt-4 max-h-[400px] overflow-y-auto space-y-2">
                {results.length > 0 ? (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">
                      {results.length} result{results.length !== 1 ? 's' : ''} found
                    </div>
                    {results.map((task) => (
                      <a
                        key={task.id}
                        href={`/kanban`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                        onClick={() => handleClose()}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium line-clamp-1">{task.title}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className={cn('status-badge text-xs font-mono', statusColors[task.status])}>
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.project && (
                            <Badge variant="outline" className="text-xs">
                              {task.project.icon} {task.project.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1 inline" />
                              {format(new Date(task.due_date), 'MMM dd, yyyy')}
                            </Badge>
                          )}
                        </div>
                      </a>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No tasks found matching your search and filters
                  </div>
                )}
              </div>
            )}

            {!searchQuery && !hasActiveFilters && (
              <div className="mt-4 text-center py-8 text-sm text-muted-foreground">
                <p>Start typing to search tasks...</p>
                <p className="text-xs mt-2">
                  Press <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> to close
                </p>
                <p className="text-xs mt-1">
                  Use <kbd className="px-1.5 py-0.5 bg-muted rounded">Filters</kbd> for advanced search
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
