'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { LanguageToggle } from '@/components/LanguageToggle'
import { formatDate, getDict, type Locale } from '@/lib/i18n'
import { BackLink } from '@/components/BackLink'
import type { Challenge, Player } from '@/lib/types'
import type { RoundSummary } from '@/server/rounds'

const KEY = 'golf-admin-password'

export type ParsedPoints = { value: number[] | null; invalid: string[] }

/**
 * Points, highest place first, as a comma-separated list — same idiom as the
 * setup screen's hole list. Unlike holes, a partially-bad list is never
 * trimmed down to the tokens that did parse: dropping just the bad entry
 * would silently turn e.g. "3, 2, i" into a two-place game instead of the
 * intended three-place one, which is a different game, not a smaller typo.
 * So any unparseable token blocks the whole list (value: null) until fixed.
 */
export function parsePoints(value: string): ParsedPoints {
  const tokens = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')

  if (tokens.length === 0) return { value: null, invalid: [] }

  const valid: number[] = []
  const invalid: string[] = []
  for (const token of tokens) {
    const n = Number(token)
    if (Number.isInteger(n)) {
      valid.push(n)
    } else {
      invalid.push(token)
    }
  }

  return { value: invalid.length === 0 ? valid : null, invalid }
}

export function AdminPanel({ locale }: { locale: Locale }) {
  const dict = getDict(locale)
  const NETWORK_ERROR_MESSAGE = dict.networkError
  const [password, setPassword] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [newChallengeName, setNewChallengeName] = useState('')
  const [newChallengePoints, setNewChallengePoints] = useState('')
  const [newChallengeScope, setNewChallengeScope] = useState<'per_hole' | 'per_round'>('per_hole')
  const [newChallengeAllowTies, setNewChallengeAllowTies] = useState(false)
  const [newChallengeBadPoints, setNewChallengeBadPoints] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY)
    if (stored) setPassword(stored)
  }, [])

  const load = useCallback(async (secret: string) => {
    const headers = { 'x-admin-password': secret, 'content-type': 'application/json' }
    try {
      const [c, p, r] = await Promise.all([
        fetch('/api/admin/challenges?archived=true', { headers }),
        fetch('/api/admin/players?archived=true', { headers }),
        fetch('/api/rounds', { headers }),
      ])

      if (!c.ok || !p.ok || !r.ok) {
        setError(dict.wrongPassword)
        setPassword(null)
        window.localStorage.removeItem(KEY)
        return
      }

      setError(null)
      setNetworkError(null)
      setChallenges((await c.json()) as Challenge[])
      setPlayers((await p.json()) as Player[])
      setRounds((await r.json()) as RoundSummary[])
    } catch {
      // Network-level failure (offline, DNS, timeout) is not a rejected
      // password: surface it distinctly and leave the stored password and
      // unlocked state alone so a wifi hiccup doesn't log the user out.
      setNetworkError(NETWORK_ERROR_MESSAGE)
    }
  }, [dict, NETWORK_ERROR_MESSAGE])

  useEffect(() => {
    if (password) void load(password)
  }, [password, load])

  /**
   * Sends one admin write. A rejected write is reported rather than swallowed:
   * reloading after a failure shows the unchanged catalog, which is
   * indistinguishable from the button doing nothing at all.
   */
  async function write(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<boolean> {
    if (!password) return false
    try {
      const response = await fetch(url, {
        method,
        headers: { 'x-admin-password': password, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        setNetworkError(dict.couldNotSaveTryAgain)
        return false
      }
    } catch {
      setNetworkError(NETWORK_ERROR_MESSAGE)
      return false
    }
    setNetworkError(null)
    await load(password)
    return true
  }

  async function addPlayer(name: string) {
    if (name.trim() === '') return
    await write('/api/admin/players', 'POST', { name: name.trim() })
  }

  async function addChallenge() {
    if (newChallengeName.trim() === '') return
    const points = parsePoints(newChallengePoints).value
    if (!points || points.length === 0) return

    const created = await write('/api/admin/challenges', 'POST', {
      name: newChallengeName.trim(),
      points,
      scope: newChallengeScope,
      allowTies: newChallengeAllowTies,
      badPoints: newChallengeBadPoints,
    })
    // The form is only emptied once the game really exists; otherwise what
    // was typed would have to be remembered and retyped.
    if (!created) return

    setNewChallengeName('')
    setNewChallengePoints('')
    setNewChallengeScope('per_hole')
    setNewChallengeAllowTies(false)
    setNewChallengeBadPoints(false)
  }

  async function toggleArchived(challenge: Challenge) {
    await write('/api/admin/challenges', 'PATCH', {
      id: challenge.id,
      archived: !challenge.archived,
    })
  }

  async function togglePlayerArchived(player: Player) {
    await write('/api/admin/players', 'PATCH', { id: player.id, archived: !player.archived })
  }

  async function deleteRound(code: string) {
    if (!password) return
    setConfirmingDelete(null)
    try {
      const response = await fetch(`/api/rounds/${code}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      })
      if (!response.ok) {
        setNetworkError(dict.couldNotDeleteRound)
        return
      }
    } catch {
      setNetworkError(NETWORK_ERROR_MESSAGE)
      return
    }
    await load(password)
  }

  const parsedNewChallengePoints = parsePoints(newChallengePoints)

  if (!password) {
    return (
      <div style={{ maxWidth: 380, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageToggle locale={locale} />
        </div>
        <label htmlFor="admin-password" style={{ fontSize: 15 }}>
          {dict.housePassword}
        </label>
        <input
          id="admin-password"
          type="password"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          style={{
            height: 48,
            padding: '0 12px',
            fontSize: 16,
            fontFamily: 'var(--sans)',
            border: '1.5px solid var(--ink)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--ink)',
          }}
        />
        {error && <div style={{ fontSize: 14 }}>{error}</div>}
        <Button
          onClick={() => {
            window.localStorage.setItem(KEY, typed)
            setPassword(typed)
          }}
        >
          {dict.unlock}
        </Button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '34px 40px' }}>
      <BackLink locale={locale} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, margin: '0 0 6px' }}>{dict.gamesAndPlayers}</h1>
        <LanguageToggle locale={locale} />
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>{dict.adminHint}</p>

      {networkError && (
        <div role="alert" style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
          {networkError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 40, marginTop: 28 }}>
        <div>
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                height: 62,
                borderBottom: '1px solid var(--rule)',
                color: challenge.archived ? 'var(--disabled)' : 'var(--ink)',
              }}
            >
              <div style={{ flexGrow: 1, fontSize: 17, fontWeight: 500 }}>{challenge.name}</div>
              <div style={{ fontSize: 15, color: 'var(--muted)' }}>
                {challenge.scope === 'per_hole' ? dict.perHole : dict.perRound}
              </div>
              {challenge.badPoints && (
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    border: '1px solid var(--rule)',
                    borderRadius: 999,
                    padding: '3px 9px',
                    color: 'var(--muted)',
                  }}
                >
                  {dict.badPointsMarker}
                </div>
              )}
              <div style={{ fontSize: 15 }}>{challenge.points.join(' · ')}</div>
              <button
                onClick={() => void toggleArchived(challenge)}
                style={{
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1.5px solid var(--rule)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                }}
              >
                {challenge.archived ? dict.restore : dict.archive}
              </button>
            </div>
          ))}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void addChallenge()
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                aria-label={dict.newChallengeNameLabel}
                placeholder={dict.newChallengeNamePlaceholder}
                value={newChallengeName}
                onChange={(event) => setNewChallengeName(event.target.value)}
                style={{
                  flexGrow: 1,
                  height: 48,
                  padding: '0 12px',
                  fontSize: 15,
                  fontFamily: 'var(--sans)',
                  border: '1.5px solid var(--rule)',
                  borderRadius: 6,
                  background: 'transparent',
                  color: 'var(--ink)',
                }}
              />
              <input
                aria-label={dict.newChallengePointsLabel}
                placeholder={dict.newChallengePointsPlaceholder}
                value={newChallengePoints}
                onChange={(event) => setNewChallengePoints(event.target.value)}
                style={{
                  width: 220,
                  height: 48,
                  padding: '0 12px',
                  fontSize: 15,
                  fontFamily: 'var(--sans)',
                  border: '1.5px solid var(--rule)',
                  borderRadius: 6,
                  background: 'transparent',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {parsedNewChallengePoints.invalid.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {dict.invalidPoints(parsedNewChallengePoints.invalid.join(', '))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['per_hole', 'per_round'] as const).map((scope) => {
                const on = newChallengeScope === scope
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setNewChallengeScope(scope)}
                    style={{
                      height: 44,
                      padding: '0 14px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontFamily: 'var(--sans)',
                      cursor: 'pointer',
                      background: on ? 'var(--ink)' : 'transparent',
                      color: on ? 'var(--paper)' : 'var(--muted)',
                      border: on ? 'none' : '1.5px solid var(--placeholder)',
                    }}
                  >
                    {scope === 'per_hole' ? dict.perHoleOption : dict.perRoundOption}
                  </button>
                )
              })}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 44,
                  fontSize: 14,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={newChallengeAllowTies}
                  onChange={(event) => setNewChallengeAllowTies(event.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                />
                {dict.allowTiesLabel}
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 44,
                  fontSize: 14,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={newChallengeBadPoints}
                  onChange={(event) => setNewChallengeBadPoints(event.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                />
                {dict.badPointsLabel}
              </label>
            </div>

            <Button
              type="submit"
              variant="secondary"
              disabled={
                newChallengeName.trim() === '' ||
                !parsedNewChallengePoints.value ||
                parsedNewChallengePoints.value.length === 0
              }
              style={{ height: 48, padding: '0 16px', fontSize: 15, alignSelf: 'flex-start' }}
            >
              {dict.addGame}
            </Button>
          </form>
        </div>

        <div style={{ borderLeft: '1.5px solid var(--ink)', paddingLeft: 40 }}>
          {players.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                height: 56,
                borderBottom: '1px solid var(--rule)',
                color: player.archived ? 'var(--disabled)' : 'var(--ink)',
              }}
            >
              <div style={{ flexGrow: 1, fontSize: 17 }}>{player.name}</div>
              <button
                onClick={() => void togglePlayerArchived(player)}
                style={{
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1.5px solid var(--rule)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                }}
              >
                {player.archived ? dict.restore : dict.archive}
              </button>
            </div>
          ))}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              const input = event.currentTarget.elements.namedItem('name') as HTMLInputElement
              void addPlayer(input.value)
              input.value = ''
            }}
            style={{ display: 'flex', gap: 8, marginTop: 14 }}
          >
            <input
              name="name"
              aria-label={dict.newPlayerLabel}
              placeholder={dict.newPlayerPlaceholder}
              style={{
                flexGrow: 1,
                height: 48,
                padding: '0 12px',
                fontSize: 15,
                fontFamily: 'var(--sans)',
                border: '1.5px solid var(--rule)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--ink)',
              }}
            />
            <Button type="submit" variant="secondary" style={{ height: 48, padding: '0 16px', fontSize: 15 }}>
              {dict.add}
            </Button>
          </form>
        </div>
      </div>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: '0 0 10px' }}>{dict.roundsHeading}</h2>

        {rounds.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 15 }}>{dict.noRoundsYet}</div>}

        {rounds.map((round) => (
          <div
            key={round.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              minHeight: 62,
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div style={{ flexGrow: 1, fontSize: 17, fontWeight: 500 }}>{round.name}</div>
            <div style={{ fontSize: 15, color: 'var(--muted)' }}>{formatDate(round.playedOn, locale)}</div>
            <div style={{ fontSize: 15, color: 'var(--muted)' }}>
              {round.status === 'open' ? dict.inPlay : dict.finishedSuffix}
            </div>
            <div style={{ fontSize: 13, letterSpacing: 1.1, color: 'var(--muted)' }}>{round.code}</div>

            {confirmingDelete === round.code ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{dict.confirmDeleteRound(round.name)}</span>
                <Button
                  onClick={() => void deleteRound(round.code)}
                  style={{ height: 44, padding: '0 14px', fontSize: 14 }}
                >
                  {dict.yesDeleteRound}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmingDelete(null)}
                  style={{ height: 44, padding: '0 14px', fontSize: 14 }}
                >
                  {dict.cancel}
                </Button>
              </div>
            ) : (
              // Deleting a round destroys its results for good, so it takes a
              // deliberate second tap — same shape as finishing a round.
              <button
                onClick={() => setConfirmingDelete(round.code)}
                style={{
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1.5px solid var(--rule)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                }}
              >
                {dict.deleteRound}
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
