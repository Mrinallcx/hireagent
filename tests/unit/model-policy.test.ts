import { describe, it, expect } from "vitest"

import {
  MIN_SEARCHES,
  modelIdFor,
  synthesizerTokens,
} from "../../agent/lib/model-policy"

describe("model-policy", () => {
  it("resolves a Groq model id per role", () => {
    expect(typeof modelIdFor("orchestrator")).toBe("string")
    expect(modelIdFor("report_synthesizer")).toContain("llama")
  })

  it("honors overrides", () => {
    expect(modelIdFor("market_data", { market_data: "mixtral-8x7b-32768" })).toBe(
      "mixtral-8x7b-32768"
    )
    expect(modelIdFor("orchestrator", { market_data: "mixtral-8x7b-32768" })).toBe(
      modelIdFor("orchestrator")
    )
  })

  it("enforces min searches by tier", () => {
    expect(MIN_SEARCHES.Intern).toBe(2)
    expect(MIN_SEARCHES.King).toBe(3)
  })

  it("scales synthesizer tokens by tier", () => {
    expect(synthesizerTokens("King")).toBeGreaterThan(synthesizerTokens("Intern"))
  })
})
