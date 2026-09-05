import { listOpenRounds } from '@/server/rounds'
import { requireWatchToken, WatchError, watchErrorResponse } from '@/server/watch-auth'

/** Fetched by the watch so a round is picked from a list, never typed. */
export async function GET(request: Request): Promise<Response> {
  try {
    requireWatchToken(request)
    const rounds = await listOpenRounds()
    return Response.json({
      rounds: rounds.map((round) => ({ code: round.code, n: round.name, d: round.playedOn })),
    })
  } catch (error) {
    if (error instanceof WatchError) return watchErrorResponse()
    console.error(error)
    return Response.json({ ok: false, err: 'internal' }, { status: 500 })
  }
}
