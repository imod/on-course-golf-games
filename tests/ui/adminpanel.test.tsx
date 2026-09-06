import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AdminPanel } from '@/app/admin/AdminPanel'

// The language toggle in the header uses next/navigation's router to
// refresh the page after switching locales; jsdom has no app router mounted.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

describe('AdminPanel', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(url).includes('players')
                ? [{ id: 'p1', name: 'Domi', archived: false }]
                : [
                    {
                      id: 'c1',
                      name: 'Nearest to the pin',
                      description: '',
                      points: [3, 2, 1],
                      scope: 'per_hole',
                      allowTies: false,
                      archived: false,
                    },
                  ],
            ),
            { status: 200 },
          ),
        ),
      ),
    )
  })

  it('asks for the password before loading anything', () => {
    render(<AdminPanel locale="en" />)
    expect(screen.getByLabelText(/house password/i)).toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads the catalog once unlocked and sends the password header', async () => {
    render(<AdminPanel locale="en" />)
    fireEvent.change(screen.getByLabelText(/house password/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await screen.findByText('Nearest to the pin')
    await screen.findByText('Domi')

    const headers = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((headers.headers as Record<string, string>)['x-admin-password']).toBe('secret')
  })

  it('remembers the password across mounts', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)
    await screen.findByText('Nearest to the pin')
  })

  it('shows a network error without clearing the stored password or returning to the prompt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    window.localStorage.setItem('golf-admin-password', 'secret')

    render(<AdminPanel locale="en" />)

    await screen.findByText(/network/i)
    expect(screen.queryByLabelText(/house password/i)).toBeNull()
    expect(window.localStorage.getItem('golf-admin-password')).toBe('secret')
  })

  it('archives a player via the toggle, sending a PATCH with the password header', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)

    const playerName = await screen.findByText('Domi')
    const playerRow = playerName.parentElement?.parentElement as HTMLElement
    fireEvent.click(within(playerRow).getByRole('button', { name: /archive/i }))

    await vi.waitFor(() => {
      const patchCall = vi
        .mocked(fetch)
        .mock.calls.find((call) => String(call[0]) === '/api/admin/players' && call[1]?.method === 'PATCH')
      expect(patchCall).toBeDefined()
    })

    const patchCall = vi
      .mocked(fetch)
      .mock.calls.find((call) => String(call[0]) === '/api/admin/players' && call[1]?.method === 'PATCH')
    const init = patchCall?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['x-admin-password']).toBe('secret')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'p1', archived: true })
  })

  it('creates a game via the new-game form, posting the right body with the password header', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)

    await screen.findByText('Nearest to the pin')

    fireEvent.change(screen.getByLabelText(/game name/i), { target: { value: 'Fewest putts' } })
    fireEvent.change(screen.getByLabelText(/points/i), { target: { value: '3, 2, 1' } })
    fireEvent.click(screen.getByRole('button', { name: /add game/i }))

    await vi.waitFor(() => {
      const postCall = vi
        .mocked(fetch)
        .mock.calls.find((call) => String(call[0]) === '/api/admin/challenges' && call[1]?.method === 'POST')
      expect(postCall).toBeDefined()
    })

    const postCall = vi
      .mocked(fetch)
      .mock.calls.find((call) => String(call[0]) === '/api/admin/challenges' && call[1]?.method === 'POST')
    const init = postCall?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['x-admin-password']).toBe('secret')
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Fewest putts',
      points: [3, 2, 1],
      scope: 'per_hole',
      allowTies: false,
    })
  })

  it('reloads the catalog after creating a game', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)

    await screen.findByText('Nearest to the pin')
    const callsBefore = vi.mocked(fetch).mock.calls.length

    fireEvent.change(screen.getByLabelText(/game name/i), { target: { value: 'Fewest putts' } })
    fireEvent.change(screen.getByLabelText(/points/i), { target: { value: '3, 2, 1' } })
    fireEvent.click(screen.getByRole('button', { name: /add game/i }))

    await vi.waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore + 1)
    })
  })

  it('surfaces unparseable points instead of silently dropping them, and does not submit', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)

    await screen.findByText('Nearest to the pin')
    const callsBefore = vi.mocked(fetch).mock.calls.length

    fireEvent.change(screen.getByLabelText(/game name/i), { target: { value: 'Fewest putts' } })
    fireEvent.change(screen.getByLabelText(/points/i), { target: { value: '3, 2, i' } })
    fireEvent.click(screen.getByRole('button', { name: /add game/i }))

    expect(await screen.findByText(/not a whole number.*i/i)).toBeDefined()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })

  it('shows a network error when creating a game fails at the network level, without clearing the stored password', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="en" />)

    await screen.findByText('Nearest to the pin')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    fireEvent.change(screen.getByLabelText(/game name/i), { target: { value: 'Fewest putts' } })
    fireEvent.change(screen.getByLabelText(/points/i), { target: { value: '3, 2, 1' } })
    fireEvent.click(screen.getByRole('button', { name: /add game/i }))

    await screen.findByText(/network/i)
    expect(window.localStorage.getItem('golf-admin-password')).toBe('secret')
  })
})

describe('AdminPanel in German', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(url).includes('players')
                ? [{ id: 'p1', name: 'Domi', archived: false }]
                : [
                    {
                      id: 'c1',
                      name: 'Nearest to the pin',
                      description: '',
                      points: [3, 2, 1],
                      scope: 'per_hole',
                      allowTies: false,
                      archived: false,
                    },
                  ],
            ),
            { status: 200 },
          ),
        ),
      ),
    )
  })

  it('shows the German password prompt before unlocking', () => {
    render(<AdminPanel locale="de" />)
    expect(screen.getByLabelText(/^passwort$/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /entsperren/i })).toBeDefined()
  })

  it('shows German headings and scope labels once unlocked, but leaves catalog data untranslated', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel locale="de" />)

    await screen.findByText('Nearest to the pin')
    expect(screen.getByText('Spiele & Spieler')).toBeDefined()
    expect(screen.getByText('pro Loch')).toBeDefined()
    expect(screen.getAllByRole('button', { name: /archivieren/i }).length).toBeGreaterThan(0)
  })
})
