import { NextRequest } from 'next/server'
import { prisma } from './db'
import * as crypto from 'crypto'

// Hash the API key for comparison
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Validate API key from request
export async function validateApiKey(request: NextRequest): Promise<boolean> {
  // Skip authentication in development if REQUIRE_AUTH is not set
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.REQUIRE_AUTH !== 'true'
  ) {
    return true
  }

  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const apiKey = authHeader.slice(7) // Remove 'Bearer ' prefix
  const keyHash = hashApiKey(apiKey)

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key_hash: keyHash },
    })

    if (!key) {
      return false
    }

    // Update last_used_at
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { last_used_at: new Date() },
    })

    return true
  } catch (error) {
    console.error('Error validating API key:', error)
    return false
  }
}

// Middleware to protect API routes
export async function requireAuth(request: NextRequest) {
  const isValid = await validateApiKey(request)

  if (!isValid) {
    return {
      authenticated: false,
      error: 'Invalid or missing API key',
      status: 401,
    }
  }

  return { authenticated: true }
}
