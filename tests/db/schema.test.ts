import { describe, it, expect, beforeEach } from 'vitest'
import { serviceClient, anonClient, resetDatabase } from '../helpers/db'
import { generateRoundCode } from '@/lib/codes'

const db = serviceClient()

async function makeRound(status: 'open' | 'finished' = 'open') {
  const { data: player } = await db.from('players').insert({ name: 'Domi' }).select().single()
  const { data: round } = await db
    .from('rounds')
    .insert({ code: generateRoundCode(), name: 'Test', status })
    .select()
    .single()
  const { data: rc } = await db
    .from('round_challenges')
    .insert({
      round_id: round!.id,
      name: 'Nearest pin',
      points: [3, 2, 1],
      scope: 'per_hole',
      allow_ties: false,
    })
    .select()
    .single()
  return { player: player!, round: round!, roundChallenge: rc! }
}

describe('schema', () => {
  beforeEach(resetDatabase)

  it('rejects a malformed round code', async () => {
    const { error } = await db.from('rounds').insert({ code: 'short', name: 'Bad' })
    expect(error?.message).toMatch(/rounds_code_shape/)
  })

  it('rejects a challenge with no points', async () => {
    const { error } = await db.from('challenges').insert({ name: 'Empty', points: [] })
    expect(error).not.toBeNull()
  })

  it('allows one result per player per challenge per hole', async () => {
    const { player, round, roundChallenge } = await makeRound()
    const row = {
      round_id: round.id,
      round_challenge_id: roundChallenge.id,
      hole: 7,
      player_id: player.id,
      rank: 1,
      points: 3,
    }
    expect((await db.from('results').insert(row)).error).toBeNull()
    expect((await db.from('results').insert(row)).error?.message).toMatch(/results_unique_entry/)
  })

  it('treats a null hole as one entry per player, not many', async () => {
    const { player, round, roundChallenge } = await makeRound()
    const row = {
      round_id: round.id,
      round_challenge_id: roundChallenge.id,
      hole: null,
      player_id: player.id,
      rank: 1,
      points: 1,
    }
    expect((await db.from('results').insert(row)).error).toBeNull()
    expect((await db.from('results').insert(row)).error?.message).toMatch(/results_unique_entry/)
  })

  it('refuses writes to a finished round', async () => {
    const { player, round, roundChallenge } = await makeRound('finished')
    const { error } = await db.from('results').insert({
      round_id: round.id,
      round_challenge_id: roundChallenge.id,
      hole: 3,
      player_id: player.id,
      rank: 1,
      points: 3,
    })
    expect(error?.message).toMatch(/round is finished/)
  })

  it('gives anonymous clients no access to any table', async () => {
    await makeRound()
    const anon = anonClient()
    for (const table of ['rounds', 'players', 'challenges', 'round_challenges', 'results']) {
      const { data } = await anon.from(table).select('*')
      expect(data ?? []).toEqual([])
    }
  })
})
