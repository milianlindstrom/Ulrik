import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/recurring/[id] - Update a recurring task template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const updateData: any = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.project_id !== undefined) updateData.project_id = body.project_id
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours
    if (body.active !== undefined) updateData.active = body.active
    
    if (body.recurrence_pattern !== undefined) {
      updateData.recurrence_pattern = body.recurrence_pattern
    }
    
    if (body.recurrence_config !== undefined) {
      updateData.recurrence_config = JSON.stringify(body.recurrence_config)
      
      // Recalculate next generation time if pattern or config changed
      const template = await prisma.recurringTaskTemplate.findUnique({
        where: { id },
      })
      
      if (template) {
        const pattern = body.recurrence_pattern || template.recurrence_pattern
        const config = body.recurrence_config || JSON.parse(template.recurrence_config)
        updateData.next_generation_at = calculateNextGeneration(
          new Date(),
          pattern,
          config
        )
      }
    }

    const template = await prisma.recurringTaskTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error updating recurring template:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update recurring template' },
      { status: 500 }
    )
  }
}

// DELETE /api/recurring/[id] - Delete a recurring task template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await prisma.recurringTaskTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring template:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring template' },
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
