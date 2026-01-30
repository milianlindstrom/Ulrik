import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/recurring/pending-briefings - Get pending AI briefings
// This is a dedicated endpoint for get_pending_briefings
export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Error fetching pending briefings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending briefings' },
      { status: 500 }
    )
  }
}
