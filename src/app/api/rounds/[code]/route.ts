import { deleteRound, getRoundState } from '@/server/rounds'
import { requireAdmin, AdminError, adminErrorResponse } from '@/server/admin-auth'
import { errorResponse } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const { code } = await params
    const state = await getRoundState(code)
    if (!state) return Response.json({ error: 'round not found' }, { status: 404 })
    return Response.json(state)
  } catch (error) {
    return errorResponse(error)
  }
}

/** Admin-only: destroys the round and its results for good. */
export async function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  try {
    requireAdmin(request)
    const { code } = await params
    await deleteRound(code)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof AdminError) return adminErrorResponse()
    return errorResponse(error)
  }
}
