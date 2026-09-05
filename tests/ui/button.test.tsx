import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/Button'

describe('Button', () => {
  it('renders its children for the primary variant', () => {
    render(<Button variant="primary">Save</Button>)
    expect(screen.getByText('Save')).toBeDefined()
  })

  it('renders its children for the secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>)
    expect(screen.getByText('Cancel')).toBeDefined()
  })

  it('fills the primary variant with ink and cream text', () => {
    render(<Button variant="primary">Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.style.background).toBe('var(--ink)')
    expect(button.style.color).toBe('var(--paper)')
    expect(button.style.borderStyle).toBe('none')
  })

  it('outlines the secondary variant on a transparent ground', () => {
    render(<Button variant="secondary">Cancel</Button>)
    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.style.background).toBe('transparent')
    expect(button.style.color).toBe('var(--ink)')
    expect(button.style.border).toBe('1.5px solid var(--ink)')
  })

  it('is 56px tall for both variants', () => {
    render(<Button variant="primary">Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' }).style.height).toBe('56px')
  })
})
