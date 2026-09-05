import { describe, it, expect, beforeEach } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { createChallenge, createPlayer } from '@/server/catalog'
import { GET as getChallenges, POST as postChallenge, PATCH as patchChallenge } from '@/app/api/admin/challenges/route'
import { POST as postPlayer } from '@/app/api/admin/players/route'
import { POST as postRound } from '@/app/api/rounds/route'

const PASSWORD = 'test-password'

function authed(body?: unknown, method = 'POST'): Request {
  return new Request('http://test/', {
    method,
    headers: { 'x-admin-password': PASSWORD },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('admin API', () => {
  beforeEach(async () => {
    process.env.ADMIN_PASSWORD = PASSWORD
    await resetDatabase()
  })

  it('401s without the password', async () => {
    const response = await getChallenges(new Request('http://test/'))
    expect(response.status).toBe(401)
  })

  it('401s with the wrong password', async () => {
    const response = await getChallenges(
      new Request('http://test/', { headers: { 'x-admin-password': 'wrong' } }),
    )
    expect(response.status).toBe(401)
  })

  it('creates and lists challenges', async () => {
    const created = await postChallenge(
      authed({ name: 'Nearest to the pin', points: [3, 2, 1], scope: 'per_hole', allowTies: false }),
    )
    expect(created.status).toBe(200)

    const list = await getChallenges(authed(undefined, 'GET'))
    expect((await list.json()).map((c: { name: string }) => c.name)).toEqual(['Nearest to the pin'])
  })

  it('archives a challenge', async () => {
    const challenge = await createChallenge({
      name: 'Sandy save',
      points: [1],
      scope: 'per_round',
      allowTies: false,
    })
    const response = await patchChallenge(authed({ id: challenge.id, archived: true }, 'PATCH'))
    expect(response.status).toBe(200)
    expect((await response.json()).archived).toBe(true)
  })

  it('creates a player', async () => {
    const response = await postPlayer(authed({ name: 'Domi' }))
    expect(response.status).toBe(200)
    expect((await response.json()).name).toBe('Domi')
  })

  it('creates a round and returns its code', async () => {
    const domi = await createPlayer('Domi')
    const ntp = await createChallenge({
      name: 'NTP',
      points: [3, 2, 1],
      scope: 'per_hole',
      allowTies: false,
    })

    const response = await postRound(
      authed({
        name: 'Breitenloo',
        playerIds: [domi.id],
        challenges: [{ challengeId: ntp.id, holes: [3, 7] }],
      }),
    )

    expect(response.status).toBe(200)
    expect((await response.json()).code).toHaveLength(10)
  })

  it('400s a round with no players', async () => {
    const response = await postRound(authed({ name: 'Empty', playerIds: [], challenges: [] }))
    expect(response.status).toBe(400)
  })
})
