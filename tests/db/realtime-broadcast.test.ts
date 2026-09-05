import { describe, it, expect, afterEach } from 'vitest'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { anonClient } from '../helpers/db'
import { notifyRoundChanged } from '@/server/realtime'

/**
 * The broadcast is the whole reason this project talks to Realtime, and every
 * other test either stubs fetch or mocks notifyRoundChanged away — so a typo
 * in the topic string would ship green. This one subscribes a real anon client
 * to round:<code> and asserts the real sender reaches it.
 */
describe('round broadcast, end to end against local Supabase', () => {
  let channel: RealtimeChannel | null = null

  afterEach(async () => {
    if (channel) await anonClient().removeChannel(channel)
    channel = null
  })

  it('delivers a changed event to a client subscribed to round:<code>', async () => {
    const code = 'K7QFM2XT9R'
    const supabase = anonClient()

    const received = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no changed event within 10s')), 10_000)
      channel = supabase
        .channel(`round:${code}`)
        .on('broadcast', { event: 'changed' }, () => {
          clearTimeout(timer)
          resolve()
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer)
            reject(new Error(`subscription failed: ${status}`))
          }
          if (status === 'SUBSCRIBED') void notifyRoundChanged(code)
        })
    })

    await expect(received).resolves.toBeUndefined()
  }, 20_000)

  it('does not deliver that event to a client on a different round', async () => {
    const supabase = anonClient()
    let leaked = false

    await new Promise<void>((resolve, reject) => {
      channel = supabase
        .channel('round:OTHERROUND')
        .on('broadcast', { event: 'changed' }, () => {
          leaked = true
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve()
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status))
        })
    })

    await notifyRoundChanged('K7QFM2XT9R')
    await new Promise((r) => setTimeout(r, 1500))
    expect(leaked).toBe(false)
  }, 20_000)
})
