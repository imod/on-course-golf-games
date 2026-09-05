import { timingSafeEqual } from 'node:crypto'

export class AdminError extends Error {
  constructor() {
    super('admin password required')
    this.name = 'AdminError'
  }
}

/** Constant-time comparison that cannot throw on a length mismatch. */
export function secretsMatch(expected: string | undefined, supplied: string | null): boolean {
  if (!expected || !supplied) return false

  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Throws AdminError unless the request carries the shared admin password. */
export function requireAdmin(request: Request): void {
  if (!secretsMatch(process.env.ADMIN_PASSWORD, request.headers.get('x-admin-password'))) {
    throw new AdminError()
  }
}

export function adminErrorResponse(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}
