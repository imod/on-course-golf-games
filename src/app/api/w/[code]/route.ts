import { getRoundState, RoundError } from '@/server/rounds'
import { STATUS } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

/**
 * Fetched once at the start of a round and cached on the watch. Keys are
 * short deliberately: a Fenix parses JSON slowly and has little memory.
 */
export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  const { code } = await params

  try {
    const state = await getRoundState(code)
    if (!state) return Response.json({ ok: false, err: 'not_found' }, { status: 404 })

    return Response.json({
      round: state.name,
      hole_count: state.holeCount,
      players: state.players.map((p) => ({ id: p.id, n: p.name })),
      challenges: state.challenges.map((c) => ({
        id: c.id,
        n: c.name,
        pts: c.points,
        holes: c.holes,
        bad: c.badPoints,
      })),
    })
  } catch (error) {
    // The watch can only parse {ok, err}: a DB blip must not reach it as
    // Next's HTML error page.
    if (error instanceof RoundError) {
      return Response.json(
        { ok: false, err: error.code, msg: error.message },
        { status: STATUS[error.code] },
      )
    }
    console.error(error)
    return Response.json({ ok: false, err: 'internal' }, { status: 500 })
  }
}
