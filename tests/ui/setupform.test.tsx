import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetupForm, parseHoles } from '@/app/setup/SetupForm'

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

  it('re-enables Start and shows a message when the request fails at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<SetupForm players={players} challenges={challenges} />)
    fireEvent.click(screen.getByRole('button', { name: 'Domi' }))
    fireEvent.click(screen.getByRole('button', { name: /nearest to the pin/i }))
    fireEvent.click(screen.getByRole('button', { name: /start round/i }))

    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /start round/i }).hasAttribute('disabled')).toBe(false),
    )
    expect(screen.getByText(/could not reach the server/i)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  it('sends the parsed hole list when a valid list is entered', async () => {
    render(<SetupForm players={players} challenges={challenges} />)
    fireEvent.click(screen.getByRole('button', { name: 'Domi' }))
    fireEvent.click(screen.getByRole('button', { name: /nearest to the pin/i }))
    fireEvent.change(screen.getByLabelText(/holes for nearest to the pin/i), { target: { value: '3,,7' } })
    fireEvent.click(screen.getByRole('button', { name: /start round/i }))

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.challenges).toEqual([{ challengeId: 'c1', holes: [3, 7] }])
  })

  it('flags unreadable hole text instead of silently applying the game to all holes', async () => {
    render(<SetupForm players={players} challenges={challenges} />)
    fireEvent.click(screen.getByRole('button', { name: 'Domi' }))
    fireEvent.click(screen.getByRole('button', { name: /nearest to the pin/i }))
    fireEvent.change(screen.getByLabelText(/holes for nearest to the pin/i), { target: { value: 'abc' } })

    expect(screen.getByText(/ignored: abc/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /start round/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.challenges).toEqual([{ challengeId: 'c1', holes: [] }])
  })
})

describe('parseHoles', () => {
  it('treats an empty entry as all holes', () => {
    expect(parseHoles(undefined)).toEqual({ value: null, invalid: [] })
    expect(parseHoles('   ')).toEqual({ value: null, invalid: [] })
  })

  it('parses a valid comma-separated list, ignoring blank segments', () => {
    expect(parseHoles('3,,7')).toEqual({ value: [3, 7], invalid: [] })
  })

  it('separates unreadable tokens instead of collapsing to all holes', () => {
    expect(parseHoles('abc')).toEqual({ value: [], invalid: ['abc'] })
  })

  it('keeps the valid numbers and reports the rest when mixed', () => {
    expect(parseHoles('3, abc, 0, 7')).toEqual({ value: [3, 7], invalid: ['abc', '0'] })
  })
})
