import { describe, it, expect, beforeEach } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { createChallenge, createPlayer } from '@/server/catalog'
import { createRound, finishRound } from '@/server/rounds'
import { GET } from '@/app/api/w/rounds/route'

const TOKEN = 'watch-test-token'

async function makeRound(name: string) {
  const player = await createPlayer(`P${name}`)
  const challenge = await createChallenge({
    name: `C${name}`,
    points: [1],
    scope: 'per_hole',
    allowTies: false,
    badPoints: false,
  })
  return createRound({
    name,
    playerIds: [player.id],
    challenges: [{ challengeId: challenge.id, holes: null }],
  })
}

function request(token?: string): Request {
  return new Request('http://test/', {
    headers: token === undefined ? {} : { 'x-watch-token': token },
  })
}

describe('watch rounds listing', () => {
  beforeEach(async () => {
    process.env.WATCH_TOKEN = TOKEN
    await resetDatabase()
  })

  it('401s without a token', async () => {
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect((await response.json()).ok).toBe(false)
  })

  it('401s with the wrong token', async () => {
    expect((await GET(request('nope'))).status).toBe(401)
  })

  it('401s when the tokens differ in length', async () => {
    expect((await GET(request('much-longer-than-the-real-token'))).status).toBe(401)
  })

  it('lists open rounds with compact keys', async () => {
    await makeRound('Breitenloo')
    const response = await GET(request(TOKEN))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rounds).toHaveLength(1)
    expect(Object.keys(body.rounds[0]).sort()).toEqual(['code', 'd', 'n'])
    expect(body.rounds[0].n).toBe('Breitenloo')
    expect(body.rounds[0].code).toHaveLength(10)
  })

  it('omits finished rounds', async () => {
    const open = await makeRound('Open')
    const done = await makeRound('Done')
    await finishRound(done.code)

    const body = await (await GET(request(TOKEN))).json()
    expect(body.rounds.map((r: { code: string }) => r.code)).toEqual([open.code])
  })

  it('does not accept the admin password as a watch token', async () => {
    process.env.ADMIN_PASSWORD = 'house-password'
    expect((await GET(request('house-password'))).status).toBe(401)
  })
})
