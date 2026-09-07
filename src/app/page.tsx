import Link from 'next/link'
import { listRounds } from '@/server/rounds'
import { ScoreGrid } from '@/components/ScoreGrid'
import { buttonStyle } from '@/components/Button'
import { LanguageToggle } from '@/components/LanguageToggle'
import { formatDate, getDict } from '@/lib/i18n'
import { bananaOf, leaderOf } from '@/lib/scoring'
import { getLocale } from '@/lib/server-locale'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [rounds, locale] = await Promise.all([listRounds(), getLocale()])
  const dict = getDict(locale)

  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: '24px 20px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1.05, margin: 0 }}>
          {dict.appTitleLine1}
          <br />
          {dict.appTitleLine2}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 44,
              padding: '0 12px',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              color: 'var(--muted)',
              textDecoration: 'none',
              fontSize: 12,
              letterSpacing: 0.8,
            }}
          >
            {dict.admin}
          </Link>
          <LanguageToggle locale={locale} />
        </div>
      </div>

      <Link
        href="/setup"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '22px 0',
          textDecoration: 'none',
          ...buttonStyle('primary'),
        }}
      >
        {dict.newRound}
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
        {dict.played}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rounds.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 15 }}>{dict.noRoundsYet}</div>
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
                  {dict.inPlay}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {formatDate(round.playedOn, locale)}
                </span>
              )}
            </div>
            <ScoreGrid
              players={round.players}
              standings={round.standings}
              leaderId={leaderOf(round.standings)}
            />
            {round.hasBadPoints && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    borderTop: '1px solid var(--rule)',
                    padding: '7px 14px 0',
                  }}
                >
                  {dict.badPointsStandings}
                </div>
                <ScoreGrid
                  players={round.players}
                  standings={round.standings}
                  total="badPoints"
                  leaderId={bananaOf(round.standings)}
                />
              </>
            )}
          </Link>
        ))}
      </div>
    </main>
  )
}
