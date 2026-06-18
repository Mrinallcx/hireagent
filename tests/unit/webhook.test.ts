import { beforeEach, describe, expect, it } from "vitest"

import { POST } from "../../src/app/api/internal/agent-events/route"
import { agentRepository } from "../../src/lib/agent-repository"
import type { Agent } from "../../src/lib/types"

const SECRET = "test-secret" // matches vitest.config env

function seedRunning(id: string, sessionId?: string): Agent {
  const job: Agent = {
    id,
    name: id,
    description: "x",
    category: "Market Analysis",
    experience: "Intern",
    modelProvider: "groq",
    progress: 5,
    status: "running",
    createdAt: Date.now(),
    eveSessionId: sessionId,
  }
  return agentRepository.create(job)
}

function req(body: unknown, secret: string | null = SECRET): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (secret !== null) headers["x-internal-secret"] = secret
  return new Request("http://x/api/internal/agent-events", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

const validResult = {
  summary: "BTC at $104k",
  analysis: "analysis body",
  chartSymbol: "BTC-USD",
  metrics: [],
  highlights: [],
  sources: [
    { title: "a", url: "https://a.com", type: "data" },
    { title: "b", url: "https://b.com", type: "news" },
  ],
}

describe("internal/agent-events webhook", () => {
  beforeEach(() => {
    // fresh-ish ids per test
  })

  it("rejects a missing/wrong secret with 401", async () => {
    seedRunning("w-401")
    const res = await POST(req({ jobId: "w-401", progress: 50 }, "wrong"))
    expect(res.status).toBe(401)
    const noHeader = await POST(req({ jobId: "w-401", progress: 50 }, null))
    expect(noHeader.status).toBe(401)
  })

  it("applies monotonic progress and ignores regressions", async () => {
    seedRunning("w-mono")
    await POST(req({ jobId: "w-mono", eventId: "e1", progress: 40 }))
    expect(agentRepository.get("w-mono")?.progress).toBe(40)
    await POST(req({ jobId: "w-mono", eventId: "e2", progress: 10 }))
    expect(agentRepository.get("w-mono")?.progress).toBe(40)
  })

  it("dedupes by eventId", async () => {
    seedRunning("w-dupe")
    await POST(req({ jobId: "w-dupe", eventId: "same", progress: 30 }))
    // a duplicate eventId carrying higher progress must be ignored
    await POST(req({ jobId: "w-dupe", eventId: "same", progress: 90 }))
    expect(agentRepository.get("w-dupe")?.progress).toBe(30)
  })

  it("applies a success result", async () => {
    seedRunning("w-success")
    const res = await POST(
      req({
        jobId: "w-success",
        eventId: "r1",
        status: "success",
        progress: 100,
        result: validResult,
        usage: { inputTokens: 10, outputTokens: 20 },
      })
    )
    expect(res.status).toBe(200)
    const job = agentRepository.get("w-success")
    expect(job?.status).toBe("success")
    expect(job?.progress).toBe(100)
    expect(job?.result?.summary).toContain("104k")
    expect(job?.result?.completedAt).toBeTruthy()
    expect(job?.usage?.outputTokens).toBe(20)
  })

  it("applies an error status", async () => {
    seedRunning("w-error")
    await POST(req({ jobId: "w-error", eventId: "err1", status: "error", error: "boom" }))
    expect(agentRepository.get("w-error")?.status).toBe("error")
  })

  it("ignores events for unknown jobs", async () => {
    const res = await POST(req({ jobId: "does-not-exist", progress: 50 }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ignored?: string }
    expect(body.ignored).toBe("unknown_job")
  })

  it("ignores events for finished jobs", async () => {
    const job = seedRunning("w-finished")
    agentRepository.update(job.id, { status: "success" })
    const res = await POST(req({ jobId: "w-finished", progress: 50 }))
    const body = (await res.json()) as { ignored?: string }
    expect(body.ignored).toBe("finished")
  })

  it("resolves a job by eve session id", async () => {
    seedRunning("w-by-session", "sess-xyz")
    await POST(req({ sessionId: "sess-xyz", eventId: "s1", progress: 25 }))
    expect(agentRepository.get("w-by-session")?.progress).toBe(25)
  })
})
