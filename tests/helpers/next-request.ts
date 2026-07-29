import { NextRequest } from 'next/server'

export function makeJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  })
}

export function makeUploadRequest(url: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: formData })
}
