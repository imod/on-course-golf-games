import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreGrid } from '@/components/ScoreGrid'

const players = [
  { id: 'a', name: 'Domi', archived: false },
  { id: 'b', name: 'Sämi', archived: false },
]

describe('ScoreGrid', () => {
  it('shows one column per player with their total', () => {
    render(<ScoreGrid players={players} standings={[{ playerId: 'a', points: 11, badPoints: 0 }, { playerId: 'b', points: 14, badPoints: 0 }]} />)
    expect(screen.getByText('DO')).toBeDefined()
    expect(screen.getByText('SÄ')).toBeDefined()
    expect(screen.getByText('11')).toBeDefined()
    expect(screen.getByText('14')).toBeDefined()
  })

  it('marks the leader', () => {
    render(
      <ScoreGrid
        players={players}
        standings={[{ playerId: 'a', points: 11, badPoints: 0 }, { playerId: 'b', points: 14, badPoints: 0 }]}
        leaderId="b"
      />,
    )
    expect(screen.getByTestId('column-b').getAttribute('data-leader')).toBe('true')
    expect(screen.getByTestId('column-a').getAttribute('data-leader')).toBe('false')
  })

  it('shows zero for a player with no results', () => {
    render(<ScoreGrid players={players} standings={[{ playerId: 'a', points: 3, badPoints: 0 }]} />)
    expect(screen.getByTestId('column-b').textContent).toContain('0')
  })

  it('shows the bad-point total instead when asked for it', () => {
    render(
      <ScoreGrid
        players={players}
        standings={[
          { playerId: 'a', points: 11, badPoints: 2 },
          { playerId: 'b', points: 14, badPoints: 0 },
        ]}
        total="badPoints"
        leaderId="b"
      />,
    )
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.queryByText('11')).toBeNull()
    expect(screen.getByTestId('column-b').getAttribute('data-leader')).toBe('true')
  })
})
