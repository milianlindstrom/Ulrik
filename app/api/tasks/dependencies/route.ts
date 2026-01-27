import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Add a task dependency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_id, depends_on_task_id } = body

    if (!task_id || !depends_on_task_id) {
      return NextResponse.json(
        { error: 'task_id and depends_on_task_id are required' },
        { status: 400 }
      )
    }

    if (task_id === depends_on_task_id) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      )
    }

    // Check if both tasks exist
    const [task, dependsOnTask] = await Promise.all([
      prisma.task.findUnique({ where: { id: task_id } }),
      prisma.task.findUnique({ where: { id: depends_on_task_id } }),
    ])

    if (!task || !dependsOnTask) {
      return NextResponse.json(
        { error: 'One or both tasks not found' },
        { status: 404 }
      )
    }

    // Check for circular dependencies
    const wouldCreateCircularDependency = await checkCircularDependency(
      depends_on_task_id,
      task_id
    )

    if (wouldCreateCircularDependency) {
      return NextResponse.json(
        { error: 'This would create a circular dependency' },
        { status: 400 }
      )
    }

    // Create the dependency
    const dependency = await prisma.taskDependency.create({
      data: {
        task_id,
        depends_on_task_id,
      },
      include: {
        depends_on_task: true,
      },
    })

    return NextResponse.json(dependency)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This dependency already exists' },
        { status: 400 }
      )
    }
    console.error('Error adding dependency:', error)
    return NextResponse.json(
      { error: 'Failed to add dependency' },
      { status: 500 }
    )
  }
}

// Remove a task dependency
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const task_id = searchParams.get('task_id')
    const depends_on_task_id = searchParams.get('depends_on_task_id')

    if (!task_id || !depends_on_task_id) {
      return NextResponse.json(
        { error: 'task_id and depends_on_task_id are required' },
        { status: 400 }
      )
    }

    const dependency = await prisma.taskDependency.deleteMany({
      where: {
        task_id,
        depends_on_task_id,
      },
    })

    if (dependency.count === 0) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing dependency:', error)
    return NextResponse.json(
      { error: 'Failed to remove dependency' },
      { status: 500 }
    )
  }
}

// Get blocked tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'blocked') {
      // Get all tasks that are blocked by incomplete dependencies
      const tasks = await prisma.task.findMany({
        where: {
          archived: false,
          dependencies: {
            some: {},
          },
        },
        include: {
          dependencies: {
            include: {
              depends_on_task: true,
            },
          },
          project: true,
        },
      })

      // Filter to only tasks with incomplete dependencies
      const blockedTasks = tasks.filter((task) =>
        task.dependencies.some((dep) => dep.depends_on_task.status !== 'done')
      )

      return NextResponse.json(blockedTasks)
    }

    if (action === 'chain') {
      const task_id = searchParams.get('task_id')
      if (!task_id) {
        return NextResponse.json(
          { error: 'task_id is required for chain action' },
          { status: 400 }
        )
      }

      const chain = await getDependencyChain(task_id)
      return NextResponse.json(chain)
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error getting dependencies:', error)
    return NextResponse.json(
      { error: 'Failed to get dependencies' },
      { status: 500 }
    )
  }
}

// Helper function to check for circular dependencies
async function checkCircularDependency(
  taskId: string,
  targetId: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (taskId === targetId) {
    return true
  }

  if (visited.has(taskId)) {
    return false
  }

  visited.add(taskId)

  const dependencies = await prisma.taskDependency.findMany({
    where: { task_id: taskId },
    select: { depends_on_task_id: true },
  })

  for (const dep of dependencies) {
    if (await checkCircularDependency(dep.depends_on_task_id, targetId, visited)) {
      return true
    }
  }

  return false
}

// Helper function to get full dependency chain
async function getDependencyChain(taskId: string): Promise<any> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      dependencies: {
        include: {
          depends_on_task: {
            include: {
              project: true,
            },
          },
        },
      },
      blocking_tasks: {
        include: {
          task: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  })

  if (!task) {
    return null
  }

  // Recursively get dependencies
  const dependsOn = await Promise.all(
    task.dependencies.map(async (dep) => {
      const chain = await getDependencyChain(dep.depends_on_task_id)
      return {
        task: dep.depends_on_task,
        dependencies: chain?.dependsOn || [],
      }
    })
  )

  return {
    task,
    dependsOn,
    blocks: task.blocking_tasks.map((bt) => bt.task),
  }
}
