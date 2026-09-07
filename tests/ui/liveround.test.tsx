import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LiveRound } from '@/app/r/[code]/LiveRound'
import type { RoundState } from '@/lib/types'

vi.mock('@/lib/supabase-browser', () => ({
  browserClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  }),
}))

// The language toggle in the header uses next/navigation's router to
// refresh the page after switching locales; jsdom has no app router mounted.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

const initial: RoundState = {
  id: 'r1',
  code: 'K7QFM2XT9R',
  name: 'Breitenloo',
  playedOn: '2026-09-12',
  holeCount: 18,
  status: 'open',
  players: [
    { id: 'p1', name: 'Domi', archived: false },
    { id: 'p2', name: 'Res', archived: false },
  ],
  challenges: [
    { id: 'c1', name: 'Nearest pin', points: [3, 2, 1], scope: 'per_hole', allowTies: false, holes: null },
  ],
  results: [],
  standings: [
    { playerId: 'p1', points: 0 },
    { playerId: 'p2', points: 0 },
  ],
}

/** The same round with hole 1 of the challenge already scored: Domi first. */
const withSaved: RoundState = {
  ...initial,
  results: [{ roundChallengeId: 'c1', hole: 1, playerId: 'p1', rank: 1, points: 3 }],
  standings: [
    { playerId: 'p1', points: 3 },
    { playerId: 'p2', points: 0 },
  ],
}

/** The same round plus a second, tie-allowing challenge. */
const tieAllowedRound: RoundState = {
  ...initial,
  challenges: [
    ...initial.challenges,
    { id: 'c2', name: 'Fewest putts', points: [2, 1], scope: 'per_hole', allowTies: true, holes: null },
  ],
}

describe('LiveRound', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...initial,
            results: [{ roundChallengeId: 'c1', hole: 1, playerId: 'p1', rank: 1, points: 3 }],
            standings: [
              { playerId: 'p1', points: 3 },
              { playerId: 'p2', points: 0 },
            ],
          }),
          { status: 200 },
        ),
      ),
    )
  })

  it('starts on hole 1 and steps forward', () => {
    render(<LiveRound initial={initial} locale="en" />)
    expect(screen.getByTestId('hole-number').textContent).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: /next hole/i }))
    expect(screen.getByTestId('hole-number').textContent).toBe('2')
  })

  it('does not step past the last hole or before the first', () => {
    render(<LiveRound initial={initial} locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /previous hole/i }))
    expect(screen.getByTestId('hole-number').textContent).toBe('1')
  })

  it('posts placements when cells are tapped in order and confirmed', async () => {
    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')

    fireEvent.click(screen.getByTestId('save-c1'))

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/rounds/K7QFM2XT9R/results')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      roundChallengeId: 'c1',
      hole: 1,
      placements: [['p1']],
    })
  })

  it('seeds the draft from the saved result instead of starting empty', () => {
    render(<LiveRound initial={withSaved} locale="en" />)

    // Before any tap the saved points are on screen.
    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')

    // Adding second place must leave first place exactly where it was.
    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')
    expect(screen.getByTestId('cell-c1-p2').textContent).toContain('2')
  })

  it('does not drop the saved entries when one player is corrected', async () => {
    render(<LiveRound initial={withSaved} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    fireEvent.click(screen.getByTestId('save-c1'))

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      roundChallengeId: 'c1',
      hole: 1,
      placements: [['p1'], ['p2']],
    })
  })

  it('lets an entry be cleared by deselecting everyone, and says so', async () => {
    render(<LiveRound initial={withSaved} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    expect(screen.getByTestId('cell-c1-p1').textContent).not.toContain('3')
    expect(screen.getByTestId('save-c1').textContent).toMatch(/clear/i)

    fireEvent.click(screen.getByTestId('save-c1'))

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string).placements).toEqual([])
  })

  it('keeps drafts on separate holes apart', () => {
    render(<LiveRound initial={withSaved} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    fireEvent.click(screen.getByRole('button', { name: /next hole/i }))

    // Hole 2 has nothing saved and nothing drafted.
    expect(screen.getByTestId('cell-c1-p1').textContent).not.toContain('3')
    expect(screen.getByTestId('cell-c1-p2').textContent).not.toContain('2')
    expect(screen.queryByTestId('save-c1')).toBeNull()
  })

  it('asks for confirmation before finishing the round', async () => {
    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByRole('button', { name: /^finish round$/i }))
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText(/locks this round/i)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /yes, finish round/i }))
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/rounds/K7QFM2XT9R/finish')
  })

  it('can back out of finishing the round', () => {
    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByRole('button', { name: /^finish round$/i }))
    fireEvent.click(screen.getByRole('button', { name: /keep playing/i }))

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^finish round$/i })).toBeDefined()
  })

  it('shows the round as read-only once finished', () => {
    render(<LiveRound initial={{ ...initial, status: 'finished' }} locale="en" />)
    expect(screen.queryByTestId('save-c1')).toBeNull()
    expect(screen.getByText(/finished/i)).toBeDefined()
  })

  it('shows an error and keeps the pending selection when save fails at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')

    fireEvent.click(screen.getByTestId('save-c1'))

    await vi.waitFor(() => expect(screen.getByText(/try again/i)).toBeDefined())

    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')
    expect(screen.getByTestId('save-c1')).toBeDefined()
  })

  it('ties a player with the previous pick on a second tap', async () => {
    render(<LiveRound initial={tieAllowedRound} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c2-p1'))
    fireEvent.click(screen.getByTestId('cell-c2-p2'))
    fireEvent.click(screen.getByTestId('cell-c2-p2'))

    expect(screen.getByTestId('cell-c2-p1').textContent).toContain('2')
    expect(screen.getByTestId('cell-c2-p2').textContent).toContain('2')

    fireEvent.click(screen.getByTestId('save-c2'))

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.placements).toEqual([['p1', 'p2']])
  })

  it('removes a tied player on a third tap', () => {
    render(<LiveRound initial={tieAllowedRound} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c2-p1'))
    fireEvent.click(screen.getByTestId('cell-c2-p2'))
    fireEvent.click(screen.getByTestId('cell-c2-p2'))
    fireEvent.click(screen.getByTestId('cell-c2-p2'))

    expect(screen.getByTestId('cell-c2-p2').textContent).not.toContain('2')
    expect(screen.getByTestId('cell-c2-p1').textContent).toContain('2')
  })

  it('removes the sole player in first place on a second tap', () => {
    render(<LiveRound initial={tieAllowedRound} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c2-p1'))
    expect(screen.getByTestId('cell-c2-p1').textContent).toContain('2')

    fireEvent.click(screen.getByTestId('cell-c2-p1'))
    expect(screen.getByTestId('cell-c2-p1').textContent).not.toContain('2')
  })

  it('refuses a tie when the challenge does not allow one', () => {
    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    fireEvent.click(screen.getByTestId('cell-c1-p2'))

    expect(screen.getByText(/ties are not allowed/i)).toBeDefined()
    expect(screen.getByTestId('cell-c1-p2').textContent).not.toContain('2')
    expect(screen.getByTestId('cell-c1-p1').textContent).toContain('3')
  })

  it('does not carry a refused-tie message to a hole where nothing was tapped', () => {
    render(<LiveRound initial={initial} locale="en" />)

    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    fireEvent.click(screen.getByTestId('cell-c1-p2'))
    expect(screen.getByText(/ties are not allowed/i)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /next hole/i }))

    expect(screen.queryByText(/ties are not allowed/i)).toBeNull()
  })

  it('seeds an existing tie back into the draft, grouped rather than flattened', () => {
    const withTie: RoundState = {
      ...tieAllowedRound,
      results: [
        { roundChallengeId: 'c2', hole: 1, playerId: 'p1', rank: 1, points: 2 },
        { roundChallengeId: 'c2', hole: 1, playerId: 'p2', rank: 1, points: 2 },
      ],
    }
    render(<LiveRound initial={withTie} locale="en" />)

    // Tap the *second* member of the tie. Under correct grouping this is
    // "already tied — remove just this player", leaving p1 alone at rank 1
    // and p2 unscored. Under a flattened seed (one place per saved result,
    // p1 first then p2 second), this tap would instead take the "alone in a
    // later place, ties allowed" branch and *join* p2 onto p1 — leaving both
    // still showing 2. Only the grouped seed produces the assertions below.
    fireEvent.click(screen.getByTestId('cell-c2-p2'))

    expect(screen.getByTestId('cell-c2-p1').textContent).toContain('2')
    expect(screen.getByTestId('cell-c2-p2').textContent).not.toContain('2')
  })
})

describe('LiveRound in German', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(initial), { status: 200 })))
  })

  it('renders German labels, date and hole navigation', () => {
    render(<LiveRound initial={initial} locale="de" />)
    expect(screen.getByText(/12\.09\.2026/)).toBeDefined()
    expect(screen.getByText(/2 Spieler/)).toBeDefined()
    expect(screen.getByRole('button', { name: /nächstes loch/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /vorheriges loch/i })).toBeDefined()
    expect(screen.getByText('Loch')).toBeDefined()
    expect(screen.getByRole('button', { name: /^runde beenden$/i })).toBeDefined()
    // Catalog data (the challenge name typed in /admin) is never translated.
    expect(screen.getByText('Nearest pin')).toBeDefined()
  })

  it('shows the German save label for a challenge', () => {
    render(<LiveRound initial={initial} locale="de" />)
    fireEvent.click(screen.getByTestId('cell-c1-p1'))
    expect(screen.getByTestId('save-c1').textContent).toMatch(/speichern/i)
  })
  it('links back to the rounds list, open or finished', () => {
    const { unmount } = render(<LiveRound initial={initial} locale="en" />)
    expect(screen.getByRole('link', { name: /all rounds/i }).getAttribute('href')).toBe('/')
    unmount()

    render(<LiveRound initial={{ ...initial, status: 'finished' }} locale="en" />)
    expect(screen.getByRole('link', { name: /all rounds/i }).getAttribute('href')).toBe('/')
  })

})
