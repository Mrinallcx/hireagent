import { defineTool } from "eve/tools"
import { z } from "zod"

import { kimiWebSearch } from "../lib/kimi-client"

/**
 * Dedicated web-search tool powered by Kimi (Moonshot $web_search).
 * Groq models orchestrate and synthesize; Kimi supplies current data + https
 * sources, preserving the legacy research quality.
 */
export default defineTool({
  description:
    "Search the web for current financial market data (prices, indicators, news, " +
    "filings, macro). Returns a concise findings summary plus cited https sources. " +
    "Call this multiple times with focused queries before writing any analysis.",
  inputSchema: z.object({
    query: z.string().min(3).describe("A focused search query, e.g. 'BNB price today technical indicators'"),
    recency: z
      .string()
      .optional()
      .describe("Optional recency hint, e.g. 'past 24 hours', 'past week'"),
  }),
  async execute({ query, recency }) {
    const { findings, sources } = await kimiWebSearch(query, { recency })
    return { findings, sources }
  },
})
