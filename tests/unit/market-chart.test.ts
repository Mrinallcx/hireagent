import { afterEach, describe, expect, it, vi } from "vitest"

import { buildSymbolCandidates, resolveMarketChart } from "../../src/lib/market-chart"

describe("buildSymbolCandidates", () => {
  it("resolves an explicit (TICKER) in the objective", () => {
    const c = buildSymbolCandidates({ description: "Research Binance Coin (BNB) outlook" })
    expect(c).toContain("BNB-USD")
  })

  it("resolves asset-name aliases", () => {
    expect(buildSymbolCandidates({ description: "bitcoin price next 30 days" })).toContain(
      "BTC-USD"
    )
  })

  it("resolves $cashtags", () => {
    expect(buildSymbolCandidates({ description: "thoughts on $LINK lately" })).toContain(
      "LINK-USD"
    )
  })

  it("includes an explicit chartSymbol input", () => {
    expect(buildSymbolCandidates({ chartSymbol: "AAPL" })).toContain("AAPL")
  })

  it("returns nothing for objectives with no recognizable asset", () => {
    expect(buildSymbolCandidates({ description: "general thoughts on the economy" })).toEqual(
      []
    )
  })
})

function yahooResponse(symbol: string) {
  const now = Math.floor(Date.now() / 1000)
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [
          {
            meta: { symbol, currency: "USD", shortName: symbol },
            timestamp: [now - 86400, now],
            indicators: { quote: [{ close: [100, 110] }] },
          },
        ],
      },
    }),
  }
}

describe("resolveMarketChart", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns a chart when Yahoo has data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => yahooResponse("BTC-USD") as unknown as Response)
    )
    const { chart, chartSymbol } = await resolveMarketChart({ description: "bitcoin" })
    expect(chart?.data.length).toBe(2)
    expect(chartSymbol).toBe("BTC-USD")
  })

  it("falls back to candidates when Yahoo returns no data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }) as unknown as Response)
    )
    const { chart, candidates } = await resolveMarketChart({ description: "bitcoin" })
    expect(chart).toBeUndefined()
    expect(candidates).toContain("BTC-USD")
  })
})
