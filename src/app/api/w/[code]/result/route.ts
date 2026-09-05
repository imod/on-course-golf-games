import { RoundError, submitResult } from '@/server/rounds'
import { notifyRoundChanged } from '@/server/realtime'
import { readJson, STATUS } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

function parseRanks(raw: unknown): string[][] {
  if (!Array.isArray(raw)) {
    throw new RoundError('bad_request', 'ranks must be a list of player ids')
  }

  return raw.map((element) => {
    if (typeof element === 'string') return [element]

    if (
      Array.isArray(element) &&
      element.length > 0 &&
      element.every((id) => typeof id === 'string')
    ) {
      return element as string[]
    }

    throw new RoundError(
      'bad_request',
      'each rank must be a player id, or a non-empty list of ids that tied',
    )
  })
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
    if (body.hole !== null && body.hole !== undefined && typeof body.hole !== 'number') {
      throw new RoundError('bad_request', 'hole must be a number or null')
    }

    const state = await submitResult(code, {
      roundChallengeId: body.rc,
      hole: (body.hole as number | null | undefined) ?? null,
      placements: parseRanks(body.ranks),
      device: 'watch',
    })

    await notifyRoundChanged(state.code)

    return Response.json({
      ok: true,
      standings: state.standings.map((s) => ({ id: s.playerId, p: s.points })),
    })
  } catch (error) {
    if (error instanceof RoundError) {
      // `err` is a short machine code the watch can branch on; the prose goes
      // in `msg`, which a Connect IQ client is free to ignore.
      return Response.json(
        { ok: false, err: error.code, msg: error.message },
        { status: STATUS[error.code] },
      )
    }
    console.error(error)
    return Response.json({ ok: false, err: 'internal' }, { status: 500 })
  }
}
