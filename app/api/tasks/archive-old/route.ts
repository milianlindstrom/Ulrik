import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subDays } from 'date-fns'

// POST /api/tasks/archive-old - Archive tasks completed 7+ days ago
export async function POST() {
  try {
    const sevenDaysAgo = subDays(new Date(), 7)

    const result = await prisma.task.updateMany({
      where: {
        status: 'done',
        archived: false,
        updated_at: {
          lt: sevenDaysAgo,
        },
      },
      data: {
        archived: true,
      },
    })

    return NextResponse.json({
      success: true,
      archivedCount: result.count,
      message: `Archived ${result.count} tasks completed 7+ days ago`,
    })
  } catch (error) {
    console.error('Error archiving old tasks:', error)
    return NextResponse.json(
      { error: 'Failed to archive old tasks' },
      { status: 500 }
    )
  }
}
