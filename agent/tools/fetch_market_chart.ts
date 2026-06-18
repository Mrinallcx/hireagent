import { defineTool } from "eve/tools"
import { z } from "zod"

import { resolveMarketChart } from "../lib/market-chart"

/**
 * Resolve the primary tradable symbol for an objective and confirm chart data is
 * available. Shares the exact resolver used by the dashboard's chart endpoint
 * (agent/lib/market-chart.ts) so the symbol the report claims matches the symbol
 * the UI will later render. Returns a compact price summary for the model to
 * reference; the full chart is fetched lazily by the chart API, not here.
 */
export default defineTool({
  description:
    "Resolve the Yahoo Finance ticker for the primary asset in the objective and " +
    "confirm 3-month price data exists. Returns the resolved chartSymbol plus a " +
    "compact price summary (first/last close and percent change).",
  inputSchema: z.object({
    description: z
      .string()
      .optional()
      .describe("The research objective text (used to detect the asset)."),
    chartSymbol: z
      .string()
      .optional()
      .describe("An explicit ticker guess, e.g. BNB-USD, AAPL."),
  }),
  async execute({ description, chartSymbol }) {
    const { chart, chartSymbol: resolved, candidates } = await resolveMarketChart({
      description,
      chartSymbol,
    })

    if (!chart) {
      return {
        available: false as const,
        chartSymbol: resolved ?? candidates[0],
        candidates,
      }
    }

    const first = chart.data[0]
    const last = chart.data[chart.data.length - 1]
    const changePct =
      first && last && first.price !== 0
        ? ((last.price - first.price) / first.price) * 100
        : undefined

    return {
      available: true as const,
      chartSymbol: chart.symbol,
      label: chart.label,
      currency: chart.currency,
      firstClose: first?.price,
      lastClose: last?.price,
      changePct: changePct != null ? Number(changePct.toFixed(2)) : undefined,
      points: chart.data.length,
    }
  },
})
