'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { browserClient } from '@/lib/supabase-browser'
import { initials, ScoreGrid } from '@/components/ScoreGrid'
import { Button } from '@/components/Button'
import type { RoundState } from '@/lib/types'

/** Player ids in the order they were tapped, per challenge, before saving. */
type Draft = Record<string, string[]>

export function LiveRound({ initial }: { initial: RoundState }) {
  const [state, setState] = useState(initial)
  const [hole, setHole] = useState(1)
  const [draft, setDraft] = useState<Draft>({})
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const response = await fetch(`/api/rounds/${state.code}`)
      if (response.ok) setState((await response.json()) as RoundState)
    } catch {
      // A dropped connection here just means we miss this refresh; the next
      // broadcast (or the player's own next action) will retry.
    }
  }, [state.code])

  useEffect(() => {
    const supabase = browserClient()
    const channel = supabase
      .channel(`round:${state.code}`)
      .on('broadcast', { event: 'changed' }, () => {
        void refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.code, refetch])

  const readOnly = state.status === 'finished'
  const visible = state.challenges.filter(
    (challenge) =>
      challenge.scope === 'per_round' || challenge.holes === null || challenge.holes.includes(hole),
  )

  function savedRank(challengeId: string, playerId: string): number | null {
    const entry = state.results.find(
      (r) =>
        r.roundChallengeId === challengeId &&
        r.playerId === playerId &&
        (r.hole ?? null) === holeFor(challengeId),
    )
    return entry ? entry.points : null
  }

  function holeFor(challengeId: string): number | null {
    const challenge = state.challenges.find((c) => c.id === challengeId)
    return challenge?.scope === 'per_round' ? null : hole
  }

  function tap(challengeId: string, playerId: string) {
    if (readOnly) return
    const current = draft[challengeId] ?? []
    setDraft({
      ...draft,
      [challengeId]: current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    })
  }

  function pendingPoints(challengeId: string, playerId: string): number | null {
    const challenge = state.challenges.find((c) => c.id === challengeId)!
    const order = draft[challengeId] ?? []
    const index = order.indexOf(playerId)
    if (index === -1) return null
    return challenge.points[index] ?? 0
  }

  async function save(challengeId: string) {
    const order = draft[challengeId] ?? []
    setError(null)

    try {
      const response = await fetch(`/api/rounds/${state.code}/results`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roundChallengeId: challengeId,
          hole: holeFor(challengeId),
          placements: order.map((id) => [id]),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Could not save that. Try again.')
        return
      }

      setState((await response.json()) as RoundState)
      setDraft({ ...draft, [challengeId]: [] })
    } catch {
      // Network failure: the draft selection is left exactly as it was so
      // this never looks like a successful save.
      setError('Could not save that. Try again.')
    }
  }

  async function finish() {
    setError(null)
    try {
      const response = await fetch(`/api/rounds/${state.code}/finish`, { method: 'POST' })
      if (response.ok) {
        setState((await response.json()) as RoundState)
      } else {
        setError('Could not finish the round. Try again.')
      }
    } catch {
      setError('Could not finish the round. Try again.')
    }
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', padding: '22px 20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1.05 }}>{state.name}</div>
          <div
            style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 5 }}
          >
            {state.playedOn} · {state.players.length} players
            {readOnly ? ' · finished' : ''}
          </div>
        </div>
        <div
          style={{
            height: 34,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            border: '1.5px solid var(--ink)',
            borderRadius: 4,
            fontSize: 12,
            letterSpacing: 1.1,
            fontWeight: 500,
          }}
        >
          {state.code}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '14px 0 16px',
          border: '1.5px solid var(--ink)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <button
          aria-label="Previous hole"
          onClick={() => setHole((h) => Math.max(1, h - 1))}
          style={navButton}
        >
          ‹
        </button>
        <div style={{ flexGrow: 1, textAlign: 'center', padding: '11px 0' }}>
          <span
            style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginRight: 9 }}
          >
            Hole
          </span>
          <span data-testid="hole-number" style={{ fontFamily: 'var(--serif)', fontSize: 40 }}>
            {hole}
          </span>
        </div>
        <button
          aria-label="Next hole"
          onClick={() => setHole((h) => Math.min(state.holeCount, h + 1))}
          style={navButton}
        >
          ›
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visible.map((challenge) => {
          const order = draft[challenge.id] ?? []
          return (
            <div key={challenge.id} style={{ border: '1.5px solid var(--ink)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 15, fontWeight: 500, flexGrow: 1 }}>{challenge.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{challenge.points.join(' · ')}</div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${state.players.length}, minmax(0, 1fr))`,
                  borderTop: '1px solid var(--rule)',
                }}
              >
                {state.players.map((player) => {
                  const pending = pendingPoints(challenge.id, player.id)
                  const saved = savedRank(challenge.id, player.id)
                  const shown = pending ?? saved
                  const highlight = pending !== null || (saved !== null && saved > 0)
                  return (
                    <button
                      key={player.id}
                      data-testid={`cell-${challenge.id}-${player.id}`}
                      onClick={() => tap(challenge.id, player.id)}
                      disabled={readOnly}
                      style={{
                        height: 62,
                        border: 'none',
                        borderLeft: '1px solid var(--rule)',
                        background: 'transparent',
                        cursor: readOnly ? 'default' : 'pointer',
                        fontFamily: 'var(--sans)',
                        color: 'var(--ink)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{initials(player.name)}</span>
                      <span
                        style={{
                          width: 34,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                          fontSize: 18,
                          fontWeight: highlight ? 700 : 500,
                          background: highlight ? 'var(--accent)' : 'transparent',
                          color: highlight ? 'var(--paper)' : 'var(--ink)',
                          border: highlight ? 'none' : '1.5px dashed var(--placeholder)',
                        }}
                      >
                        {shown ?? ''}
                      </span>
                    </button>
                  )
                })}
              </div>

              {!readOnly && order.length > 0 && (
                <button
                  data-testid={`save-${challenge.id}`}
                  onClick={() => void save(challenge.id)}
                  style={{
                    width: '100%',
                    height: 48,
                    border: 'none',
                    borderTop: '1px solid var(--rule)',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    fontSize: 16,
                    fontFamily: 'var(--sans)',
                    cursor: 'pointer',
                  }}
                >
                  Save {challenge.name}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && <div style={{ marginTop: 12, fontSize: 14 }}>{error}</div>}

      <div style={{ marginTop: 20, borderTop: '1.5px solid var(--ink)', paddingTop: 13 }}>
        <div
          style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}
        >
          Standings
        </div>
        <ScoreGrid players={state.players} standings={state.standings} />
      </div>

      {!readOnly && (
        <Button style={{ width: '100%', marginTop: 16 }} onClick={() => void finish()}>
          Finish round
        </Button>
      )}
    </div>
  )
}

const navButton: CSSProperties = {
  width: 62,
  height: 62,
  border: 'none',
  background: 'transparent',
  fontSize: 26,
  cursor: 'pointer',
  color: 'var(--ink)',
}
