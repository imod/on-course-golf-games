import { notFound } from 'next/navigation'
import { getRoundState } from '@/server/rounds'
import { LiveRound } from './LiveRound'

export const dynamic = 'force-dynamic'

export default async function RoundPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const state = await getRoundState(code)
  if (!state) notFound()

  return (
    <main>
      <LiveRound initial={state} />
    </main>
  )
}
