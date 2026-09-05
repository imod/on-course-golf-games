import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Anon client used ONLY to subscribe to the round's broadcast channel. It has
 * no table access — RLS denies everything.
 */
export function browserClient(): SupabaseClient {
  if (client) return client
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  return client
}
