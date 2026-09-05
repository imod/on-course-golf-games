import { describe, it, expect } from 'vitest'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateRoundCode,
  isValidRoundCode,
  normalizeRoundCode,
} from '@/lib/codes'

describe('round codes', () => {
  it('uses a 32-character alphabet with no ambiguous letters', () => {
    expect(CODE_ALPHABET).toHaveLength(32)
    expect(new Set(CODE_ALPHABET).size).toBe(32)
    for (const ambiguous of ['I', 'L', 'O', 'U']) {
      expect(CODE_ALPHABET).not.toContain(ambiguous)
    }
  })

  it('generates codes of the configured length from the alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoundCode()
      expect(code).toHaveLength(CODE_LENGTH)
      for (const char of code) expect(CODE_ALPHABET).toContain(char)
    }
  })

  it('does not repeat within a large sample', () => {
    const codes = new Set(Array.from({ length: 500 }, generateRoundCode))
    expect(codes.size).toBe(500)
  })

  it('validates well-formed codes', () => {
    expect(isValidRoundCode(generateRoundCode())).toBe(true)
    expect(isValidRoundCode('SHORT')).toBe(false)
    expect(isValidRoundCode('K7QFM2XT9I')).toBe(false)
    expect(isValidRoundCode('k7qfm2xt9r')).toBe(false)
  })

  it('normalizes user-typed codes', () => {
    expect(normalizeRoundCode(' k7qf-m2xt 9r ')).toBe('K7QFM2XT9R')
  })
})
