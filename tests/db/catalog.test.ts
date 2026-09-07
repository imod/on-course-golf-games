import { describe, it, expect, beforeEach } from 'vitest'
import { resetDatabase } from '../helpers/db'
import {
  listChallenges,
  createChallenge,
  updateChallenge,
  listPlayers,
  createPlayer,
  updatePlayer,
} from '@/server/catalog'

describe('catalog', () => {
  beforeEach(resetDatabase)

  it('creates and lists challenges', async () => {
    const created = await createChallenge({
      name: 'Nearest to the pin',
      points: [3, 2, 1],
      scope: 'per_hole',
      allowTies: false,
      badPoints: false,
    })
    expect(created.id).toBeTruthy()
    expect(created.points).toEqual([3, 2, 1])

    const all = await listChallenges()
    expect(all.map((c) => c.name)).toEqual(['Nearest to the pin'])
  })

  it('hides archived challenges unless asked for them', async () => {
    const created = await createChallenge({
      name: 'Sandy save',
      points: [1],
      scope: 'per_round',
      allowTies: false,
      badPoints: false,
    })
    await updateChallenge(created.id, { archived: true })

    expect(await listChallenges()).toEqual([])
    expect((await listChallenges(true)).map((c) => c.name)).toEqual(['Sandy save'])
  })

  it('creates, renames and archives players', async () => {
    const player = await createPlayer('Domi')
    expect(player.name).toBe('Domi')

    const renamed = await updatePlayer(player.id, { name: 'Dominik' })
    expect(renamed.name).toBe('Dominik')

    await updatePlayer(player.id, { archived: true })
    expect(await listPlayers()).toEqual([])
    expect((await listPlayers(true)).map((p) => p.name)).toEqual(['Dominik'])
  })

  it('sorts players by name', async () => {
    await createPlayer('Sämi')
    await createPlayer('Chrigi')
    await createPlayer('Domi')
    expect((await listPlayers()).map((p) => p.name)).toEqual(['Chrigi', 'Domi', 'Sämi'])
  })
})
