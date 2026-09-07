import { serviceDb } from './db'
import type { Challenge, ChallengeScope, Player } from '@/lib/types'

export type ChallengeInput = {
  name: string
  description?: string
  points: number[]
  scope: ChallengeScope
  allowTies: boolean
  badPoints?: boolean
  archived?: boolean
}

type ChallengeRow = {
  id: string
  name: string
  description: string
  points: number[]
  scope: ChallengeScope
  allow_ties: boolean
  bad_points: boolean
  archived: boolean
}

type PlayerRow = { id: string; name: string; archived: boolean }

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    points: row.points,
    scope: row.scope,
    allowTies: row.allow_ties,
    badPoints: row.bad_points,
    archived: row.archived,
  }
}

function toPlayer(row: PlayerRow): Player {
  return { id: row.id, name: row.name, archived: row.archived }
}

export async function listChallenges(includeArchived = false): Promise<Challenge[]> {
  let query = serviceDb().from('challenges').select('*').order('name')
  if (!includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as ChallengeRow[]).map(toChallenge)
}

export async function createChallenge(input: ChallengeInput): Promise<Challenge> {
  const { data, error } = await serviceDb()
    .from('challenges')
    .insert({
      name: input.name,
      description: input.description ?? '',
      points: input.points,
      scope: input.scope,
      allow_ties: input.allowTies,
      bad_points: input.badPoints ?? false,
      archived: input.archived ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return toChallenge(data as ChallengeRow)
}

export async function updateChallenge(
  id: string,
  input: Partial<ChallengeInput>,
): Promise<Challenge> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.points !== undefined) patch.points = input.points
  if (input.scope !== undefined) patch.scope = input.scope
  if (input.allowTies !== undefined) patch.allow_ties = input.allowTies
  if (input.badPoints !== undefined) patch.bad_points = input.badPoints
  if (input.archived !== undefined) patch.archived = input.archived

  const { data, error } = await serviceDb()
    .from('challenges')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return toChallenge(data as ChallengeRow)
}

export async function listPlayers(includeArchived = false): Promise<Player[]> {
  let query = serviceDb().from('players').select('*').order('name')
  if (!includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as PlayerRow[]).map(toPlayer)
}

export async function createPlayer(name: string): Promise<Player> {
  const { data, error } = await serviceDb().from('players').insert({ name }).select().single()
  if (error) throw new Error(error.message)
  return toPlayer(data as PlayerRow)
}

export async function updatePlayer(
  id: string,
  input: { name?: string; archived?: boolean },
): Promise<Player> {
  const { data, error } = await serviceDb()
    .from('players')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return toPlayer(data as PlayerRow)
}
