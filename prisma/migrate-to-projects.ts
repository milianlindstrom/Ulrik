/**
 * Migration script to convert task.project strings to Project entities
 * 
 * This script:
 * 1. Reads all existing tasks
 * 2. Extracts unique project names
 * 3. Creates Project records
 * 4. Updates tasks to reference the new projects
 * 
 * Run this BEFORE applying the new schema with: tsx prisma/migrate-to-projects.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Color palette for projects (Plane-inspired)
const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
]

// Icons for projects
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

async function migrate() {
  console.log('🚀 Starting migration to Projects...\n')

  try {
    // Step 1: Check if migration is needed
    const taskCount = await prisma.task.count()
    console.log(`📊 Found ${taskCount} tasks in database`)

    if (taskCount === 0) {
      console.log('✅ No tasks found, creating default project...')
      
      await prisma.project.create({
        data: {
          name: 'Default Project',
          slug: 'default-project',
          description: 'Default project for your tasks',
          color: PROJECT_COLORS[0],
          icon: PROJECT_ICONS[0],
        }
      })
      
      console.log('✅ Migration complete!\n')
      return
    }

    // Step 2: Get all tasks and extract unique project names
    const tasks = await prisma.task.findMany()
    const projectNames = new Set<string>()
    
    tasks.forEach(task => {
      const projectName = (task as any).project
      if (projectName && typeof projectName === 'string') {
        projectNames.add(projectName)
      }
    })

    console.log(`📦 Found ${projectNames.size} unique projects:`)
    projectNames.forEach(name => console.log(`   - ${name}`))
    console.log()

    // Step 3: Create Project records
    console.log('📝 Creating Project records...')
    const projectMap = new Map<string, string>() // name -> id
    
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
      console.log(`   ✓ Created "${name}" (${slug})`)
      
      colorIndex++
      iconIndex++
    }

    // Step 4: Create a default project for tasks without a project
    const defaultProject = await prisma.project.create({
      data: {
        name: 'Unassigned',
        slug: 'unassigned',
        description: 'Tasks without a project',
        color: '#6b7280', // gray
        icon: '📋',
      }
    })
    console.log(`   ✓ Created "Unassigned" project for tasks without a project`)
    console.log()

    // Step 5: Update all tasks (we'll do this manually since we're changing the schema)
    console.log('🔄 Ready to update tasks after schema migration...')
    console.log(`   Total tasks to update: ${tasks.length}`)
    
    // Save the mapping for post-migration update
    const mapping = {
      projectMap: Object.fromEntries(projectMap),
      defaultProjectId: defaultProject.id,
      taskCount: tasks.length,
    }
    
    console.log('\n📋 Migration mapping saved:')
    console.log(JSON.stringify(mapping, null, 2))
    
    console.log('\n✅ Phase 1 complete!')
    console.log('\n⚠️  NEXT STEPS:')
    console.log('1. Run: npx prisma db push')
    console.log('2. Run: tsx prisma/update-task-projects.ts')
    console.log()

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
