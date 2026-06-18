import { groq } from "@ai-sdk/groq"
import { defineAgent } from "eve"
import { z } from "zod"

// Model id inline — see GROQ_MODELS.report_synthesizer in ../../lib/model-policy.ts
export default defineAgent({
  description:
    "Merges market data and news/sentiment into the final marker-formatted research " +
    "report. Use last, after the data and news subagents have returned.",
  model: groq("llama-3.3-70b-versatile"),
  outputSchema: z.object({
    report: z
      .string()
      .describe(
        "The complete report containing the exact ---STRUCTURED_DATA--- and " +
          "---ANALYSIS--- marker blocks. This string is relayed verbatim to the user."
      ),
  }),
})
