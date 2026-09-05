import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AdminPanel } from '@/app/admin/AdminPanel'

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
    render(<AdminPanel />)
    expect(screen.getByLabelText(/house password/i)).toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads the catalog once unlocked and sends the password header', async () => {
    render(<AdminPanel />)
    fireEvent.change(screen.getByLabelText(/house password/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await screen.findByText('Nearest to the pin')
    await screen.findByText('Domi')

    const headers = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((headers.headers as Record<string, string>)['x-admin-password']).toBe('secret')
  })

  it('remembers the password across mounts', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel />)
    await screen.findByText('Nearest to the pin')
  })

  it('shows a network error without clearing the stored password or returning to the prompt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    window.localStorage.setItem('golf-admin-password', 'secret')

    render(<AdminPanel />)

    await screen.findByText(/network/i)
    expect(screen.queryByLabelText(/house password/i)).toBeNull()
    expect(window.localStorage.getItem('golf-admin-password')).toBe('secret')
  })

  it('archives a player via the toggle, sending a PATCH with the password header', async () => {
    window.localStorage.setItem('golf-admin-password', 'secret')
    render(<AdminPanel />)

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
})
