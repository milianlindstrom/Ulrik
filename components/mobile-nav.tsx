'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from './ui/button'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link
              href="/kanban"
              className="text-sm hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Kanban
            </Link>
            <Link
              href="/gantt"
              className="text-sm hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Gantt
            </Link>
            <Link
              href="/analytics"
              className="text-sm hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Analytics
            </Link>
            <Link
              href="/archive"
              className="text-sm hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Archive
            </Link>
            <div className="pt-2 border-t text-xs text-muted-foreground space-y-2">
              <div>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl/⌘ F</kbd> Search
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl/⌘ K</kbd> Quick Add
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
