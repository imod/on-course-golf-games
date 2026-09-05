import { RoundError, submitResult } from '@/server/rounds'
import { notifyRoundChanged } from '@/server/realtime'
import { readJson } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

const STATUS: Record<RoundError['code'], number> = {
  not_found: 404,
  finished: 409,
  bad_request: 400,
}

/**
 * One request per entry: the watch sends player ids in finishing order and
 * gets the standings back, so it never needs a second call to show them.
 */
export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  const { code } = await params

  try {
    const parsed = await readJson(request)
    if (typeof parsed !== 'object' || parsed === null) {
      throw new RoundError('bad_request', 'body must be a JSON object')
    }
    const body = parsed as { rc?: unknown; hole?: unknown; ranks?: unknown }

    if (typeof body.rc !== 'string') throw new RoundError('bad_request', 'rc is required')
    if (!Array.isArray(body.ranks) || body.ranks.some((id) => typeof id !== 'string')) {
      throw new RoundError('bad_request', 'ranks must be a list of player ids')
    }
    if (body.hole !== null && body.hole !== undefined && typeof body.hole !== 'number') {
      throw new RoundError('bad_request', 'hole must be a number or null')
    }

    const state = await submitResult(code, {
      roundChallengeId: body.rc,
      hole: (body.hole as number | null | undefined) ?? null,
      placements: (body.ranks as string[]).map((id) => [id]),
      device: 'watch',
    })

    await notifyRoundChanged(state.code)

    return Response.json({
      ok: true,
      standings: state.standings.map((s) => ({ id: s.playerId, p: s.points })),
    })
  } catch (error) {
    if (error instanceof RoundError) {
      return Response.json({ ok: false, err: error.message }, { status: STATUS[error.code] })
    }
    console.error(error)
    return Response.json({ ok: false, err: 'internal' }, { status: 500 })
  }
}
