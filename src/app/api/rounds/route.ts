import { createRound, RoundError, type CreateRoundInput } from '@/server/rounds'
import { requireAdmin, AdminError, adminErrorResponse } from '@/server/admin-auth'
import { errorResponse, readJson } from '@/server/http'

function parseInput(raw: unknown): CreateRoundInput {
  const body = raw as Partial<CreateRoundInput>
  if (typeof body?.name !== 'string' || body.name.trim() === '') {
    throw new RoundError('bad_request', 'name is required')
  }
  if (!Array.isArray(body.playerIds) || body.playerIds.some((id) => typeof id !== 'string')) {
    throw new RoundError('bad_request', 'playerIds must be a list of ids')
  }
  if (!Array.isArray(body.challenges)) {
    throw new RoundError('bad_request', 'challenges must be a list')
  }
  return {
    name: body.name.trim(),
    playedOn: typeof body.playedOn === 'string' ? body.playedOn : undefined,
    holeCount: typeof body.holeCount === 'number' ? body.holeCount : undefined,
    playerIds: body.playerIds,
    challenges: body.challenges,
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    return Response.json(await createRound(parseInput(await readJson(request))))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}
