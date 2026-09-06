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

/**
 * True when the admin surface is deliberately left open — no password on the
 * catalog or on round creation.
 *
 * This is a temporary, explicit opt-in: it must be switched on by setting
 * ADMIN_OPEN to exactly "true", and anything else (including the variable
 * being absent, empty, or misspelled) keeps the password required. Defaulting
 * to open on a missing variable is how a config mistake silently unlocks a
 * deployment, so it is deliberately not done that way.
 *
 * To re-enable the password later: delete ADMIN_OPEN and redeploy. No code
 * change needed.
 */
export function adminIsOpen(): boolean {
  return process.env.ADMIN_OPEN === 'true'
}

/** Throws AdminError unless the request carries the shared admin password. */
export function requireAdmin(request: Request): void {
  if (adminIsOpen()) return

  if (!secretsMatch(process.env.ADMIN_PASSWORD, request.headers.get('x-admin-password'))) {
    throw new AdminError()
  }
}

export function adminErrorResponse(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}
