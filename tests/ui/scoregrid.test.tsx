import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreGrid } from '@/components/ScoreGrid'

const players = [
  { id: 'a', name: 'Domi', archived: false },
  { id: 'b', name: 'Sämi', archived: false },
]

describe('ScoreGrid', () => {
  it('shows one column per player with their total', () => {
    render(<ScoreGrid players={players} standings={[{ playerId: 'a', points: 11 }, { playerId: 'b', points: 14 }]} />)
    expect(screen.getByText('DO')).toBeDefined()
    expect(screen.getByText('SÄ')).toBeDefined()
    expect(screen.getByText('11')).toBeDefined()
    expect(screen.getByText('14')).toBeDefined()
  })

  it('marks the leader', () => {
    render(
      <ScoreGrid
        players={players}
        standings={[{ playerId: 'a', points: 11 }, { playerId: 'b', points: 14 }]}
        leaderId="b"
      />,
    )
    expect(screen.getByTestId('column-b').getAttribute('data-leader')).toBe('true')
    expect(screen.getByTestId('column-a').getAttribute('data-leader')).toBe('false')
  })

  it('shows zero for a player with no results', () => {
    render(<ScoreGrid players={players} standings={[{ playerId: 'a', points: 3 }]} />)
    expect(screen.getByTestId('column-b').textContent).toContain('0')
  })
})
