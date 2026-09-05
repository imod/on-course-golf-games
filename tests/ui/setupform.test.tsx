import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetupForm } from '@/app/setup/SetupForm'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const players = [
  { id: 'p1', name: 'Domi', archived: false },
  { id: 'p2', name: 'Res', archived: false },
]

const challenges = [
  {
    id: 'c1',
    name: 'Nearest to the pin',
    description: '',
    points: [3, 2, 1],
    scope: 'per_hole' as const,
    allowTies: false,
    archived: false,
  },
]

describe('SetupForm', () => {
  beforeEach(() => {
    push.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'K7QFM2XT9R' }), { status: 200 })),
    )
  })

  it('starts with nothing selected and the start button disabled', () => {
    render(<SetupForm players={players} challenges={challenges} />)
    expect(screen.getByRole('button', { name: /start round/i }).hasAttribute('disabled')).toBe(true)
  })

  it('enables start once a player and a game are chosen', () => {
    render(<SetupForm players={players} challenges={challenges} />)
    fireEvent.click(screen.getByRole('button', { name: 'Domi' }))
    fireEvent.click(screen.getByRole('button', { name: /nearest to the pin/i }))
    expect(screen.getByRole('button', { name: /start round/i }).hasAttribute('disabled')).toBe(false)
  })

  it('posts the round and navigates to it', async () => {
    render(<SetupForm players={players} challenges={challenges} />)
    fireEvent.click(screen.getByRole('button', { name: 'Domi' }))
    fireEvent.click(screen.getByRole('button', { name: /nearest to the pin/i }))
    fireEvent.change(screen.getByLabelText(/where/i), { target: { value: 'Breitenloo' } })
    fireEvent.click(screen.getByRole('button', { name: /start round/i }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/r/K7QFM2XT9R'))

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({ name: 'Breitenloo', playerIds: ['p1'] })
    expect(body.challenges).toEqual([{ challengeId: 'c1', holes: null }])
  })
})
