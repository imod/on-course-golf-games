import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notifyRoundChanged } from '@/server/realtime'

describe('notifyRoundChanged', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  afterEach(() => vi.unstubAllGlobals())

  it('posts a changed event to the round channel', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await notifyRoundChanged('K7QFM2XT9R')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:54321/realtime/v1/api/broadcast')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.messages[0]).toMatchObject({ topic: 'round:K7QFM2XT9R', event: 'changed' })
  })

  it('gives up on a hung connection instead of blocking the caller', async () => {
    // A real hang: fetch never settles on its own, only when the signal fires.
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const started = Date.now()
    await expect(notifyRoundChanged('K7QFM2XT9R')).resolves.toBeUndefined()
    expect(Date.now() - started).toBeLessThan(5000)
  }, 10000)

  it('passes an abort signal so the broadcast cannot hang forever', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await notifyRoundChanged('K7QFM2XT9R')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('swallows transport failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    await expect(notifyRoundChanged('K7QFM2XT9R')).resolves.toBeUndefined()
  })
})
