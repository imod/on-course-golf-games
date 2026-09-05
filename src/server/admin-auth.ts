import { timingSafeEqual } from 'node:crypto'

export class AdminError extends Error {
  constructor() {
    super('admin password required')
    this.name = 'AdminError'
  }
}

/** Throws AdminError unless the request carries the shared admin password. */
export function requireAdmin(request: Request): void {
  const expected = process.env.ADMIN_PASSWORD
  const supplied = request.headers.get('x-admin-password')
  if (!expected || !supplied) throw new AdminError()

  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AdminError()
}

export function adminErrorResponse(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}
