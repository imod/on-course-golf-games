import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export type ServiceCredentials = { url: string; key: string }

/**
 * The only place the service role key is read. Never import this from a
 * "use client" module. Every other server module that needs the key — the
 * broadcast sender included — goes through here, so `grep` over this file
 * is enough to audit where the key can travel.
 */
export function serviceCredentials(): ServiceCredentials {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  // A trailing slash makes supabase-js build "...supabase.co//rest/v1/...",
  // which the API rejects with "Invalid path specified in request URL" — an
  // error that points nowhere near the actual cause. Paste-with-slash is the
  // normal way to configure this, so tolerate it.
  return { url: url.replace(/\/+$/, ''), key }
}

export function serviceDb(): SupabaseClient {
  if (client) return client

  const { url, key } = serviceCredentials()
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}
