import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/sprints/[id]/tasks - Add a task to a sprint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { task_id, story_points, order, status } = body

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      )
    }

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

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: task_id },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if task is already in sprint
    const existing = await prisma.sprintTask.findFirst({
      where: {
        sprint_id: params.id,
        task_id: task_id,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Task is already in this sprint' },
        { status: 400 }
      )
    }

    // Get max order if not provided
    let taskOrder = order
    if (taskOrder === undefined) {
      const maxOrder = await prisma.sprintTask.findFirst({
        where: { sprint_id: params.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      taskOrder = maxOrder ? maxOrder.order + 1 : 0
    }

    const sprintTask = await prisma.sprintTask.create({
      data: {
        sprint_id: params.id,
        task_id: task_id,
        story_points: story_points || null,
        order: taskOrder,
        status: status || 'todo',
      },
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
        sprint: true,
      },
    })

    return NextResponse.json(sprintTask, { status: 201 })
  } catch (error: any) {
    console.error('Error adding task to sprint:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Task is already in this sprint' },
        { status: 400 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid sprint_id or task_id' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add task to sprint' },
      { status: 500 }
    )
  }
}

// PATCH /api/sprints/[id]/tasks - Update a task in a sprint
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { task_id, story_points, order, status } = body

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}

    if (story_points !== undefined) {
      updateData.story_points = story_points === null ? null : Number(story_points)
    }

    if (order !== undefined) {
      updateData.order = Number(order)
    }

    if (status !== undefined) {
      updateData.status = status
    }

    // Find the sprint task first
    const existingSprintTask = await prisma.sprintTask.findFirst({
      where: {
        sprint_id: params.id,
        task_id: task_id,
      },
    })

    if (!existingSprintTask) {
      return NextResponse.json(
        { error: 'Task not found in sprint' },
        { status: 404 }
      )
    }

    const sprintTask = await prisma.sprintTask.update({
      where: {
        id: existingSprintTask.id,
      },
      data: updateData,
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
        sprint: true,
      },
    })

    return NextResponse.json(sprintTask)
  } catch (error: any) {
    console.error('Error updating sprint task:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Task not found in sprint' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update sprint task' },
      { status: 500 }
    )
  }
}

// DELETE /api/sprints/[id]/tasks - Remove a task from a sprint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const task_id = searchParams.get('task_id')

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id query parameter is required' },
        { status: 400 }
      )
    }

    // Check if sprint task exists
    const sprintTask = await prisma.sprintTask.findFirst({
      where: {
        sprint_id: params.id,
        task_id: task_id,
      },
    })

    if (!sprintTask) {
      return NextResponse.json(
        { error: 'Task not found in sprint' },
        { status: 404 }
      )
    }

    await prisma.sprintTask.delete({
      where: {
        id: sprintTask.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Task removed from sprint',
    })
  } catch (error: any) {
    console.error('Error removing task from sprint:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Task not found in sprint' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to remove task from sprint' },
      { status: 500 }
    )
  }
}
