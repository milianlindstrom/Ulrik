import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as crypto from 'crypto'

// Generate a random API key
function generateApiKey(): string {
  return 'ulk_' + crypto.randomBytes(24).toString('hex')
}

// Hash the API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// GET /api/auth/api-keys - List all API keys (without the actual keys)
export async function GET(request: NextRequest) {
  try {
    const keys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        created_at: true,
        last_used_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(keys)
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

// POST /api/auth/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    // Generate a new API key
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)

    const key = await prisma.apiKey.create({
      data: {
        name: body.name,
        key_hash: keyHash,
      },
    })

    // Return the plaintext key only once
    return NextResponse.json({
      id: key.id,
      name: key.name,
      created_at: key.created_at,
      api_key: apiKey, // Only shown once!
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/api-keys/[id] - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    await prisma.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
