import { listChallenges, createChallenge, updateChallenge, type ChallengeInput } from '@/server/catalog'
import { requireAdmin, AdminError, adminErrorResponse } from '@/server/admin-auth'
import { errorResponse, readJson } from '@/server/http'
import { RoundError } from '@/server/rounds'

function parseInput(raw: unknown): ChallengeInput {
  const body = raw as Partial<ChallengeInput>
  if (typeof body?.name !== 'string' || body.name.trim() === '') {
    throw new RoundError('bad_request', 'name is required')
  }
  if (!Array.isArray(body.points) || body.points.length === 0 || body.points.some((p) => typeof p !== 'number')) {
    throw new RoundError('bad_request', 'points must be a non-empty list of numbers')
  }
  if (body.scope !== 'per_hole' && body.scope !== 'per_round') {
    throw new RoundError('bad_request', 'scope must be per_hole or per_round')
  }
  return {
    name: body.name,
    description: body.description ?? '',
    points: body.points,
    scope: body.scope,
    allowTies: Boolean(body.allowTies),
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    const url = new URL(request.url)
    return Response.json(await listChallenges(url.searchParams.get('archived') === 'true'))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    return Response.json(await createChallenge(parseInput(await readJson(request))))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    const body = (await readJson(request)) as { id?: unknown } & Partial<ChallengeInput>
    if (typeof body.id !== 'string') throw new RoundError('bad_request', 'id is required')
    const { id, ...patch } = body
    return Response.json(await updateChallenge(id, patch as Partial<ChallengeInput>))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}
