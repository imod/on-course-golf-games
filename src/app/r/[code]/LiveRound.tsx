'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { browserClient } from '@/lib/supabase-browser'
import { initials, ScoreGrid } from '@/components/ScoreGrid'
import { Button } from '@/components/Button'
import { LanguageToggle } from '@/components/LanguageToggle'
import { formatDate, getDict, type Locale } from '@/lib/i18n'
import type { RoundState } from '@/lib/types'

/**
 * Ordered places to be saved, keyed by challenge and hole. Each place is a
 * list of one or more tied player ids. A missing key means "not being
 * edited" — the saved result is shown instead. A present but empty array
 * means "clear this hole", which is a real edit.
 */
type Draft = Record<string, string[][]>

export function LiveRound({ initial, locale }: { initial: RoundState; locale: Locale }) {
  const dict = getDict(locale)
  const [state, setState] = useState(initial)
  const [hole, setHole] = useState(1)
  const [draft, setDraft] = useState<Draft>({})
  const [error, setError] = useState<string | null>(null)
  const [tieError, setTieError] = useState<string | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)

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

  function savedPoints(challengeId: string, playerId: string): number | null {
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

  /** A draft belongs to one challenge on one hole, never to the challenge alone. */
  function draftKey(challengeId: string): string {
    return `${challengeId}|${holeFor(challengeId) ?? 'round'}`
  }

  /** The saved places for this challenge and hole, grouped by rank so an
   *  existing tie round-trips instead of being flattened into a strict order. */
  function savedGroups(challengeId: string): string[][] {
    const hole = holeFor(challengeId)
    const byRank = new Map<number, string[]>()

    for (const entry of state.results) {
      if (entry.roundChallengeId !== challengeId || (entry.hole ?? null) !== hole) continue
      byRank.set(entry.rank, [...(byRank.get(entry.rank) ?? []), entry.playerId])
    }

    return [...byRank.entries()].sort(([a], [b]) => a - b).map(([, ids]) => ids)
  }

  /** The places being edited, or null when this challenge/hole is untouched. */
  function draftGroups(challengeId: string): string[][] | null {
    return draft[draftKey(challengeId)] ?? null
  }

  function tap(challengeId: string, playerId: string) {
    if (readOnly) return

    const challenge = state.challenges.find((c) => c.id === challengeId)!
    const key = draftKey(challengeId)
    // Seed from what is already saved, so correcting one player cannot
    // silently wipe the rest of the hole when the replace is written.
    const current = draftGroups(challengeId) ?? savedGroups(challengeId)
    const groupIndex = current.findIndex((group) => group.includes(playerId))

    if (groupIndex === -1) {
      // Unpicked: appends as a new place.
      setTieError(null)
      setDraft({ ...draft, [key]: [...current, [playerId]] })
      return
    }

    const group = current[groupIndex]

    if (group.length > 1) {
      // Already tied: this tap removes just this player from the tie.
      setTieError(null)
      const next = current
        .map((g, i) => (i === groupIndex ? g.filter((id) => id !== playerId) : g))
        .filter((g) => g.length > 0)
      setDraft({ ...draft, [key]: next })
      return
    }

    if (groupIndex === 0 || !challenge.allowTies) {
      // Alone in first place, or ties are not allowed for this game: remove.
      if (!challenge.allowTies && groupIndex > 0) setTieError(challenge.name)
      else setTieError(null)
      const next = current.filter((_, i) => i !== groupIndex)
      setDraft({ ...draft, [key]: next })
      return
    }

    // Alone in a later place with ties allowed: join the previous place.
    setTieError(null)
    const next = current
      .map((g, i) => (i === groupIndex - 1 ? [...g, playerId] : g))
      .filter((_, i) => i !== groupIndex)
    setDraft({ ...draft, [key]: next })
  }

  function pendingPoints(challengeId: string, playerId: string): number | null {
    const challenge = state.challenges.find((c) => c.id === challengeId)!
    const groups = draftGroups(challengeId)
    if (groups === null) return null

    let rank = 1
    for (const group of groups) {
      if (group.includes(playerId)) return challenge.points[rank - 1] ?? 0
      rank += group.length
    }
    return null
  }

  async function save(challengeId: string) {
    const groups = draftGroups(challengeId) ?? []
    setError(null)

    try {
      const response = await fetch(`/api/rounds/${state.code}/results`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roundChallengeId: challengeId,
          hole: holeFor(challengeId),
          placements: groups,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? dict.couldNotSaveTryAgain)
        return
      }

      setState((await response.json()) as RoundState)
      const next = { ...draft }
      delete next[draftKey(challengeId)]
      setDraft(next)
    } catch {
      // Network failure: the draft selection is left exactly as it was so
      // this never looks like a successful save.
      setError(dict.couldNotSaveTryAgain)
    }
  }

  async function finish() {
    setError(null)
    setConfirmingFinish(false)
    try {
      const response = await fetch(`/api/rounds/${state.code}/finish`, { method: 'POST' })
      if (response.ok) {
        setState((await response.json()) as RoundState)
      } else {
        setError(dict.couldNotFinishTryAgain)
      }
    } catch {
      setError(dict.couldNotFinishTryAgain)
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
            {formatDate(state.playedOn, locale)} · {dict.playersCount(state.players.length)}
            {readOnly ? ` · ${dict.finishedSuffix}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <LanguageToggle locale={locale} />
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
          aria-label={dict.previousHole}
          onClick={() => setHole((h) => Math.max(1, h - 1))}
          style={navButton}
        >
          ‹
        </button>
        <div style={{ flexGrow: 1, textAlign: 'center', padding: '11px 0' }}>
          <span
            style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginRight: 9 }}
          >
            {dict.hole}
          </span>
          <span data-testid="hole-number" style={{ fontFamily: 'var(--serif)', fontSize: 40 }}>
            {hole}
          </span>
        </div>
        <button
          aria-label={dict.nextHole}
          onClick={() => setHole((h) => Math.min(state.holeCount, h + 1))}
          style={navButton}
        >
          ›
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visible.map((challenge) => {
          const groups = draftGroups(challenge.id)
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
                  const editing = draftGroups(challenge.id) !== null
                  const pending = pendingPoints(challenge.id, player.id)
                  const saved = savedPoints(challenge.id, player.id)
                  // While editing, the draft is the whole truth for this
                  // challenge and hole — a cell left out of it will be cleared.
                  const shown = editing ? pending : saved
                  // A selected player is highlighted even where the points run
                  // out (a fourth place in a 3·2·1 game scores 0 but is still
                  // part of what will be saved).
                  const highlight = editing ? pending !== null : saved !== null && saved > 0
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

              {!readOnly && groups !== null && (
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
                  {groups.length === 0
                    ? dict.clearChallengeOnHole(challenge.name)
                    : dict.saveChallenge(challenge.name)}
                </button>
              )}
              {tieError === challenge.name && (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '0 12px 10px' }}>
                  {dict.tiesNotAllowed(challenge.name)}
                </div>
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
          {dict.standings}
        </div>
        <ScoreGrid players={state.players} standings={state.standings} />
      </div>

      {!readOnly &&
        // Finishing locks the round for good — a DB trigger seals it and no
        // route reopens it — so it takes a deliberate second tap.
        (confirmingFinish ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{dict.finishLockWarning}</div>
            <Button style={{ width: '100%' }} onClick={() => void finish()}>
              {dict.yesFinishRound}
            </Button>
            <Button
              variant="secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => setConfirmingFinish(false)}
            >
              {dict.keepPlaying}
            </Button>
          </div>
        ) : (
          <Button style={{ width: '100%', marginTop: 16 }} onClick={() => setConfirmingFinish(true)}>
            {dict.finishRound}
          </Button>
        ))}
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
