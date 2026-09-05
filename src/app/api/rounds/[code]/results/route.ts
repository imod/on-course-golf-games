import { RoundError, submitResult } from '@/server/rounds'
import { notifyRoundChanged } from '@/server/realtime'
import { errorResponse, readJson } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

type Body = {
  roundChallengeId: string
  hole: number | null
  placements: string[][]
}

function parseBody(raw: unknown): Body {
  const body = raw as Partial<Body>
  if (typeof body?.roundChallengeId !== 'string') {
    throw new RoundError('bad_request', 'roundChallengeId is required')
  }
  if (body.hole !== null && typeof body.hole !== 'number') {
    throw new RoundError('bad_request', 'hole must be a number or null')
  }
  if (
    !Array.isArray(body.placements) ||
    body.placements.some((group) => !Array.isArray(group) || group.some((id) => typeof id !== 'string'))
  ) {
    throw new RoundError('bad_request', 'placements must be an array of arrays of player ids')
  }
  return { roundChallengeId: body.roundChallengeId, hole: body.hole ?? null, placements: body.placements }
}

export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const { code } = await params
    const body = parseBody(await readJson(request))
    const state = await submitResult(code, { ...body, device: 'web' })
    await notifyRoundChanged(state.code)
    return Response.json(state)
  } catch (error) {
    return errorResponse(error)
  }
}
