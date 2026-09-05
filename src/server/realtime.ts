/**
 * Tells every device watching this round that something changed. The channel
 * name is the round code, which is already the credential for the round.
 *
 * Never throws: a result that was written must not be reported as failed
 * because the notification did not go out.
 */
export async function notifyRoundChanged(code: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `round:${code}`, event: 'changed', payload: {} }],
      }),
    })
  } catch {
    // Clients also refetch on focus, so a dropped notification self-heals.
  }
}
