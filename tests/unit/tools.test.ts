import { afterEach, describe, expect, it, vi } from "vitest"

import validateReport from "../../agent/tools/validate_report"
import fetchMarketChart from "../../agent/tools/fetch_market_chart"
import kimiWebSearchTool from "../../agent/tools/kimi_web_search"

type AnyTool = {
  description: string
  inputSchema: unknown
  execute: (input: unknown, ctx: unknown) => Promise<unknown>
}

const asTool = (t: unknown) => t as AnyTool

describe("tool definitions", () => {
  it("all three tools expose a description and input schema", () => {
    for (const t of [validateReport, fetchMarketChart, kimiWebSearchTool]) {
      const tool = asTool(t)
      expect(typeof tool.description).toBe("string")
      expect(tool.description.length).toBeGreaterThan(10)
      expect(tool.inputSchema).toBeDefined()
    }
  })
})

describe("validate_report tool", () => {
  it("accepts a valid report and rejects a broken one", async () => {
    const valid = [
      "---STRUCTURED_DATA_START---",
      JSON.stringify({
        summary: "ok",
        analysis: "a",
        sources: [
          { title: "a", url: "https://a.com", type: "data" },
          { title: "b", url: "https://b.com", type: "news" },
        ],
      }),
      "---STRUCTURED_DATA_END---",
      "---ANALYSIS_START---",
      "x".repeat(900),
      "---ANALYSIS_END---",
    ].join("\n")

    const good = (await asTool(validateReport).execute({ report: valid }, {})) as {
      valid: boolean
    }
    expect(good.valid).toBe(true)

    const bad = (await asTool(validateReport).execute({ report: "nope" }, {})) as {
      valid: boolean
    }
    expect(bad.valid).toBe(false)
  })
})

describe("fetch_market_chart tool", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns a resolved chartSymbol with a price summary", async () => {
    const now = Math.floor(Date.now() / 1000)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: { symbol: "BTC-USD", currency: "USD", shortName: "Bitcoin" },
                timestamp: [now - 86400, now],
                indicators: { quote: [{ close: [100, 110] }] },
              },
            ],
          },
        }),
      })) as unknown as typeof fetch
    )

    const out = (await asTool(fetchMarketChart).execute(
      { description: "bitcoin outlook" },
      {}
    )) as { available: boolean; chartSymbol?: string; changePct?: number }

    expect(out.available).toBe(true)
    expect(out.chartSymbol).toBe("BTC-USD")
    expect(out.changePct).toBe(10)
  })
})
