import { describe, it, expect, vi } from 'vitest'

// This file mocks the round service so a database failure can be simulated;
// it deliberately lives apart from watch.test.ts, which uses the real one.
vi.mock('@/server/rounds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/rounds')>()
  return {
    ...actual,
    getRoundState: vi.fn(async () => {
      throw new actual.RoundError('bad_request', 'connection to the database was reset')
    }),
  }
})

const { GET: getConfig } = await import('@/app/api/w/[code]/route')

const ctx = (code: string) => ({ params: Promise.resolve({ code }) })

describe('watch config GET when the database fails', () => {
  it('answers with the {ok, err} envelope rather than an HTML error page', async () => {
    const response = await getConfig(new Request('http://test/'), ctx('K7QFM2XT9R'))

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.err).toBe('bad_request')
  })
})
