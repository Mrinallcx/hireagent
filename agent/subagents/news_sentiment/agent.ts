import { groq } from "@ai-sdk/groq"
import { defineAgent } from "eve"
import { z } from "zod"

// Model id inline — see GROQ_MODELS.news_sentiment in ../../lib/model-policy.ts
export default defineAgent({
  description:
    "Runs focused web searches for news, on-chain/macro flows, and sentiment about an " +
    "asset, returning cited highlights and https sources. Use for current qualitative context.",
  model: groq("llama-3.3-70b-versatile"),
  outputSchema: z.object({
    findings: z.string().describe("Concise factual summary across searches, with numbers and dates."),
    highlights: z.array(z.string()).describe("Bullet-point key takeaways."),
    sentiment: z
      .string()
      .describe("Overall sentiment read (e.g. bullish/neutral/bearish) with a one-line rationale."),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          type: z.enum(["news", "filing", "data", "doc"]),
        })
      )
      .describe("Cited https sources gathered during search."),
  }),
})
