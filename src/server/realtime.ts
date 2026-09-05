import { serviceCredentials } from './db'

/** A broadcast that has not gone out in this long is not worth waiting for. */
const BROADCAST_TIMEOUT_MS = 2000

/**
 * Tells every device watching this round that something changed. The channel
 * name is the round code, which is already the credential for the round.
 *
 * Never throws and never hangs: a result that was written must not be reported
 * as failed — or left spinning on a phone out on the course — because the
 * notification did not go out.
 */
export async function notifyRoundChanged(code: string): Promise<void> {
  try {
    const { url, key } = serviceCredentials()
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
      // Without this a hung connection waits until the platform kills the
      // function, turning a completed write into an endless spinner.
      signal: AbortSignal.timeout(BROADCAST_TIMEOUT_MS),
    })
  } catch {
    // Clients also refetch on focus, so a dropped notification self-heals.
    // This also swallows the AbortError raised by the timeout above.
  }
}
