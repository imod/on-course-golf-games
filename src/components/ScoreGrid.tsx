import type { Player, Standing } from '@/lib/types'

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

/**
 * One column per player. `total` picks which of the two independent totals
 * is shown — the normal one, or the bad points, which are never mixed into
 * it. The caller decides who leads, because the two totals disagree about
 * what leading means: most points, fewest bad ones.
 */
export function ScoreGrid({
  players,
  standings,
  leaderId,
  total = 'points',
}: {
  players: Player[]
  standings: Standing[]
  leaderId?: string
  total?: 'points' | 'badPoints'
}) {
  const points = new Map(standings.map((s) => [s.playerId, s[total]]))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
        borderTop: '1px solid var(--rule)',
      }}
    >
      {players.map((player) => {
        const isLeader = player.id === leaderId
        return (
          <div
            key={player.id}
            data-testid={`column-${player.id}`}
            data-leader={String(isLeader)}
            style={{
              padding: '10px 0',
              textAlign: 'center',
              background: isLeader ? 'var(--tint)' : 'transparent',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{initials(player.name)}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 1 }}>
              {points.get(player.id) ?? 0}
            </div>
          </div>
        )
      })}
    </div>
  )
}
