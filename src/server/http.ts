import { RoundError } from './rounds'

/** Maps a RoundError code onto its HTTP status. One table, used everywhere. */
export const STATUS: Record<RoundError['code'], number> = {
  not_found: 404,
  finished: 409,
  bad_request: 400,
}

export function errorResponse(error: unknown): Response {
  if (error instanceof RoundError) {
    return Response.json({ error: error.message, code: error.code }, { status: STATUS[error.code] })
  }
  console.error(error)
  return Response.json({ error: 'internal error' }, { status: 500 })
}

/** Parses a JSON body, turning malformed input into a 400 rather than a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new RoundError('bad_request', 'body must be JSON')
  }
}
