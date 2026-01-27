import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/recurring/generate - Generate tasks from templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template_id } = body

    let templates

    if (template_id) {
      // Generate for specific template
      const template = await prisma.recurringTaskTemplate.findUnique({
        where: { id: template_id },
      })
      templates = template ? [template] : []
    } else {
      // Generate for all active templates that are due
      templates = await prisma.recurringTaskTemplate.findMany({
        where: {
          active: true,
          next_generation_at: {
            lte: new Date(),
          },
        },
      })
    }

    const generatedTasks = []

    for (const template of templates) {
      try {
        const config = JSON.parse(template.recurrence_config)

        // Create the task
        const task = await prisma.task.create({
          data: {
            title: template.title,
            description: template.description,
            project_id: template.project_id,
            priority: template.priority,
            estimated_hours: template.estimated_hours,
            status: 'todo',
            is_recurring: true,
            recurring_template_id: template.id,
            recurrence_instance_date: new Date(),
            needs_ai_briefing: true, // Flag for AI acknowledgment
          },
          include: {
            project: true,
            recurring_template: true,
          },
        })

        generatedTasks.push(task)

        // Update template with next generation time
        const nextGenerationAt = calculateNextGeneration(
          template.next_generation_at,
          template.recurrence_pattern,
          config
        )

        await prisma.recurringTaskTemplate.update({
          where: { id: template.id },
          data: {
            last_generated_at: new Date(),
            next_generation_at: nextGenerationAt,
          },
        })
      } catch (error) {
        console.error(`Error generating task for template ${template.id}:`, error)
        // Continue with other templates
      }
    }

    return NextResponse.json({
      generated: generatedTasks.length,
      tasks: generatedTasks,
    })
  } catch (error) {
    console.error('Error generating recurring tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate recurring tasks' },
      { status: 500 }
    )
  }
}

// GET /api/recurring/generate - Get pending AI briefings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'pending-briefings') {
      const tasks = await prisma.task.findMany({
        where: {
          needs_ai_briefing: true,
          archived: false,
        },
        include: {
          project: true,
          recurring_template: true,
        },
        orderBy: { created_at: 'asc' },
      })

      return NextResponse.json(tasks)
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching pending briefings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending briefings' },
      { status: 500 }
    )
  }
}

// Helper function to calculate next generation time
function calculateNextGeneration(
  from: Date,
  pattern: string,
  config: any
): Date {
  const next = new Date(from)

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      const dayOfWeek = config.day_of_week || 1
      const daysUntilNext = (dayOfWeek - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntilNext)
      break
    case 'monthly':
      const dayOfMonth = config.day_of_month || 1
      next.setMonth(next.getMonth() + 1)
      next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      break
    default:
      next.setDate(next.getDate() + 1)
  }

  if (config.time) {
    const [hours, minutes] = config.time.split(':').map(Number)
    next.setHours(hours, minutes, 0, 0)
  } else {
    next.setHours(9, 0, 0, 0)
  }

  return next
}
