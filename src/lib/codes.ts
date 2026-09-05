import { randomBytes } from 'node:crypto'

/** Crockford base32: digits plus letters, minus I, L, O and U. */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 10

/**
 * ~50 bits of entropy. The alphabet is exactly 32 characters, so masking a
 * random byte with 0x1f is uniform — no rejection sampling needed.
 */
export function generateRoundCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte & 0x1f]
  return code
}

export function isValidRoundCode(value: string): boolean {
  if (value.length !== CODE_LENGTH) return false
  for (const char of value) {
    if (!CODE_ALPHABET.includes(char)) return false
  }
  return true
}

export function normalizeRoundCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '')
}
