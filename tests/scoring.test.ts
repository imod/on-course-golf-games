import { describe, it, expect } from 'vitest'
import { resolvePoints, standingsFor, leaderOf, bananaOf } from '@/lib/scoring'

describe('resolvePoints', () => {
  it('awards points by position', () => {
    expect(resolvePoints([3, 2, 1], [['a'], ['b'], ['c']])).toEqual([
      { playerId: 'a', rank: 1, points: 3 },
      { playerId: 'b', rank: 2, points: 2 },
      { playerId: 'c', rank: 3, points: 1 },
    ])
  })

  it('awards nothing beyond the points array', () => {
    expect(resolvePoints([1], [['a'], ['b']])).toEqual([
      { playerId: 'a', rank: 1, points: 1 },
      { playerId: 'b', rank: 2, points: 0 },
    ])
  })

  it('shares a rank on a tie and skips the ranks it consumes', () => {
    expect(resolvePoints([3, 2, 1], [['a', 'b'], ['c']])).toEqual([
      { playerId: 'a', rank: 1, points: 3 },
      { playerId: 'b', rank: 1, points: 3 },
      { playerId: 'c', rank: 3, points: 1 },
    ])
  })

  it('handles a three-way tie for first', () => {
    expect(resolvePoints([3, 2, 1], [['a', 'b', 'c'], ['d']])).toEqual([
      { playerId: 'a', rank: 1, points: 3 },
      { playerId: 'b', rank: 1, points: 3 },
      { playerId: 'c', rank: 1, points: 3 },
      { playerId: 'd', rank: 4, points: 0 },
    ])
  })

  it('returns nothing for no placements', () => {
    expect(resolvePoints([3, 2, 1], [])).toEqual([])
  })

  it('rejects a player appearing twice', () => {
    expect(() => resolvePoints([1], [['a'], ['a']])).toThrow(/duplicate player/i)
  })

  it('rejects an empty placement group', () => {
    expect(() => resolvePoints([1], [[]])).toThrow(/empty placement/i)
  })
})

describe('standingsFor', () => {
  const players = [
    { id: 'a', name: 'Domi', archived: false },
    { id: 'b', name: 'Res', archived: false },
    { id: 'c', name: 'Sämi', archived: false },
  ]

  const good = {
    id: 'good',
    name: 'Nearest to the pin',
    points: [3, 2, 1],
    scope: 'per_hole' as const,
    allowTies: false,
    holes: null,
    badPoints: false,
  }

  const bad = {
    id: 'bad',
    name: 'Banana hat',
    points: [1],
    scope: 'per_hole' as const,
    allowTies: true,
    holes: null,
    badPoints: true,
  }

  const entry = (challengeId: string, playerId: string, points: number, hole = 1) => ({
    roundChallengeId: challengeId,
    hole,
    playerId,
    rank: 1,
    points,
  })

  it('keeps bad points out of the normal total and vice versa', () => {
    const standings = standingsFor(players, [
      entry('good', 'a', 3),
      entry('good', 'b', 2),
      entry('bad', 'a', 1),
      entry('bad', 'a', 1, 2),
    ], [good, bad])

    expect(standings).toEqual([
      { playerId: 'a', points: 3, badPoints: 2 },
      { playerId: 'b', points: 2, badPoints: 0 },
      { playerId: 'c', points: 0, badPoints: 0 },
    ])
  })

  it('gives every player both totals even with no results at all', () => {
    expect(standingsFor(players, [], [good, bad])).toEqual([
      { playerId: 'a', points: 0, badPoints: 0 },
      { playerId: 'b', points: 0, badPoints: 0 },
      { playerId: 'c', points: 0, badPoints: 0 },
    ])
  })

  // A result whose game is gone cannot be attributed to either total, and
  // silently counting it as good would inflate the visible leader.
  it('ignores a result whose game is not in the round', () => {
    expect(standingsFor(players, [entry('ghost', 'a', 9)], [good])).toEqual([
      { playerId: 'a', points: 0, badPoints: 0 },
      { playerId: 'b', points: 0, badPoints: 0 },
      { playerId: 'c', points: 0, badPoints: 0 },
    ])
  })
})

describe('leaders', () => {
  const standing = (playerId: string, points: number, badPoints: number) => ({
    playerId,
    points,
    badPoints,
  })

  it('leads on the highest normal total', () => {
    expect(leaderOf([standing('a', 3, 0), standing('b', 7, 0)])).toBe('b')
  })

  it('has no leader before anything is scored', () => {
    expect(leaderOf([standing('a', 0, 2), standing('b', 0, 0)])).toBeUndefined()
  })

  it('makes the lowest bad total the banana leader', () => {
    expect(bananaOf([standing('a', 0, 3), standing('b', 0, 1), standing('c', 0, 2)])).toBe('b')
  })

  it('has no banana leader while nobody has a bad point', () => {
    expect(bananaOf([standing('a', 5, 0), standing('b', 2, 0)])).toBeUndefined()
  })

  it('has no leader in an empty flight', () => {
    expect(leaderOf([])).toBeUndefined()
    expect(bananaOf([])).toBeUndefined()
  })
})
