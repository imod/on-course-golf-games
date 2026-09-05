import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { createChallenge, createPlayer } from '@/server/catalog'
import { createRound, getRoundState } from '@/server/rounds'
import { GET as getRound } from '@/app/api/rounds/[code]/route'
import { POST as postResult } from '@/app/api/rounds/[code]/results/route'
import { POST as postFinish } from '@/app/api/rounds/[code]/finish/route'

vi.mock('@/server/realtime', () => ({ notifyRoundChanged: vi.fn().mockResolvedValue(undefined) }))

async function fixture() {
  const domi = await createPlayer('Domi')
  const res = await createPlayer('Res')
  const ntp = await createChallenge({
    name: 'Nearest to the pin',
    points: [3, 2, 1],
    scope: 'per_hole',
    allowTies: false,
  })
  const { code } = await createRound({
    name: 'Breitenloo',
    playerIds: [domi.id, res.id],
    challenges: [{ challengeId: ntp.id, holes: null }],
  })
  const state = await getRoundState(code)
  return { domi, res, code, roundChallengeId: state!.challenges[0].id }
}

const ctx = (code: string) => ({ params: Promise.resolve({ code }) })

describe('round API', () => {
  beforeEach(resetDatabase)

  it('returns the round state for a valid code', async () => {
    const { code } = await fixture()
    const response = await getRound(new Request('http://test/'), ctx(code))
    expect(response.status).toBe(200)
    expect((await response.json()).name).toBe('Breitenloo')
  })

  it('404s an unknown code', async () => {
    const response = await getRound(new Request('http://test/'), ctx('ZZZZZZZZZZ'))
    expect(response.status).toBe(404)
  })

  it('writes a result and returns the new standings', async () => {
    const { code, roundChallengeId, domi, res } = await fixture()
    const response = await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ roundChallengeId, hole: 7, placements: [[domi.id], [res.id]] }),
      }),
      ctx(code),
    )

    expect(response.status).toBe(200)
    const state = await response.json()
    expect(state.standings.find((s: { playerId: string }) => s.playerId === domi.id).points).toBe(3)
  })

  it('broadcasts after a successful write', async () => {
    const { notifyRoundChanged } = await import('@/server/realtime')
    const { code, roundChallengeId, domi } = await fixture()
    await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ roundChallengeId, hole: 7, placements: [[domi.id]] }),
      }),
      ctx(code),
    )
    expect(notifyRoundChanged).toHaveBeenCalledWith(code)
  })

  it('clears a hole when an empty placement list is sent', async () => {
    const { code, roundChallengeId, domi, res } = await fixture()
    const post = (placements: string[][]) =>
      postResult(
        new Request('http://test/', {
          method: 'POST',
          body: JSON.stringify({ roundChallengeId, hole: 7, placements }),
        }),
        ctx(code),
      )

    await post([[domi.id], [res.id]])
    const response = await post([])

    expect(response.status).toBe(200)
    const state = await response.json()
    expect(state.results.filter((r: { hole: number }) => r.hole === 7)).toHaveLength(0)
    expect(state.standings.every((s: { points: number }) => s.points === 0)).toBe(true)
  })

  it('400s a malformed body', async () => {
    const { code } = await fixture()
    const response = await postResult(
      new Request('http://test/', { method: 'POST', body: '{"nope":1}' }),
      ctx(code),
    )
    expect(response.status).toBe(400)
  })

  it('409s a write to a finished round', async () => {
    const { code, roundChallengeId, domi } = await fixture()
    await postFinish(new Request('http://test/', { method: 'POST' }), ctx(code))

    const response = await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ roundChallengeId, hole: 7, placements: [[domi.id]] }),
      }),
      ctx(code),
    )
    expect(response.status).toBe(409)
  })
})
