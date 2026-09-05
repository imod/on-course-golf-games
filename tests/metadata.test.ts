import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = { get: vi.fn() }
const headerStore = { get: vi.fn() }

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
  headers: () => Promise.resolve(headerStore),
}))

describe('generateMetadata', () => {
  beforeEach(() => {
    cookieStore.get.mockReset()
    headerStore.get.mockReset()
  })

  it('titles the tab in German when the locale cookie is de', async () => {
    cookieStore.get.mockReturnValue({ value: 'de' })
    const { generateMetadata } = await import('@/app/layout')
    const metadata = await generateMetadata()
    expect(metadata.title).toBe('Platzspiele')
  })

  it('titles the tab in English when the locale cookie is en', async () => {
    cookieStore.get.mockReturnValue({ value: 'en' })
    const { generateMetadata } = await import('@/app/layout')
    const metadata = await generateMetadata()
    expect(metadata.title).toBe('On-course games')
  })
})
