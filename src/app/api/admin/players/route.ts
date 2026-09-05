import { listPlayers, createPlayer, updatePlayer } from '@/server/catalog'
import { requireAdmin, AdminError, adminErrorResponse } from '@/server/admin-auth'
import { errorResponse, readJson } from '@/server/http'
import { RoundError } from '@/server/rounds'

export async function GET(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    const url = new URL(request.url)
    return Response.json(await listPlayers(url.searchParams.get('archived') === 'true'))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    const body = (await readJson(request)) as { name?: unknown }
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw new RoundError('bad_request', 'name is required')
    }
    return Response.json(await createPlayer(body.name.trim()))
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    requireAdmin(request)
    const body = (await readJson(request)) as { id?: unknown; name?: unknown; archived?: unknown }
    if (typeof body.id !== 'string') throw new RoundError('bad_request', 'id is required')
    return Response.json(
      await updatePlayer(body.id, {
        name: typeof body.name === 'string' ? body.name : undefined,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      }),
    )
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}
