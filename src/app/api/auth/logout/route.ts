import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, clearSessionCookie, deleteRequestSession } from '@/lib/auth'
import { apiError } from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await deleteRequestSession(request)
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    return apiError(error)
  }
}
