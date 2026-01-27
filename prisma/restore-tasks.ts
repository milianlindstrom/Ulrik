/**
 * Restore tasks after schema migration, creating projects
 * Run this AFTER schema push: tsx prisma/restore-tasks.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// Color palette for projects (Plane-inspired)
const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#14b8a6',
]

const PROJECT_ICONS = [
  '📁', '🚀', '💼', '🎯', '⚡', '🔥', '💡', '🌟',
  '🎨', '🔧', '📊', '🎮', '🏗️', '📱', '🌐', '🔬'
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function restore() {
  console.log('🔄 Restoring tasks with projects...\n')

  try {
    // Read backup
    const backupPath = join(__dirname, 'tasks-backup.json')
    const backupData = JSON.parse(readFileSync(backupPath, 'utf-8'))
    
    console.log(`📦 Found ${backupData.length} tasks in backup`)

    if (backupData.length === 0) {
      console.log('✅ No tasks to restore, creating default project...')
      
      await prisma.project.create({
        data: {
          name: 'Default Project',
          slug: 'default-project',
          description: 'Your first project',
          color: PROJECT_COLORS[0],
          icon: PROJECT_ICONS[0],
        }
      })
      
      console.log('✅ Restoration complete!\n')
      return
    }

    // Extract unique project names
    const projectNames = new Set<string>()
    backupData.forEach((task: any) => {
      if (task.project && typeof task.project === 'string') {
        projectNames.add(task.project)
      }
    })

    console.log(`\n📊 Creating ${projectNames.size + 1} projects...`)

    // Create projects
    const projectMap = new Map<string, string>()
    let colorIndex = 0
    let iconIndex = 0

    for (const name of Array.from(projectNames)) {
      const slug = generateSlug(name)
      const color = PROJECT_COLORS[colorIndex % PROJECT_COLORS.length]
      const icon = PROJECT_ICONS[iconIndex % PROJECT_ICONS.length]
      
      const project = await prisma.project.create({
        data: {
          name,
          slug,
          description: `Migrated from existing tasks`,
          color,
          icon,
        }
      })
      
      projectMap.set(name, project.id)
      console.log(`   ✓ ${icon} ${name}`)
      
      colorIndex++
      iconIndex++
    }

    // Create "Unassigned" project for tasks without a project
    const unassignedProject = await prisma.project.create({
      data: {
        name: 'Unassigned',
        slug: 'unassigned',
        description: 'Tasks without a project',
        color: '#6b7280',
        icon: '📋',
      }
    })
    console.log(`   ✓ 📋 Unassigned (default)`)

    // Restore tasks with project references
    console.log(`\n🔄 Restoring ${backupData.length} tasks...`)
    
    let restored = 0
    for (const oldTask of backupData) {
      const projectId = oldTask.project 
        ? projectMap.get(oldTask.project) || unassignedProject.id
        : unassignedProject.id

      // Calculate start_date if due_date exists and estimated_hours
      let startDate = null
      if (oldTask.due_date && oldTask.estimated_hours) {
        const dueDate = new Date(oldTask.due_date)
        const hoursToMs = oldTask.estimated_hours * 60 * 60 * 1000
        const daysBack = Math.ceil(oldTask.estimated_hours / 8) // 8-hour workdays
        startDate = new Date(dueDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      }

      await prisma.task.create({
        data: {
          id: oldTask.id,
          title: oldTask.title,
          description: oldTask.description,
          status: oldTask.status,
          priority: oldTask.priority,
          project_id: projectId,
          start_date: startDate,
          due_date: oldTask.due_date,
          estimated_hours: oldTask.estimated_hours,
          archived: oldTask.archived,
          created_at: oldTask.created_at,
          updated_at: oldTask.updated_at,
        }
      })
      
      restored++
      if (restored % 10 === 0) {
        process.stdout.write(`\r   Progress: ${restored}/${backupData.length}`)
      }
    }
    
    console.log(`\r   ✓ Restored ${restored} tasks`)
    
    console.log('\n✅ Migration complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   Projects: ${projectNames.size + 1}`)
    console.log(`   Tasks: ${restored}`)
    
  } catch (error) {
    console.error('\n❌ Restoration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

restore()
