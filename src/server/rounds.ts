import { serviceDb } from './db'
import { generateRoundCode, isValidRoundCode, normalizeRoundCode } from '@/lib/codes'
import { resolvePoints } from '@/lib/scoring'
import type {
  Player,
  ResultEntry,
  RoundChallenge,
  RoundState,
  RoundStatus,
  Standing,
} from '@/lib/types'

export class RoundError extends Error {
  constructor(
    public code: 'not_found' | 'finished' | 'bad_request',
    message: string,
  ) {
    super(message)
    this.name = 'RoundError'
  }
}

export type CreateRoundInput = {
  name: string
  playedOn?: string
  holeCount?: number
  playerIds: string[]
  challenges: { challengeId: string; holes: number[] | null }[]
}

export type SubmitResultInput = {
  roundChallengeId: string
  hole: number | null
  placements: string[][]
  device?: 'web' | 'watch'
}

export type RoundSummary = {
  id: string
  code: string
  name: string
  playedOn: string
  status: RoundStatus
  players: Player[]
  standings: Standing[]
}

export async function createRound(input: CreateRoundInput): Promise<{ id: string; code: string }> {
  if (input.playerIds.length === 0) {
    throw new RoundError('bad_request', 'a round needs at least one player')
  }
  if (input.challenges.length === 0) {
    throw new RoundError('bad_request', 'a round needs at least one game')
  }

  const db = serviceDb()
  const code = generateRoundCode()

  // Validate everything against the catalog before the first write, so an
  // unknown or archived challenge id never leaves an orphaned round behind.
  const { data: catalog, error: catalogError } = await db
    .from('challenges')
    .select('*')
    .in(
      'id',
      input.challenges.map((c) => c.challengeId),
    )
  if (catalogError) throw new RoundError('bad_request', catalogError.message)

  const challengeRows = input.challenges.map((choice) => {
    const source = catalog!.find((c) => c.id === choice.challengeId)
    if (!source) throw new RoundError('bad_request', `unknown challenge ${choice.challengeId}`)
    if (source.archived) throw new RoundError('bad_request', `challenge ${source.name} is archived`)
    return {
      challenge_id: source.id,
      name: source.name,
      points: source.points,
      scope: source.scope,
      allow_ties: source.allow_ties,
      holes: choice.holes,
    }
  })

  const { data: round, error: roundError } = await db
    .from('rounds')
    .insert({
      code,
      name: input.name,
      played_on: input.playedOn ?? new Date().toISOString().slice(0, 10),
      hole_count: input.holeCount ?? 18,
    })
    .select()
    .single()

  if (roundError) throw new RoundError('bad_request', roundError.message)

  const { error: playersError } = await db
    .from('round_players')
    .insert(input.playerIds.map((playerId) => ({ round_id: round.id, player_id: playerId })))
  if (playersError) throw new RoundError('bad_request', playersError.message)

  const { error: rcError } = await db
    .from('round_challenges')
    .insert(challengeRows.map((row) => ({ ...row, round_id: round.id })))
  if (rcError) throw new RoundError('bad_request', rcError.message)

  return { id: round.id, code }
}

export async function getRoundState(rawCode: string): Promise<RoundState | null> {
  const code = normalizeRoundCode(rawCode)
  if (!isValidRoundCode(code)) return null

  const db = serviceDb()
  const {
    data: round,
    error: roundError,
  } = await db.from('rounds').select('*').eq('code', code).maybeSingle()
  if (roundError) throw new RoundError('bad_request', roundError.message)
  if (!round) return null

  const [
    { data: rp, error: rpError },
    { data: rc, error: rcError },
    { data: results, error: resultsError },
  ] = await Promise.all([
    db.from('round_players').select('players(id, name, archived)').eq('round_id', round.id),
    db.from('round_challenges').select('*').eq('round_id', round.id),
    db.from('results').select('*').eq('round_id', round.id),
  ])
  if (rpError) throw new RoundError('bad_request', rpError.message)
  if (rcError) throw new RoundError('bad_request', rcError.message)
  if (resultsError) throw new RoundError('bad_request', resultsError.message)

  const players: Player[] = (rp ?? [])
    .map((row) => row.players as unknown as Player)
    .sort((a, b) => a.name.localeCompare(b.name))

  const challenges: RoundChallenge[] = (rc ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    points: row.points,
    scope: row.scope,
    allowTies: row.allow_ties,
    holes: row.holes,
  }))

  const entries: ResultEntry[] = (results ?? []).map((row) => ({
    roundChallengeId: row.round_challenge_id,
    hole: row.hole,
    playerId: row.player_id,
    rank: row.rank,
    points: row.points,
  }))

  return {
    id: round.id,
    code: round.code,
    name: round.name,
    playedOn: round.played_on,
    holeCount: round.hole_count,
    status: round.status,
    players,
    challenges,
    results: entries,
    standings: standingsFor(players, entries),
  }
}

function standingsFor(players: Player[], results: ResultEntry[]): Standing[] {
  const totals = new Map<string, number>(players.map((p) => [p.id, 0]))
  for (const result of results) {
    totals.set(result.playerId, (totals.get(result.playerId) ?? 0) + result.points)
  }
  return players.map((p) => ({ playerId: p.id, points: totals.get(p.id) ?? 0 }))
}

export async function submitResult(
  rawCode: string,
  input: SubmitResultInput,
): Promise<RoundState> {
  const state = await getRoundState(rawCode)
  if (!state) throw new RoundError('not_found', 'round not found')
  if (state.status === 'finished') throw new RoundError('finished', 'round is finished')

  const challenge = state.challenges.find((c) => c.id === input.roundChallengeId)
  if (!challenge) throw new RoundError('bad_request', 'unknown game for this round')

  if (challenge.scope === 'per_round') {
    if (input.hole !== null) throw new RoundError('bad_request', 'this game is scored per round')
  } else {
    if (input.hole === null) throw new RoundError('bad_request', 'this game needs a hole')
    if (input.hole < 1 || input.hole > state.holeCount) {
      throw new RoundError('bad_request', `hole ${input.hole} is outside this round`)
    }
    if (challenge.holes !== null && !challenge.holes.includes(input.hole)) {
      throw new RoundError('bad_request', `this game is not played on hole ${input.hole}`)
    }
  }

  if (!challenge.allowTies && input.placements.some((group) => group.length > 1)) {
    throw new RoundError('bad_request', `${challenge.name} does not allow ties`)
  }

  const inFlight = new Set(state.players.map((p) => p.id))
  for (const group of input.placements) {
    for (const playerId of group) {
      if (!inFlight.has(playerId)) {
        throw new RoundError('bad_request', `player ${playerId} is not in this round`)
      }
    }
  }

  let resolved
  try {
    resolved = resolvePoints(challenge.points, input.placements)
  } catch (error) {
    throw new RoundError('bad_request', (error as Error).message)
  }

  const db = serviceDb()

  // Replace rather than merge: re-sending after a flaky connection, or
  // correcting from another device, must leave exactly one entry per player.
  let deletion = db.from('results').delete().eq('round_challenge_id', challenge.id)
  deletion = input.hole === null ? deletion.is('hole', null) : deletion.eq('hole', input.hole)
  const { error: deleteError } = await deletion
  if (deleteError) throw new RoundError('bad_request', deleteError.message)

  if (resolved.length > 0) {
    const { error: insertError } = await db.from('results').insert(
      resolved.map((entry) => ({
        round_id: state.id,
        round_challenge_id: challenge.id,
        hole: input.hole,
        player_id: entry.playerId,
        rank: entry.rank,
        points: entry.points,
        created_by_device: input.device ?? 'web',
      })),
    )
    if (insertError) throw new RoundError('bad_request', insertError.message)
  }

  const after = await getRoundState(rawCode)
  if (!after) throw new RoundError('not_found', 'round disappeared mid-write')
  return after
}

export async function finishRound(rawCode: string): Promise<RoundState> {
  const state = await getRoundState(rawCode)
  if (!state) throw new RoundError('not_found', 'round not found')

  const { error } = await serviceDb()
    .from('rounds')
    .update({ status: 'finished' })
    .eq('id', state.id)
  if (error) throw new RoundError('bad_request', error.message)

  return { ...state, status: 'finished' }
}

export async function listRounds(limit = 25): Promise<RoundSummary[]> {
  const db = serviceDb()
  const { data: rounds, error } = await db
    .from('rounds')
    .select('*')
    .order('played_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new RoundError('bad_request', error.message)

  const summaries: RoundSummary[] = []
  for (const round of rounds ?? []) {
    const state = await getRoundState(round.code)
    if (!state) continue
    summaries.push({
      id: state.id,
      code: state.code,
      name: state.name,
      playedOn: state.playedOn,
      status: state.status,
      players: state.players,
      standings: state.standings,
    })
  }
  return summaries
}
