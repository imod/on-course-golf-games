import { listChallenges, listPlayers } from '@/server/catalog'
import { SetupForm } from './SetupForm'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const [players, challenges] = await Promise.all([listPlayers(), listChallenges()])

  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: '24px 20px 32px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1.05, margin: '0 0 18px' }}>
        New round
      </h1>
      <SetupForm players={players} challenges={challenges} />
    </main>
  )
}
