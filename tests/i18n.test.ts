import { describe, it, expect } from 'vitest'
import { detectLocaleFromAcceptLanguage, formatDate, getDict, isLocale } from '@/lib/i18n'

describe('i18n dictionary', () => {
  it('has identical key sets in German and English', () => {
    const enKeys = Object.keys(getDict('en')).sort()
    const deKeys = Object.keys(getDict('de')).sort()
    expect(deKeys).toEqual(enKeys)
  })

  // Representative arguments for the dictionary's function-valued entries —
  // the check below calls each one and inspects its *output*, so a template
  // literal edited later is covered exactly like a plain string is.
  const functionSamples: Record<string, unknown[]> = {
    holesForLabel: ['Nächstes Loch'],
    invalidHoles: ['abc, xyz'],
    playersCount: [4],
    clearChallengeOnHole: ['Nächstes Loch'],
    saveChallenge: ['Nächstes Loch'],
    tiesNotAllowed: ['Nächstes Loch'],
    invalidPoints: ['abc, xyz'],
    confirmDeleteRound: ['Breitenloo'],
  }

  it('never spells a German string with ß (Swiss German uses ss), including templated ones', () => {
    const de = getDict('de')
    for (const [key, value] of Object.entries(de)) {
      if (typeof value === 'string') {
        expect(value.includes('ß'), `key "${key}" contains ß: ${value}`).toBe(false)
      } else if (typeof value === 'function') {
        const args = functionSamples[key]
        expect(args, `no sample arguments registered for function key "${key}"`).toBeDefined()
        const result = (value as (...a: unknown[]) => string)(...args)
        expect(result.includes('ß'), `key "${key}" contains ß: ${result}`).toBe(false)
      }
    }
  })
})

describe('detectLocaleFromAcceptLanguage', () => {
  it('defaults to German when there is no header', () => {
    expect(detectLocaleFromAcceptLanguage(undefined)).toBe('de')
    expect(detectLocaleFromAcceptLanguage(null)).toBe('de')
  })

  it('defaults to German for a header that does not clearly prefer English', () => {
    expect(detectLocaleFromAcceptLanguage('de-CH,de;q=0.9,fr;q=0.8')).toBe('de')
    expect(detectLocaleFromAcceptLanguage('fr-FR,fr;q=0.9')).toBe('de')
  })

  it('picks English only when the top-ranked preference is English', () => {
    expect(detectLocaleFromAcceptLanguage('en-US,en;q=0.9,de;q=0.5')).toBe('en')
    expect(detectLocaleFromAcceptLanguage('de;q=0.5,en-GB;q=0.9')).toBe('en')
  })
})

describe('isLocale', () => {
  it('accepts only known locale codes', () => {
    expect(isLocale('de')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats de-CH as dd.mm.yyyy', () => {
    expect(formatDate('2026-09-12', 'de')).toBe('12.09.2026')
  })

  it('formats en-GB as dd/mm/yyyy', () => {
    expect(formatDate('2026-09-12', 'en')).toBe('12/09/2026')
  })
})
