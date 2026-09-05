import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`missing env ${name} — copy supabase status into .env.local`)
  return value
}

export function serviceClient(): SupabaseClient {
  return createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
}

export function anonClient(): SupabaseClient {
  return createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  })
}

/** Deletes every row created by tests, in dependency order. */
export async function resetDatabase(): Promise<void> {
  const db = serviceClient()
  await db.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('round_challenges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('round_players').delete().neq('round_id', '00000000-0000-0000-0000-000000000000')
  await db.from('rounds').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('challenges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
