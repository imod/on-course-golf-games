import Link from 'next/link'
import { listRounds } from '@/server/rounds'
import { ScoreGrid } from '@/components/ScoreGrid'

export const dynamic = 'force-dynamic'

function leaderOf(standings: { playerId: string; points: number }[]): string | undefined {
  if (standings.length === 0) return undefined
  return standings.reduce((best, s) => (s.points > best.points ? s : best)).playerId
}

export default async function Home() {
  const rounds = await listRounds()

  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: '24px 20px 32px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1.05, margin: 0 }}>
        On-course
        <br />
        games
      </h1>

      <Link
        href="/setup"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 56,
          margin: '22px 0',
          background: 'var(--ink)',
          color: 'var(--paper)',
          borderRadius: 6,
          fontSize: 18,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        New round
      </Link>

      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 10,
        }}
      >
        Played
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rounds.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 15 }}>No rounds yet.</div>
        )}

        {rounds.map((round) => (
          <Link
            key={round.id}
            href={`/r/${round.code}`}
            style={{
              border: `1.5px solid ${round.status === 'open' ? 'var(--ink)' : 'var(--rule)'}`,
              borderRadius: 6,
              overflow: 'hidden',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px 10px' }}>
              <div style={{ fontSize: 17, fontWeight: 500, flexGrow: 1 }}>{round.name}</div>
              {round.status === 'open' ? (
                <span
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--paper)',
                    borderRadius: 999,
                    padding: '3px 10px',
                    fontSize: 12,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}
                >
                  In play
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{round.playedOn}</span>
              )}
            </div>
            <ScoreGrid
              players={round.players}
              standings={round.standings}
              leaderId={leaderOf(round.standings)}
            />
          </Link>
        ))}
      </div>
    </main>
  )
}
