import { NextResponse } from "next/server"

import { agentRepository } from "@/lib/agent-repository"
import type { Agent, AgentResult, AgentUsage } from "@/lib/types"

/**
 * Internal webhook: the only writer of progress/results from the Eve runtime.
 *
 * Hardened against the realities of a cross-process event stream:
 * - shared-secret header (x-internal-secret)
 * - de-duplication by eventId (each event applied at most once)
 * - monotonic progress (never moves backwards)
 * - ignores events for unknown or already-finished jobs (a late event cannot
 *   resurrect a deleted or completed job)
 */

type AgentEventPayload = {
  jobId?: string
  sessionId?: string
  eventId?: string
  type?: string
  progress?: number
  status?: "running" | "success" | "error"
  result?: unknown
  usage?: AgentUsage
  error?: string
}

function expectedSecret(): string {
  return process.env.INTERNAL_WEBHOOK_SECRET ?? "dev-internal-secret"
}

function formatCompletedAt(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function toResult(raw: unknown): AgentResult | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const r = raw as Partial<AgentResult>
  if (typeof r.summary !== "string" || typeof r.analysis !== "string") return undefined
  return {
    summary: r.summary,
    analysis: r.analysis,
    chartSymbol: typeof r.chartSymbol === "string" ? r.chartSymbol : undefined,
    metrics: Array.isArray(r.metrics) ? r.metrics : [],
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    sources: Array.isArray(r.sources) ? r.sources : [],
    sections: Array.isArray(r.sections) ? r.sections : undefined,
    completedAt: formatCompletedAt(),
  }
}

export async function POST(request: Request) {
  if (request.headers.get("x-internal-secret") !== expectedSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as AgentEventPayload | null
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Resolve the job by id, falling back to the Eve session id.
  let job: Agent | undefined
  if (body.jobId) job = agentRepository.get(body.jobId)
  if (!job && body.sessionId) job = agentRepository.getByEveSessionId(body.sessionId)

  // Ignore events for unknown or already-finished jobs.
  if (!job) return NextResponse.json({ ok: true, ignored: "unknown_job" })
  if (job.status !== "running") return NextResponse.json({ ok: true, ignored: "finished" })

  // Idempotency: apply each event at most once.
  const eventId = body.eventId ?? `${body.type ?? "event"}:${Date.now()}`
  if (agentRepository.hasProcessedEvent(job.id, eventId)) {
    return NextResponse.json({ ok: true, ignored: "duplicate" })
  }
  agentRepository.markEventProcessed(job.id, eventId)

  if (body.status === "success") {
    const result = toResult(body.result)
    if (!result) {
      agentRepository.update(job.id, { status: "error" })
      return NextResponse.json({ ok: true, applied: "error_bad_result" })
    }
    agentRepository.update(job.id, {
      status: "success",
      progress: 100,
      result: { ...result, chartSymbol: result.chartSymbol ?? job.result?.chartSymbol },
      usage: body.usage ?? job.usage,
    })
    return NextResponse.json({ ok: true, applied: "success" })
  }

  if (body.status === "error") {
    agentRepository.update(job.id, { status: "error", usage: body.usage ?? job.usage })
    return NextResponse.json({ ok: true, applied: "error" })
  }

  // Progress-only update: monotonic, capped at 99 while running.
  const nextProgress = Math.min(99, Math.max(job.progress, body.progress ?? job.progress))
  agentRepository.update(job.id, { progress: nextProgress })
  return NextResponse.json({ ok: true, applied: "progress" })
}
