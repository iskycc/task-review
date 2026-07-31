type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  current.count += 1
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey)
  }
  return { allowed: current.count <= limit, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
}

export function requestKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `${scope}:${forwarded ?? request.headers.get('x-real-ip') ?? 'local'}`
}
