'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { LanguageToggle } from '@/components/LanguageToggle'
import { getDict, type Locale } from '@/lib/i18n'
import type { Challenge, Player } from '@/lib/types'

const KEY = 'golf-admin-password'

export function AdminPanel({ locale }: { locale: Locale }) {
  const dict = getDict(locale)
  const NETWORK_ERROR_MESSAGE = dict.networkError
  const [password, setPassword] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY)
    if (stored) setPassword(stored)
  }, [])

  const load = useCallback(async (secret: string) => {
    const headers = { 'x-admin-password': secret, 'content-type': 'application/json' }
    try {
      const [c, p] = await Promise.all([
        fetch('/api/admin/challenges?archived=true', { headers }),
        fetch('/api/admin/players?archived=true', { headers }),
      ])

      if (!c.ok || !p.ok) {
        setError(dict.wrongPassword)
        setPassword(null)
        window.localStorage.removeItem(KEY)
        return
      }

      setError(null)
      setNetworkError(null)
      setChallenges((await c.json()) as Challenge[])
      setPlayers((await p.json()) as Player[])
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

  async function addPlayer(name: string) {
    if (!password || name.trim() === '') return
    try {
      await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'x-admin-password': password, 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
    } catch {
      setNetworkError(NETWORK_ERROR_MESSAGE)
      return
    }
    await load(password)
  }

  async function toggleArchived(challenge: Challenge) {
    if (!password) return
    try {
      await fetch('/api/admin/challenges', {
        method: 'PATCH',
        headers: { 'x-admin-password': password, 'content-type': 'application/json' },
        body: JSON.stringify({ id: challenge.id, archived: !challenge.archived }),
      })
    } catch {
      setNetworkError(NETWORK_ERROR_MESSAGE)
      return
    }
    await load(password)
  }

  async function togglePlayerArchived(player: Player) {
    if (!password) return
    try {
      await fetch('/api/admin/players', {
        method: 'PATCH',
        headers: { 'x-admin-password': password, 'content-type': 'application/json' },
        body: JSON.stringify({ id: player.id, archived: !player.archived }),
      })
    } catch {
      setNetworkError(NETWORK_ERROR_MESSAGE)
      return
    }
    await load(password)
  }

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
    </div>
  )
}
