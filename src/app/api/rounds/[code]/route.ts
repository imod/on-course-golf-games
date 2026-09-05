import { getRoundState } from '@/server/rounds'
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
