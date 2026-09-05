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
