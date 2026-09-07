import type { Player, ResultEntry, RoundChallenge, Standing } from './types'

export type Placement = string[]

export type ResolvedResult = {
  playerId: string
  rank: number
  points: number
}

/**
 * Turns an ordered list of placement groups into ranked, scored results.
 * Players sharing a group share the rank; the ranks that group consumes are
 * skipped, so [[a,b],[c]] yields ranks 1, 1, 3.
 */
export function resolvePoints(
  pointsByRank: number[],
  placements: Placement[],
): ResolvedResult[] {
  const seen = new Set<string>()
  const results: ResolvedResult[] = []
  let rank = 1

  for (const group of placements) {
    if (group.length === 0) {
      throw new Error('empty placement group')
    }
    for (const playerId of group) {
      if (seen.has(playerId)) {
        throw new Error(`duplicate player in placements: ${playerId}`)
      }
      seen.add(playerId)
      results.push({ playerId, rank, points: pointsByRank[rank - 1] ?? 0 })
    }
    rank += group.length
  }

  return results
}

/**
 * Two independent totals per player. Normal points pool together and the
 * highest wins; bad points pool separately and the lowest wins, so the two
 * are never added, subtracted or compared against each other.
 */
export function standingsFor(
  players: Player[],
  results: ResultEntry[],
  challenges: Pick<RoundChallenge, 'id' | 'badPoints'>[],
): Standing[] {
  const bad = new Set(challenges.filter((c) => c.badPoints).map((c) => c.id))
  const known = new Set(challenges.map((c) => c.id))
  const totals = new Map(players.map((p) => [p.id, { points: 0, badPoints: 0 }]))

  for (const result of results) {
    // A result for a game this round doesn't have cannot be attributed to
    // either total; counting it as normal would inflate the leader.
    if (!known.has(result.roundChallengeId)) continue
    const total = totals.get(result.playerId)
    if (!total) continue

    if (bad.has(result.roundChallengeId)) {
      total.badPoints += result.points
    } else {
      total.points += result.points
    }
  }

  return players.map((player) => ({
    playerId: player.id,
    ...(totals.get(player.id) ?? { points: 0, badPoints: 0 }),
  }))
}

/**
 * Who is ahead on normal points. Nobody leads a round where nothing has been
 * scored yet — tinting the first player would be an invented result.
 */
export function leaderOf(standings: Standing[]): string | undefined {
  if (standings.length === 0) return undefined
  const best = standings.reduce((leader, s) => (s.points > leader.points ? s : leader))
  return best.points > 0 ? best.playerId : undefined
}

/**
 * Who is ahead on bad points, which means who has the fewest. Nobody leads
 * until at least one bad point exists: while everyone is on zero there is no
 * banana to award.
 */
export function bananaOf(standings: Standing[]): string | undefined {
  if (standings.length === 0) return undefined
  if (standings.every((s) => s.badPoints === 0)) return undefined
  const best = standings.reduce((leader, s) => (s.badPoints < leader.badPoints ? s : leader))
  return best.playerId
}
