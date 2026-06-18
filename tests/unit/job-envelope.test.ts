import { describe, it, expect } from "vitest"

import { buildEnvelope, parseEnvelope, parseJobId } from "../../src/lib/job-envelope"

describe("job-envelope", () => {
  const job = {
    jobId: "abc-123",
    category: "Market Analysis",
    experience: "King" as const,
    objective: "Analyze Bitcoin price action and macro outlook.",
  }

  it("round-trips build -> parse", () => {
    const parsed = parseEnvelope(buildEnvelope(job))
    expect(parsed).toEqual(job)
  })

  it("extracts just the job id", () => {
    expect(parseJobId(buildEnvelope(job))).toBe("abc-123")
    expect(parseJobId("no job here")).toBeUndefined()
  })

  it("returns undefined for non-envelope messages", () => {
    expect(parseEnvelope("just a plain message")).toBeUndefined()
  })

  it("preserves multi-line objectives", () => {
    const multi = { ...job, objective: "Line one.\nLine two.\nLine three." }
    expect(parseEnvelope(buildEnvelope(multi))?.objective).toBe(multi.objective)
  })
})
