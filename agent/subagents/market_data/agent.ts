import { groq } from "@ai-sdk/groq"
import { defineAgent } from "eve"
import { z } from "zod"

// Model id inline — see GROQ_MODELS.market_data in ../../lib/model-policy.ts
export default defineAgent({
  description:
    "Resolves the primary tradable symbol for an objective and extracts current " +
    "price, percent change, and key metrics. Use for any objective about a tradable asset.",
  model: groq("llama-3.1-8b-instant"),
  outputSchema: z.object({
    chartSymbol: z
      .string()
      .optional()
      .describe("Resolved Yahoo Finance ticker, e.g. BNB-USD, AAPL."),
    metrics: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          change: z.string().optional(),
        })
      )
      .describe("Price and indicator metrics."),
    notes: z.string().describe("Short note on data availability and recency."),
  }),
})
