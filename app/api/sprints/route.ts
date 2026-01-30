import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/sprints - List all sprints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    const sprints = await prisma.sprint.findMany({
      where: {
        ...(projectId && { project_id: projectId }),
        ...(status && { status }),
      },
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
      orderBy: {
        start_date: 'desc',
      },
    })

    // Calculate total story points for each sprint
    const sprintsWithPoints = sprints.map((sprint) => {
      const totalPoints = sprint.sprint_tasks.reduce(
        (sum, st) => sum + (st.story_points || 0),
        0
      )
      return {
        ...sprint,
        total_points: totalPoints,
      }
    })

    return NextResponse.json(sprintsWithPoints)
  } catch (error) {
    console.error('Error fetching sprints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sprints' },
      { status: 500 }
    )
  }
}

// POST /api/sprints - Create a new sprint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, start_date, end_date, status, project_id } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sprint name is required' },
        { status: 400 }
      )
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'end_date must be after start_date' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: project_id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status: status || 'planned',
        project_id,
      },
      include: {
        project: true,
        sprint_tasks: true,
        _count: {
          select: { sprint_tasks: true },
        },
      },
    })

    return NextResponse.json(sprint, { status: 201 })
  } catch (error: any) {
    console.error('Error creating sprint:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid project_id' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create sprint' },
      { status: 500 }
    )
  }
}
