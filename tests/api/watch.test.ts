import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { createChallenge, createPlayer } from '@/server/catalog'
import { createRound, getRoundState, finishRound } from '@/server/rounds'
import { GET as getConfig } from '@/app/api/w/[code]/route'
import { POST as postResult } from '@/app/api/w/[code]/result/route'

vi.mock('@/server/realtime', () => ({ notifyRoundChanged: vi.fn().mockResolvedValue(undefined) }))

async function fixture() {
  const domi = await createPlayer('Domi')
  const res = await createPlayer('Res')
  const saemi = await createPlayer('Sämi')
  const ntp = await createChallenge({
    name: 'NTP',
    points: [3, 2, 1],
    scope: 'per_hole',
    allowTies: false,
  })
  const { code } = await createRound({
    name: 'Breitenloo',
    playerIds: [domi.id, res.id, saemi.id],
    challenges: [{ challengeId: ntp.id, holes: [3, 7, 12, 16] }],
  })
  const state = await getRoundState(code)
  return { domi, res, saemi, code, rc: state!.challenges[0].id }
}

const ctx = (code: string) => ({ params: Promise.resolve({ code }) })

describe('watch API', () => {
  beforeEach(resetDatabase)

  it('returns a compact config the watch can cache', async () => {
    const { code } = await fixture()
    const response = await getConfig(new Request('http://test/'), ctx(code))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.round).toBe('Breitenloo')
    expect(body.hole_count).toBe(18)
    expect(Object.keys(body.players[0]).sort()).toEqual(['id', 'n'])
    expect(body.challenges[0]).toMatchObject({ n: 'NTP', pts: [3, 2, 1], holes: [3, 7, 12, 16] })
  })

  it('404s an unknown code', async () => {
    const response = await getConfig(new Request('http://test/'), ctx('ZZZZZZZZZZ'))
    expect(response.status).toBe(404)
  })

  it('accepts a flat rank list and returns standings', async () => {
    const { code, rc, domi, res, saemi } = await fixture()
    const response = await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ rc, hole: 7, ranks: [saemi.id, domi.id, res.id] }),
      }),
      ctx(code),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.standings.find((s: { id: string }) => s.id === saemi.id).p).toBe(3)
    expect(Object.keys(body.standings[0]).sort()).toEqual(['id', 'p'])
  })

  it('is idempotent when the watch retries after a dropped connection', async () => {
    const { code, rc, saemi, domi } = await fixture()
    const send = () =>
      postResult(
        new Request('http://test/', {
          method: 'POST',
          body: JSON.stringify({ rc, hole: 7, ranks: [saemi.id, domi.id] }),
        }),
        ctx(code),
      )

    await send()
    await send()

    const state = await getRoundState(code)
    expect(state!.results).toHaveLength(2)
    expect(state!.standings.find((s) => s.playerId === saemi.id)!.points).toBe(3)
  })

  it('409s a write to a finished round', async () => {
    const { code, rc, domi } = await fixture()
    await finishRound(code)

    const response = await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ rc, hole: 7, ranks: [domi.id] }),
      }),
      ctx(code),
    )

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.ok).toBe(false)
    // A short machine code, not prose: the watch branches on this.
    expect(body.err).toBe('finished')
  })

  it('400s a body missing ranks', async () => {
    const { code, rc } = await fixture()
    const response = await postResult(
      new Request('http://test/', { method: 'POST', body: JSON.stringify({ rc, hole: 7 }) }),
      ctx(code),
    )
    expect(response.status).toBe(400)
    expect((await response.json()).err).toBe('bad_request')
  })

  it('400s a body that is not valid JSON', async () => {
    const { code } = await fixture()
    const response = await postResult(
      new Request('http://test/', { method: 'POST', body: 'not json{' }),
      ctx(code),
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.err).toBe('bad_request')
  })

  it('400s a body that is literal null', async () => {
    const { code } = await fixture()
    const response = await postResult(
      new Request('http://test/', { method: 'POST', body: 'null' }),
      ctx(code),
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.err).toBe('bad_request')
  })

  it('404s an unknown code with a machine-readable code', async () => {
    const response = await postResult(
      new Request('http://test/', {
        method: 'POST',
        body: JSON.stringify({ rc: 'x', hole: 1, ranks: [] }),
      }),
      ctx('ZZZZZZZZZZ'),
    )
    expect(response.status).toBe(404)
    expect((await response.json()).err).toBe('not_found')
  })

  it('404s an unknown code on GET with the {ok, err} envelope', async () => {
    const response = await getConfig(new Request('http://test/'), ctx('ZZZZZZZZZZ'))
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.err).toBe('not_found')
  })
})
