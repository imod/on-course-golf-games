'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import type { Challenge, Player } from '@/lib/types'

const KEY = 'golf-admin-password'

export function AdminPanel() {
  const [password, setPassword] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY)
    if (stored) setPassword(stored)
  }, [])

  const load = useCallback(async (secret: string) => {
    const headers = { 'x-admin-password': secret, 'content-type': 'application/json' }
    const [c, p] = await Promise.all([
      fetch('/api/admin/challenges?archived=true', { headers }),
      fetch('/api/admin/players?archived=true', { headers }),
    ])

    if (!c.ok || !p.ok) {
      setError('Wrong password.')
      setPassword(null)
      window.localStorage.removeItem(KEY)
      return
    }

    setError(null)
    setChallenges((await c.json()) as Challenge[])
    setPlayers((await p.json()) as Player[])
  }, [])

  useEffect(() => {
    if (password) void load(password)
  }, [password, load])

  async function addPlayer(name: string) {
    if (!password || name.trim() === '') return
    await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'x-admin-password': password, 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    await load(password)
  }

  async function toggleArchived(challenge: Challenge) {
    if (!password) return
    await fetch('/api/admin/challenges', {
      method: 'PATCH',
      headers: { 'x-admin-password': password, 'content-type': 'application/json' },
      body: JSON.stringify({ id: challenge.id, archived: !challenge.archived }),
    })
    await load(password)
  }

  if (!password) {
    return (
      <div style={{ maxWidth: 380, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="admin-password" style={{ fontSize: 15 }}>
          House password
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
          Unlock
        </Button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '34px 40px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, margin: '0 0 6px' }}>Games &amp; players</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
        Edits here apply to future rounds only — every round keeps the settings it started with.
      </p>

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
                {challenge.scope === 'per_hole' ? 'per hole' : 'per round'}
              </div>
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
                {challenge.archived ? 'Restore' : 'Archive'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ borderLeft: '1.5px solid var(--ink)', paddingLeft: 40 }}>
          {players.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 56,
                borderBottom: '1px solid var(--rule)',
                color: player.archived ? 'var(--disabled)' : 'var(--ink)',
              }}
            >
              <div style={{ fontSize: 17 }}>{player.name}</div>
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
              aria-label="New player name"
              placeholder="New player"
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
              Add
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
