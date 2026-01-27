import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/recurring - List all recurring task templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active_only = searchParams.get('active') === 'true'

    const templates = await prisma.recurringTaskTemplate.findMany({
      where: active_only ? { active: true } : undefined,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching recurring templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring templates' },
      { status: 500 }
    )
  }
}

// POST /api/recurring - Create a new recurring task template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || !body.project_id || !body.recurrence_pattern) {
      return NextResponse.json(
        {
          error: 'title, project_id, and recurrence_pattern are required',
        },
        { status: 400 }
      )
    }

    // Calculate next_generation_at based on pattern and config
    const nextGenerationAt = calculateNextGeneration(
      new Date(),
      body.recurrence_pattern,
      body.recurrence_config || {}
    )

    const template = await prisma.recurringTaskTemplate.create({
      data: {
        title: body.title,
        description: body.description || null,
        project_id: body.project_id,
        priority: body.priority || 'medium',
        estimated_hours: body.estimated_hours || null,
        recurrence_pattern: body.recurrence_pattern,
        recurrence_config: JSON.stringify(body.recurrence_config || {}),
        active: body.active !== undefined ? body.active : true,
        next_generation_at: nextGenerationAt,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    console.error('Error creating recurring template:', error)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid project_id' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create recurring template' },
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
      const dayOfWeek = config.day_of_week || 1 // Default to Monday
      const daysUntilNext = (dayOfWeek - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntilNext)
      break
    case 'monthly':
      const dayOfMonth = config.day_of_month || 1
      next.setMonth(next.getMonth() + 1)
      next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      break
    default:
      // Custom or unknown pattern - default to next day
      next.setDate(next.getDate() + 1)
  }

  // Set time if provided
  if (config.time) {
    const [hours, minutes] = config.time.split(':').map(Number)
    next.setHours(hours, minutes, 0, 0)
  } else {
    // Default to 9 AM
    next.setHours(9, 0, 0, 0)
  }

  return next
}
