import { describe, it, expect } from 'vitest'
import { resolvePoints } from '@/lib/scoring'

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
