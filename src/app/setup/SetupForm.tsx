'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import type { Challenge, Player } from '@/lib/types'

const ADMIN_PASSWORD_KEY = 'golf-admin-password'

export function SetupForm({ players, challenges }: { players: Player[]; challenges: Challenge[] }) {
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

  function parseHoles(value: string | undefined): number[] | null {
    if (!value || value.trim() === '') return null
    const parsed = value
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1)
    return parsed.length > 0 ? parsed : null
  }

  async function start() {
    setBusy(true)
    setError(null)

    const response = await fetch('/api/rounds', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': window.localStorage.getItem(ADMIN_PASSWORD_KEY) ?? '',
      },
      body: JSON.stringify({
        name: name.trim() === '' ? 'Round' : name.trim(),
        playerIds: chosenPlayers,
        challenges: chosenChallenges.map((id) => ({ challengeId: id, holes: parseHoles(holes[id]) })),
      }),
    })

    if (!response.ok) {
      setBusy(false)
      setError(response.status === 401 ? 'Enter the house password in Admin first.' : 'Could not start the round.')
      return
    }

    const { code } = (await response.json()) as { code: string }
    router.push(`/r/${code}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <label style={{ display: 'block' }}>
        <span
          style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--muted)' }}
        >
          Where
        </span>
        <input
          aria-label="Where"
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
          Flight
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
          Games
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {challenges.map((challenge) => {
            const on = chosenChallenges.includes(challenge.id)
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
                    {challenge.points.join(' · ')}
                    {challenge.allowTies ? ' · ties allowed' : ''}
                  </span>
                </button>

                {on && challenge.scope === 'per_hole' && (
                  <input
                    aria-label={`Holes for ${challenge.name}`}
                    placeholder="all holes — or 3, 7, 12, 16"
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
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <div style={{ color: 'var(--ink)', fontSize: 14 }}>{error}</div>}

      <Button disabled={!ready || busy} onClick={start}>
        Start round
      </Button>
    </div>
  )
}
