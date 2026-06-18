import { describe, expect, it } from "vitest"

import { engineForAgent, researchMode } from "../../src/lib/research-engine"
import type { Agent } from "../../src/lib/types"

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "a1",
    name: "Test",
    description: "Analyze Bitcoin price action and macro outlook for the next 30 days.",
    category: "Market Analysis",
    experience: "Intern",
    modelProvider: "groq",
    progress: 0,
    status: "running",
    createdAt: Date.now(),
    ...overrides,
  }
}

describe("research-engine.engineForAgent", () => {
  it("routes kimi to legacy when global mode is eve", () => {
    expect(researchMode()).toBe("mock") // vitest env
    // Under mock env, global wins — test logic directly by simulating eve default:
    const orig = process.env.RESEARCH_MODE
    process.env.RESEARCH_MODE = "eve"
    try {
      expect(engineForAgent(agent({ modelProvider: "kimi" }))).toBe("legacy")
      expect(engineForAgent(agent({ modelProvider: "groq" }))).toBe("eve")
    } finally {
      process.env.RESEARCH_MODE = orig
    }
  })

  it("defaults missing modelProvider to groq/eve path", () => {
    const orig = process.env.RESEARCH_MODE
    process.env.RESEARCH_MODE = "eve"
    try {
      const { modelProvider: _, ...rest } = agent()
      expect(engineForAgent(rest as Agent)).toBe("eve")
    } finally {
      process.env.RESEARCH_MODE = orig
    }
  })
})
