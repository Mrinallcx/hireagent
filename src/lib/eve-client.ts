/**
 * Thin client for starting Eve sessions from Next API routes.
 *
 * Under withEve the Eve runtime is mounted same-origin, so EVE_BASE_URL defaults
 * to the local Next origin and the request is rewritten to the Eve service. We
 * only need to start the durable session and capture its id; progress and result
 * flow back through the sync_dashboard hook -> /api/internal/agent-events.
 */

const EVE_BASE_URL = process.env.EVE_BASE_URL ?? "http://127.0.0.1:3000"

export type StartedSession = {
  sessionId: string
  continuationToken?: string
}

export async function startSession(message: string): Promise<StartedSession> {
  const res = await fetch(`${EVE_BASE_URL}/eve/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Eve session start failed ${res.status}: ${text}`)
  }

  const headerSessionId = res.headers.get("x-eve-session-id") ?? undefined
  const body = (await res.json().catch(() => ({}))) as {
    sessionId?: string
    continuationToken?: string
  }

  const sessionId = body.sessionId ?? headerSessionId
  if (!sessionId) {
    throw new Error("Eve session start returned no sessionId")
  }

  return { sessionId, continuationToken: body.continuationToken }
}

/**
 * Best-effort cancel. Eve does not expose a documented session-cancel route, so
 * deletion just drops the job from the repository; any in-flight run is bounded
 * by the model timeouts and the job watchdog. Kept as a seam for when a cancel
 * endpoint lands.
 */
export async function cancelSession(sessionId: string): Promise<void> {
  void sessionId
}
