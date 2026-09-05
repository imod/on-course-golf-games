export type ChallengeScope = 'per_hole' | 'per_round'
export type RoundStatus = 'open' | 'finished'

export type Challenge = {
  id: string
  name: string
  description: string
  points: number[]
  scope: ChallengeScope
  allowTies: boolean
  archived: boolean
}

export type Player = {
  id: string
  name: string
  archived: boolean
}

export type RoundChallenge = {
  id: string
  name: string
  points: number[]
  scope: ChallengeScope
  allowTies: boolean
  holes: number[] | null
}

export type ResultEntry = {
  roundChallengeId: string
  hole: number | null
  playerId: string
  rank: number
  points: number
}

export type Standing = {
  playerId: string
  points: number
}

export type RoundState = {
  id: string
  code: string
  name: string
  playedOn: string
  holeCount: number
  status: RoundStatus
  players: Player[]
  challenges: RoundChallenge[]
  results: ResultEntry[]
  standings: Standing[]
}
