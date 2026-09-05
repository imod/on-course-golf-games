import { secretsMatch } from './admin-auth'

export class WatchError extends Error {
  constructor() {
    super('watch token required')
    this.name = 'WatchError'
  }
}

/**
 * The watch's credential. It grants exactly two things: listing open rounds
 * and writing results. It is deliberately NOT the admin password, which also
 * grants catalog writes.
 */
export function requireWatchToken(request: Request): void {
  if (!secretsMatch(process.env.WATCH_TOKEN, request.headers.get('x-watch-token'))) {
    throw new WatchError()
  }
}

export function watchErrorResponse(): Response {
  return Response.json({ ok: false, err: 'unauthorized' }, { status: 401 })
}
