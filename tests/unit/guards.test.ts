import { describe, expect, it } from "vitest"

import { agentRepository } from "../../src/lib/agent-repository"
import { checkCreate, commitRun, getClientIp } from "../../src/lib/guards"
import type { Agent } from "../../src/lib/types"

const valid = {
  name: "BTC Agent",
  description: "Analyze Bitcoin price action and macro outlook for the next 30 days.",
  category: "Market Analysis",
  experience: "Intern" as const,
}

function runningJob(id: string): Agent {
  return {
    id,
    name: id,
    description: "x",
    category: "Market Analysis",
    experience: "Intern",
    modelProvider: "groq",
    progress: 10,
    status: "running",
    createdAt: Date.now(),
  }
}

describe("guards.checkCreate", () => {
  it("rejects invalid input with 400", () => {
    const r = checkCreate("ip-400", { ...valid, description: "too short" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(400)
  })

  it("rejects disabled categories with 403", () => {
    const r = checkCreate("ip-403", { ...valid, category: "Trading Signals" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(403)
  })

  it("accepts valid input under limits", () => {
    expect(checkCreate("ip-ok", valid).ok).toBe(true)
  })

  it("enforces per-IP daily run limit (429)", () => {
    const ip = "ip-rate"
    for (let i = 0; i < 3; i++) commitRun(ip, "Intern")
    const r = checkCreate(ip, valid)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(429)
  })

  it("enforces King-tier daily cap (429)", () => {
    const ip = "ip-king"
    commitRun(ip, "King")
    const r = checkCreate(ip, { ...valid, experience: "King" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(429)
  })

  it("enforces the global concurrency cap (429)", () => {
    agentRepository.create(runningJob("c1"))
    agentRepository.create(runningJob("c2"))
    const r = checkCreate("ip-conc", valid)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(429)
    agentRepository.delete("c1")
    agentRepository.delete("c2")
  })
})

describe("getClientIp", () => {
  it("reads x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } })
    expect(getClientIp(req)).toBe("1.2.3.4")
  })
})
