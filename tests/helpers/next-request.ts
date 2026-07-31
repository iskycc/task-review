import { NextRequest } from 'next/server'

let sessionToken = ''
export function setTestSessionToken(token: string) { sessionToken = token }

function authHeaders(extra?: Record<string, string>) {
  return { ...(sessionToken ? { cookie: `pdf_review_session=${sessionToken}` } : {}), ...extra }
}

export function makeJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: authHeaders(body === undefined ? undefined : { 'content-type': 'application/json' }),
  })
}

export function makeUploadRequest(url: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: formData, headers: authHeaders() })
}

export function makeEmptyUploadRequest(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: new FormData(), headers: authHeaders() })
}
