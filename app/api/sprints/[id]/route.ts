import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/sprints/[id] - Get a single sprint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        sprint_tasks: {
          include: {
            task: {
              include: {
                project: true,
                dependencies: {
                  include: {
                    depends_on_task: true,
                  },
                },
                blocking_tasks: {
                  include: {
                    task: true,
                  },
                },
                subtasks: {
                  where: { archived: false },
                },
                parent_task: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        velocity_metrics: {
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: { sprint_tasks: true },
        },
      },
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Calculate total story points
    const totalPoints = sprint.sprint_tasks.reduce(
      (sum, st) => sum + (st.story_points || 0),
      0
    )

    return NextResponse.json({
      ...sprint,
      total_points: totalPoints,
    })
  } catch (error) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sprint' },
      { status: 500 }
    )
  }
}

// PATCH /api/sprints/[id] - Update a sprint
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, start_date, end_date, status } = body

    // Build update data object
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Sprint name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (start_date !== undefined) {
      const startDate = new Date(start_date)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start_date format' },
          { status: 400 }
        )
      }
      updateData.start_date = startDate
    }

    if (end_date !== undefined) {
      const endDate = new Date(end_date)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end_date format' },
          { status: 400 }
        )
      }
      updateData.end_date = endDate
    }

    if (status !== undefined) {
      if (!['planned', 'active', 'completed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: planned, active, or completed' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    // Validate date range if both dates are being updated
    if (updateData.start_date && updateData.end_date) {
      if (updateData.start_date >= updateData.end_date) {
        return NextResponse.json(
          { error: 'end_date must be after start_date' },
          { status: 400 }
        )
      }
    }

    const sprint = await prisma.sprint.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: true,
        sprint_tasks: {
          include: {
            task: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { sprint_tasks: true },
        },
      },
    })

    // Calculate total story points
    const totalPoints = sprint.sprint_tasks.reduce(
      (sum, st) => sum + (st.story_points || 0),
      0
    )

    return NextResponse.json({
      ...sprint,
      total_points: totalPoints,
    })
  } catch (error: any) {
    console.error('Error updating sprint:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update sprint' },
      { status: 500 }
    )
  }
}

// DELETE /api/sprints/[id] - Delete a sprint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { sprint_tasks: true },
        },
      },
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Delete sprint (cascade will delete associated sprint_tasks and velocity_metrics)
    await prisma.sprint.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: `Sprint "${sprint.name}" and ${sprint._count.sprint_tasks} associated task(s) deleted`,
    })
  } catch (error: any) {
    console.error('Error deleting sprint:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete sprint' },
      { status: 500 }
    )
  }
}
