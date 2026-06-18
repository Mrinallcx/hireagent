import { describe, it, expect } from "vitest"

import {
  hasRequiredMarkers,
  looksIncomplete,
  parseReport,
  validSources,
} from "../../agent/lib/report-parser"

function validReport(): string {
  const structured = {
    summary: "BTC trades at $104,000",
    chartSymbol: "BTC-USD",
    metrics: [{ label: "Price", value: "$104,000", change: "+2%" }],
    highlights: ["Momentum is constructive"],
    sources: [
      { title: "Data", url: "https://data.example.com", type: "data" },
      { title: "News", url: "https://news.example.com", type: "news" },
    ],
  }
  return [
    "---STRUCTURED_DATA_START---",
    JSON.stringify(structured),
    "---STRUCTURED_DATA_END---",
    "---ANALYSIS_START---",
    "Detailed analysis. ".repeat(60),
    "---ANALYSIS_END---",
  ].join("\n")
}

describe("report-parser", () => {
  it("detects required markers", () => {
    expect(hasRequiredMarkers(validReport())).toBe(true)
    expect(hasRequiredMarkers("no markers here")).toBe(false)
  })

  it("flags incomplete / short content", () => {
    expect(looksIncomplete("short")).toBe(true)
    expect(looksIncomplete("let me search for more data " + "x".repeat(900))).toBe(true)
    expect(looksIncomplete(validReport())).toBe(false)
  })

  it("validates https source count", () => {
    expect(validSources([{ title: "a", url: "https://a.com", type: "data" }])).toBe(false)
    expect(
      validSources([
        { title: "a", url: "https://a.com", type: "data" },
        { title: "b", url: "http://b.com", type: "news" },
      ])
    ).toBe(false)
    expect(
      validSources([
        { title: "a", url: "https://a.com", type: "data" },
        { title: "b", url: "https://b.com", type: "news" },
      ])
    ).toBe(true)
  })

  it("parses a valid report", () => {
    const parsed = parseReport(validReport())
    expect(parsed.summary).toContain("104,000")
    expect(parsed.chartSymbol).toBe("BTC-USD")
    expect(parsed.sources).toHaveLength(2)
  })

  it("throws on bad JSON", () => {
    const bad = [
      "---STRUCTURED_DATA_START---",
      "{not json}",
      "---STRUCTURED_DATA_END---",
      "---ANALYSIS_START---",
      "x".repeat(900),
      "---ANALYSIS_END---",
    ].join("\n")
    expect(() => parseReport(bad)).toThrow(/structured JSON/)
  })

  it("throws on missing markers", () => {
    expect(() => parseReport("just text " + "x".repeat(900))).toThrow(/incomplete/)
  })

  it("throws on insufficient sources", () => {
    const oneSource = [
      "---STRUCTURED_DATA_START---",
      JSON.stringify({
        summary: "s",
        analysis: "a",
        sources: [{ title: "a", url: "https://a.com", type: "data" }],
      }),
      "---STRUCTURED_DATA_END---",
      "---ANALYSIS_START---",
      "x".repeat(900),
      "---ANALYSIS_END---",
    ].join("\n")
    expect(() => parseReport(oneSource)).toThrow(/source/)
  })
})
