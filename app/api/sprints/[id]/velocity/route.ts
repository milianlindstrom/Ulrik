import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/sprints/[id]/velocity - Get velocity metrics for a sprint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id: params.id },
      include: {
        sprint_tasks: {
          include: {
            task: true,
          },
        },
      },
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Calculate current metrics
    const plannedPoints = sprint.sprint_tasks.reduce(
      (sum, st) => sum + (st.story_points || 0),
      0
    )

    const completedTasks = sprint.sprint_tasks.filter(
      (st) => st.status === 'done' || st.task.status === 'done'
    )

    const completedPoints = completedTasks.reduce(
      (sum, st) => sum + (st.story_points || 0),
      0
    )

    const totalTasks = sprint.sprint_tasks.length

    // Get or create velocity metric
    let velocityMetric = await prisma.velocityMetric.findFirst({
      where: { sprint_id: params.id },
      orderBy: { created_at: 'desc' },
    })

    if (!velocityMetric) {
      // Create initial velocity metric
      velocityMetric = await prisma.velocityMetric.create({
        data: {
          sprint_id: params.id,
          planned_points: plannedPoints,
          completed_points: completedPoints,
          completed_tasks: completedTasks.length,
          total_tasks: totalTasks,
        },
      })
    } else {
      // Update existing metric
      velocityMetric = await prisma.velocityMetric.update({
        where: { id: velocityMetric.id },
        data: {
          planned_points: plannedPoints,
          completed_points: completedPoints,
          completed_tasks: completedTasks.length,
          total_tasks: totalTasks,
        },
      })
    }

    return NextResponse.json({
      ...velocityMetric,
      // Include calculated values for convenience
      completion_rate: totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0,
      points_completion_rate: plannedPoints > 0 ? (completedPoints / plannedPoints) * 100 : 0,
    })
  } catch (error) {
    console.error('Error fetching velocity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch velocity metrics' },
      { status: 500 }
    )
  }
}

// POST /api/sprints/[id]/velocity - Update velocity metrics (manual override)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { planned_points, completed_points, completed_tasks, total_tasks } = body

    // Verify sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id: params.id },
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Get or create velocity metric
    let velocityMetric = await prisma.velocityMetric.findFirst({
      where: { sprint_id: params.id },
      orderBy: { created_at: 'desc' },
    })

    const updateData: any = {}

    if (planned_points !== undefined) {
      updateData.planned_points = Number(planned_points)
    }

    if (completed_points !== undefined) {
      updateData.completed_points = Number(completed_points)
    }

    if (completed_tasks !== undefined) {
      updateData.completed_tasks = Number(completed_tasks)
    }

    if (total_tasks !== undefined) {
      updateData.total_tasks = Number(total_tasks)
    }

    if (velocityMetric) {
      velocityMetric = await prisma.velocityMetric.update({
        where: { id: velocityMetric.id },
        data: updateData,
      })
    } else {
      velocityMetric = await prisma.velocityMetric.create({
        data: {
          sprint_id: params.id,
          planned_points: planned_points || 0,
          completed_points: completed_points || 0,
          completed_tasks: completed_tasks || 0,
          total_tasks: total_tasks || 0,
        },
      })
    }

    return NextResponse.json(velocityMetric)
  } catch (error) {
    console.error('Error updating velocity:', error)
    return NextResponse.json(
      { error: 'Failed to update velocity metrics' },
      { status: 500 }
    )
  }
}
