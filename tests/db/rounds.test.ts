import { describe, it, expect, beforeEach } from 'vitest'
import { resetDatabase, serviceClient } from '../helpers/db'
import { createChallenge, createPlayer } from '@/server/catalog'
import {
  createRound,
  getRoundState,
  listRounds,
  submitResult,
  finishRound,
  deleteRound,
  RoundError,
} from '@/server/rounds'

async function fixture() {
  const domi = await createPlayer('Domi')
  const res = await createPlayer('Res')
  const saemi = await createPlayer('Sämi')
  const ntp = await createChallenge({
    name: 'Nearest to the pin',
    points: [3, 2, 1],
    scope: 'per_hole',
    allowTies: false,
  })
  const winner = await createChallenge({
    name: 'Hole winner',
    points: [1],
    scope: 'per_hole',
    allowTies: true,
  })
  const { code } = await createRound({
    name: 'Breitenloo',
    playerIds: [domi.id, res.id, saemi.id],
    challenges: [
      { challengeId: ntp.id, holes: [3, 7] },
      { challengeId: winner.id, holes: null },
    ],
  })
  return { domi, res, saemi, ntp, winner, code }
}

describe('rounds', () => {
  beforeEach(resetDatabase)

  it('creates a round with a valid code and the chosen flight', async () => {
    const { code, domi } = await fixture()
    expect(code).toHaveLength(10)

    const state = await getRoundState(code)
    expect(state!.name).toBe('Breitenloo')
    expect(state!.status).toBe('open')
    expect(state!.holeCount).toBe(18)
    expect(state!.players.map((p) => p.name)).toEqual(['Domi', 'Res', 'Sämi'])
    expect(state!.players.some((p) => p.id === domi.id)).toBe(true)
  })

  it('copies challenge config so later catalog edits do not change the round', async () => {
    const { code, ntp } = await fixture()
    const { updateChallenge } = await import('@/server/catalog')
    await updateChallenge(ntp.id, { name: 'Renamed', points: [9] })

    const state = await getRoundState(code)
    const copied = state!.challenges.find((c) => c.name === 'Nearest to the pin')
    expect(copied).toBeDefined()
    expect(copied!.points).toEqual([3, 2, 1])
    expect(copied!.holes).toEqual([3, 7])
  })

  it('returns null for an unknown code', async () => {
    expect(await getRoundState('ZZZZZZZZZZ')).toBeNull()
  })

  it('resolves points on submit and totals them into standings', async () => {
    const { code, domi, res, saemi } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges.find((c) => c.points.length === 3)!

    const after = await submitResult(code, {
      roundChallengeId: ntp.id,
      hole: 7,
      placements: [[saemi.id], [domi.id], [res.id]],
    })

    expect(after.results).toHaveLength(3)
    const byPlayer = Object.fromEntries(after.standings.map((s) => [s.playerId, s.points]))
    expect(byPlayer[saemi.id]).toBe(3)
    expect(byPlayer[domi.id]).toBe(2)
    expect(byPlayer[res.id]).toBe(1)
  })

  it('replaces a previous entry for the same challenge and hole', async () => {
    const { code, domi, saemi } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges.find((c) => c.points.length === 3)!

    await submitResult(code, { roundChallengeId: ntp.id, hole: 7, placements: [[saemi.id]] })
    const after = await submitResult(code, {
      roundChallengeId: ntp.id,
      hole: 7,
      placements: [[domi.id]],
    })

    expect(after.results).toHaveLength(1)
    expect(after.results[0].playerId).toBe(domi.id)
    expect(after.standings.find((s) => s.playerId === saemi.id)?.points ?? 0).toBe(0)
  })

  it('scores a tie as a shared rank when the challenge allows it', async () => {
    const { code, domi, res } = await fixture()
    const state = await getRoundState(code)
    const winner = state!.challenges.find((c) => c.allowTies)!

    const after = await submitResult(code, {
      roundChallengeId: winner.id,
      hole: 4,
      placements: [[domi.id, res.id]],
    })

    expect(after.results.map((r) => r.points).sort()).toEqual([1, 1])
  })

  it('rejects a tie when the challenge does not allow one', async () => {
    const { code, domi, res } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges.find((c) => !c.allowTies)!

    await expect(
      submitResult(code, { roundChallengeId: ntp.id, hole: 7, placements: [[domi.id, res.id]] }),
    ).rejects.toThrow(RoundError)
  })

  it('rejects a player who is not in the flight', async () => {
    const { code } = await fixture()
    const outsider = await createPlayer('Pesche')
    const state = await getRoundState(code)
    const ntp = state!.challenges[0]

    await expect(
      submitResult(code, { roundChallengeId: ntp.id, hole: 7, placements: [[outsider.id]] }),
    ).rejects.toThrow(/not in this round/i)
  })

  it('rejects a hole outside the challenge configuration', async () => {
    const { code, domi } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges.find((c) => c.holes !== null)!

    await expect(
      submitResult(code, { roundChallengeId: ntp.id, hole: 5, placements: [[domi.id]] }),
    ).rejects.toThrow(/hole/i)
  })

  it('refuses writes once the round is finished', async () => {
    const { code, domi } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges[0]

    const finished = await finishRound(code)
    expect(finished.status).toBe('finished')

    await expect(
      submitResult(code, { roundChallengeId: ntp.id, hole: 3, placements: [[domi.id]] }),
    ).rejects.toMatchObject({ code: 'finished' })
  })

  it('creates no round at all when a challenge id is unknown', async () => {
    const domi = await createPlayer('Domi')

    await expect(
      createRound({
        name: 'Orphan check',
        playerIds: [domi.id],
        challenges: [{ challengeId: '00000000-0000-0000-0000-000000000000', holes: null }],
      }),
    ).rejects.toThrow(RoundError)

    const db = serviceClient()
    const { data: rounds } = await db.from('rounds').select('*').eq('name', 'Orphan check')
    expect(rounds).toHaveLength(0)
  })

  it('lists rounds newest first with their standings', async () => {
    const { code, saemi } = await fixture()
    const state = await getRoundState(code)
    const ntp = state!.challenges[0]
    await submitResult(code, { roundChallengeId: ntp.id, hole: 3, placements: [[saemi.id]] })

    const rounds = await listRounds()
    expect(rounds).toHaveLength(1)
    expect(rounds[0].code).toBe(code)
    expect(rounds[0].standings.find((s) => s.playerId === saemi.id)?.points).toBe(3)
  })
  it('deletes a round and everything hanging off it', async () => {
    const { code, ntp, domi, res } = await fixture()
    const state = await getRoundState(code)
    await submitResult(code, {
      roundChallengeId: state!.challenges.find((c) => c.name === ntp.name)!.id,
      hole: 3,
      placements: [[domi.id], [res.id]],
    })

    await deleteRound(code)

    expect(await getRoundState(code)).toBeNull()
    const db = serviceClient()
    const { data: leftovers } = await db.from('results').select('id').eq('round_id', state!.id)
    expect(leftovers).toEqual([])
  })

  it('deletes a finished round even though its results are sealed', async () => {
    const { code } = await fixture()
    await finishRound(code)

    await deleteRound(code)

    expect(await getRoundState(code)).toBeNull()
  })

  it('refuses to delete an unknown code', async () => {
    await expect(deleteRound('ZZZZZZZZZZ')).rejects.toBeInstanceOf(RoundError)
  })

})
