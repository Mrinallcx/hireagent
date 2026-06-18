import { describe, expect, it } from "vitest"

import { GET, POST } from "../../src/app/api/agents/route"
import { DELETE } from "../../src/app/api/agents/[id]/route"
import { POST as RERUN } from "../../src/app/api/agents/[id]/rerun/route"
import { agentRepository } from "../../src/lib/agent-repository"
import type { Agent } from "../../src/lib/types"

// RESEARCH_MODE=mock and MOCK_STEP_MS=1 come from vitest.config env.

function createReq(ip: string, body: unknown): Request {
  return new Request("http://x/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
}

const objective = "Analyze Bitcoin price action and macro outlook for the next 30 days."

async function waitForStatus(id: string, status: Agent["status"], timeout = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (agentRepository.get(id)?.status === status) return true
    await new Promise((r) => setTimeout(r, 10))
  }
  return false
}

describe("agents API (mock mode)", () => {
  it("POST creates a running job that completes via the mock engine", async () => {
    const res = await POST(
      createReq("10.0.0.1", {
        name: "BTC",
        description: objective,
        category: "Market Analysis",
        experience: "Intern",
      })
    )
    expect(res.status).toBe(201)
    const job = (await res.json()) as Agent
    expect(job.status).toBe("running")
    expect(job.ownerId).toBeNull()

    expect(await waitForStatus(job.id, "success")).toBe(true)
    expect(agentRepository.get(job.id)?.result?.summary).toContain("[mock]")
  })

  it("GET returns the list of jobs", async () => {
    const res = GET()
    const list = (await res.json()) as Agent[]
    expect(Array.isArray(list)).toBe(true)
  })

  it("rerun resets and re-runs a job", async () => {
    const created = await POST(
      createReq("10.0.0.2", {
        name: "SOL",
        description: "Analyze Solana (SOL) momentum and on-chain activity this month.",
        category: "Market Analysis",
        experience: "Intern",
      })
    )
    const job = (await created.json()) as Agent
    await waitForStatus(job.id, "success")

    const params = Promise.resolve({ id: job.id })
    const rerun = await RERUN(new Request("http://x"), { params })
    const reset = (await rerun.json()) as Agent
    expect(reset.status).toBe("running")
    expect(reset.result).toBeUndefined()
    expect(await waitForStatus(job.id, "success")).toBe(true)
  })

  it("DELETE removes a job", async () => {
    const created = await POST(
      createReq("10.0.0.3", {
        name: "AAPL",
        description: "Analyze Apple (AAPL) stock trend and outlook for this quarter.",
        category: "Market Analysis",
        experience: "Intern",
      })
    )
    const job = (await created.json()) as Agent
    const params = Promise.resolve({ id: job.id })
    const del = await DELETE(new Request("http://x"), { params })
    expect(del.status).toBe(200)
    expect(agentRepository.get(job.id)).toBeUndefined()
  })
})
