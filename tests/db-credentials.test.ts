import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { serviceCredentials } from '@/server/db'

describe('serviceCredentials', () => {
  const saved = { ...process.env }
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved.NEXT_PUBLIC_SUPABASE_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved.SUPABASE_SERVICE_ROLE_KEY
  })

  it('keeps a well-formed url unchanged', () => {
    expect(serviceCredentials().url).toBe('https://example.supabase.co')
  })

  it('strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/'
    expect(serviceCredentials().url).toBe('https://example.supabase.co')
  })

  it('strips repeated trailing slashes', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co///'
    expect(serviceCredentials().url).toBe('https://example.supabase.co')
  })

  it('throws when the url is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => serviceCredentials()).toThrow(/must be set/)
  })

  it('throws when the key is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => serviceCredentials()).toThrow(/must be set/)
  })
})
