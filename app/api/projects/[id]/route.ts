import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, color, icon, archived } = body

    // Build update data object
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Project name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
      
      // Update slug if name changes
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (color !== undefined) {
      updateData.color = color
    }

    if (icon !== undefined) {
      updateData.icon = icon
    }

    if (archived !== undefined) {
      updateData.archived = Boolean(archived)
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Error updating project:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete a project (with cascade to tasks)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project (cascade will delete associated tasks due to onDelete: Cascade)
    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" and ${project._count.tasks} associated task(s) deleted`,
    })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
