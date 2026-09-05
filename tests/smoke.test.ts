import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('project setup', () => {
  it('uses strict TypeScript', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
    expect(tsconfig.compilerOptions.strict).toBe(true)
  })
})
