import { finishRound } from '@/server/rounds'
import { notifyRoundChanged } from '@/server/realtime'
import { errorResponse } from '@/server/http'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const { code } = await params
    const state = await finishRound(code)
    await notifyRoundChanged(state.code)
    return Response.json(state)
  } catch (error) {
    return errorResponse(error)
  }
}
