import { listChallenges, createChallenge, updateChallenge, type ChallengeInput } from '@/server/catalog'
import { requireAdmin, AdminError, adminErrorResponse } from '@/server/admin-auth'
import { errorResponse, readJson } from '@/server/http'
import { RoundError } from '@/server/rounds'

function validatePoints(points: unknown): number[] {
  // Integer, not just `typeof number`: NaN and Infinity are numbers, and they
  // reach Postgres as an insert failure, which would surface as a 500.
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.some((p) => typeof p !== 'number' || !Number.isInteger(p))
  ) {
    throw new RoundError('bad_request', 'points must be a non-empty list of whole numbers')
  }
  return points
}

function validateScope(scope: unknown): 'per_hole' | 'per_round' {
  if (scope !== 'per_hole' && scope !== 'per_round') {
    throw new RoundError('bad_request', 'scope must be per_hole or per_round')
  }
  return scope
}

function validateAllowTies(allowTies: unknown): boolean {
  if (allowTies !== undefined && typeof allowTies !== 'boolean') {
    throw new RoundError('bad_request', 'allowTies must be a boolean')
  }
  return allowTies ?? false
}

function validateBadPoints(badPoints: unknown): boolean {
  if (badPoints !== undefined && typeof badPoints !== 'boolean') {
    throw new RoundError('bad_request', 'badPoints must be a boolean')
  }
  return badPoints ?? false
}

function parseInput(raw: unknown): ChallengeInput {
  const body = raw as Partial<ChallengeInput>
  if (typeof body?.name !== 'string' || body.name.trim() === '') {
    throw new RoundError('bad_request', 'name is required')
  }
  const points = validatePoints(body.points)
  const scope = validateScope(body.scope)
  return {
    name: body.name,
    description: body.description ?? '',
    points,
    scope,
    // Optional, but type-checked when present — POST and PATCH must agree on
    // what a valid body for this resource looks like.
    allowTies: validateAllowTies(body.allowTies),
    badPoints: validateBadPoints(body.badPoints),
  }
}

/** Validates each optional field of a PATCH body, leaving absent fields absent. */
function parsePatch(raw: unknown): Partial<ChallengeInput> {
  const body = raw as Partial<ChallengeInput>
  const patch: Partial<ChallengeInput> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw new RoundError('bad_request', 'name must be a non-empty string')
    }
    patch.name = body.name
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      throw new RoundError('bad_request', 'description must be a string')
    }
    patch.description = body.description
  }
  if (body.points !== undefined) {
    patch.points = validatePoints(body.points)
  }
  if (body.scope !== undefined) {
    patch.scope = validateScope(body.scope)
  }
  if (body.allowTies !== undefined) {
    patch.allowTies = validateAllowTies(body.allowTies)
  }
  if (body.badPoints !== undefined) {
    patch.badPoints = validateBadPoints(body.badPoints)
  }
  if (body.archived !== undefined) {
    if (typeof body.archived !== 'boolean') {
      throw new RoundError('bad_request', 'archived must be a boolean')
    }
    patch.archived = body.archived
  }

  return patch
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
    return Response.json(await updateChallenge(body.id, parsePatch(body)))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}
