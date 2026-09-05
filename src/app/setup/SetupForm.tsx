'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import type { Challenge, Player } from '@/lib/types'
import { getDict, type Locale } from '@/lib/i18n'

const ADMIN_PASSWORD_KEY = 'golf-admin-password'

export type ParsedHoles = { value: number[] | null; invalid: string[] }

export function parseHoles(value: string | undefined): ParsedHoles {
  if (!value || value.trim() === '') return { value: null, invalid: [] }

  const tokens = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')

  if (tokens.length === 0) return { value: null, invalid: [] }

  const valid: number[] = []
  const invalid: string[] = []
  for (const token of tokens) {
    const n = Number(token)
    if (Number.isInteger(n) && n >= 1) {
      valid.push(n)
    } else {
      invalid.push(token)
    }
  }

  // A non-empty entry that could not be read as hole numbers must never be
  // silently treated as "all holes" (value: null) — that would apply the
  // game to every hole instead of none, which is the wrong direction to
  // fail in. An empty array means "matches no hole" until the user fixes it.
  return { value: valid.length > 0 ? valid : [], invalid }
}

export function SetupForm({
  players,
  challenges,
  locale,
}: {
  players: Player[]
  challenges: Challenge[]
  locale: Locale
}) {
  const dict = getDict(locale)
  const router = useRouter()
  const [name, setName] = useState('')
  const [chosenPlayers, setChosenPlayers] = useState<string[]>([])
  const [chosenChallenges, setChosenChallenges] = useState<string[]>([])
  const [holes, setHoles] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = chosenPlayers.length > 0 && chosenChallenges.length > 0

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  async function start() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': window.localStorage.getItem(ADMIN_PASSWORD_KEY) ?? '',
        },
        body: JSON.stringify({
          name: name.trim() === '' ? 'Round' : name.trim(),
          playerIds: chosenPlayers,
          challenges: chosenChallenges.map((id) => ({ challengeId: id, holes: parseHoles(holes[id]).value })),
        }),
      })

      if (!response.ok) {
        setError(response.status === 401 ? dict.enterHousePassword : dict.couldNotStartRound)
        return
      }

      const { code } = (await response.json()) as { code: string }
      router.push(`/r/${code}`)
    } catch {
      setError(dict.couldNotReachServer)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <label style={{ display: 'block' }}>
        <span
          style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)' }}
        >
          {dict.whereLabel}
        </span>
        <input
          aria-label={dict.whereLabel}
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 4,
            height: 44,
            padding: '0 12px',
            fontSize: 17,
            fontFamily: 'var(--sans)',
            color: 'var(--ink)',
            background: 'transparent',
            border: '1.5px solid var(--ink)',
            borderRadius: 6,
          }}
        />
      </label>

      <div>
        <div
          style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}
        >
          {dict.flightLabel}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {players.map((player) => {
            const on = chosenPlayers.includes(player.id)
            return (
              <button
                key={player.id}
                onClick={() => setChosenPlayers(toggle(chosenPlayers, player.id))}
                style={{
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 999,
                  fontSize: 16,
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--paper)' : 'var(--muted)',
                  border: on ? 'none' : '1.5px solid var(--placeholder)',
                }}
              >
                {player.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div
          style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}
        >
          {dict.gamesLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {challenges.map((challenge) => {
            const on = chosenChallenges.includes(challenge.id)
            const parsedHoles = parseHoles(holes[challenge.id])
            return (
              <div
                key={challenge.id}
                style={{
                  border: `1.5px solid ${on ? 'var(--ink)' : 'var(--rule)'}`,
                  borderRadius: 6,
                  padding: '12px 14px',
                }}
              >
                <button
                  onClick={() => setChosenChallenges(toggle(chosenChallenges, challenge.id))}
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: 44,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 500 }}>{challenge.name}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                    {/* No client can enter a tie today: the live round screen
                        and the watch API both send one player per rank. The
                        label is left off rather than advertising something
                        that is refused at entry. */}
                    {challenge.points.join(' · ')}
                  </span>
                </button>

                {on && challenge.scope === 'per_hole' && (
                  <>
                    <input
                      aria-label={dict.holesForLabel(challenge.name)}
                      placeholder={dict.holesPlaceholder}
                      value={holes[challenge.id] ?? ''}
                      onChange={(event) => setHoles({ ...holes, [challenge.id]: event.target.value })}
                      style={{
                        width: '100%',
                        marginTop: 10,
                        height: 44,
                        padding: '0 10px',
                        fontSize: 15,
                        fontFamily: 'var(--sans)',
                        background: 'transparent',
                        color: 'var(--ink)',
                        border: '1.5px solid var(--rule)',
                        borderRadius: 6,
                      }}
                    />
                    {parsedHoles.invalid.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                        {dict.invalidHoles(parsedHoles.invalid.join(', '))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <div style={{ color: 'var(--ink)', fontSize: 14 }}>{error}</div>}

      <Button disabled={!ready || busy} onClick={start}>
        {dict.startRound}
      </Button>
    </div>
  )
}
