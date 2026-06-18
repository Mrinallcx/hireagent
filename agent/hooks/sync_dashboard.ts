import { defineHook } from "eve/hooks"

import { parseJobId } from "../lib/job-envelope"
import { parseReport } from "../lib/report-parser"

/**
 * sync_dashboard — bridges the Eve runtime stream back to the Next dashboard.
 *
 * Eve runs as its own process, so this hook cannot touch Next's in-memory store
 * directly. It maps lifecycle events to progress/result and POSTs them to the
 * secured internal webhook. Next applies idempotency + monotonic-progress guards
 * on its side; this hook just reports what it sees.
 *
 * Result extraction: the root orchestrator's final assistant message contains the
 * exact marker blocks, so any message.completed whose text parses as a valid
 * report is treated as the terminal result.
 */

type SessionState = {
  jobId?: string
  progress: number
  usageIn: number
  usageOut: number
  done: boolean
}

const sessions = new Map<string, SessionState>()

function stateFor(sessionId: string): SessionState {
  let s = sessions.get(sessionId)
  if (!s) {
    s = { progress: 0, usageIn: 0, usageOut: 0, done: false }
    sessions.set(sessionId, s)
  }
  return s
}

function webBaseUrl(): string {
  return process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000"
}

function internalSecret(): string {
  return process.env.INTERNAL_WEBHOOK_SECRET ?? "dev-internal-secret"
}

type EventPayload = {
  jobId: string
  sessionId: string
  eventId: string
  type: string
  progress?: number
  status?: "running" | "success" | "error"
  result?: unknown
  usage?: { inputTokens: number; outputTokens: number }
  error?: string
}

async function post(payload: EventPayload): Promise<void> {
  try {
    await fetch(`${webBaseUrl()}/api/internal/agent-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret(),
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    // Never let a sync failure break the durable run.
    console.error("[sync_dashboard] webhook post failed:", err)
  }
}

export default defineHook({
  events: {
    async "message.received"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      const jobId = parseJobId(event.data.message)
      if (jobId) state.jobId = jobId
      if (!state.jobId) return
      state.progress = Math.max(state.progress, 5)
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:${event.data.sequence}`,
        type: "message.received",
        progress: state.progress,
        status: "running",
      })
    },

    async "subagent.called"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      if (!state.jobId) return
      const target = event.data.name === "report_synthesizer" ? 75 : 25
      state.progress = Math.max(state.progress, target)
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:called:${event.data.callId}`,
        type: "subagent.called",
        progress: state.progress,
        status: "running",
      })
    },

    async "subagent.completed"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      if (!state.jobId) return
      const target = event.data.subagentName === "report_synthesizer" ? 90 : 60
      state.progress = Math.max(state.progress, target)
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:completed:${event.data.callId}`,
        type: "subagent.completed",
        progress: state.progress,
        status: "running",
      })
    },

    "step.completed"(event, ctx) {
      const state = stateFor(ctx.session.id)
      state.usageIn += event.data.usage?.inputTokens ?? 0
      state.usageOut += event.data.usage?.outputTokens ?? 0
    },

    async "message.completed"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      if (!state.jobId || state.done) return
      const text = event.data.message
      if (!text || event.data.finishReason === "tool-calls") return

      let result: unknown
      try {
        result = parseReport(text)
      } catch {
        // Not the final report (interim narration) — ignore.
        return
      }

      state.done = true
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:result:${event.data.sequence}`,
        type: "result",
        progress: 100,
        status: "success",
        result,
        usage: { inputTokens: state.usageIn, outputTokens: state.usageOut },
      })
    },

    async "turn.failed"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      if (!state.jobId || state.done) return
      state.done = true
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:turn-failed:${event.data.sequence}`,
        type: "turn.failed",
        status: "error",
        error: event.data.message,
      })
    },

    async "session.failed"(event, ctx) {
      const sessionId = ctx.session.id
      const state = stateFor(sessionId)
      if (!state.jobId || state.done) return
      state.done = true
      await post({
        jobId: state.jobId,
        sessionId,
        eventId: `${sessionId}:session-failed`,
        type: "session.failed",
        status: "error",
        error: "message" in event.data ? String(event.data.message) : "Session failed",
      })
    },

    "session.completed"(_event, ctx) {
      // Free local state once the session ends.
      sessions.delete(ctx.session.id)
    },
  },
})
