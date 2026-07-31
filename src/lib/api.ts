import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'

export function apiError(error: unknown, fallback = '请求失败，请重试') {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
  const candidate = error as { statusCode?: unknown; message?: unknown; details?: unknown }
  if (typeof candidate?.statusCode === 'number' && typeof candidate.message === 'string') {
    return NextResponse.json({ error: candidate.message, ...(candidate.details ? { details: candidate.details } : {}) }, { status: candidate.statusCode })
  }
  console.error('[api] unexpected error:', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
