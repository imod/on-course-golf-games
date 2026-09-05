import { notFound } from 'next/navigation'
import { getRoundState } from '@/server/rounds'
import { LiveRound } from './LiveRound'
import { getLocale } from '@/lib/server-locale'

export const dynamic = 'force-dynamic'

export default async function RoundPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const [state, locale] = await Promise.all([getRoundState(code), getLocale()])
  if (!state) notFound()

  return (
    <main>
      <LiveRound initial={state} locale={locale} />
    </main>
  )
}
