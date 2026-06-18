import { defineTool } from "eve/tools"
import { z } from "zod"

import { hasRequiredMarkers, looksIncomplete, parseReport } from "../lib/report-parser"

/**
 * Self-check tool for the synthesizer: verifies the marker-formatted report
 * parses cleanly and carries enough https sources BEFORE it is emitted as the
 * final message. Returns structured errors the model can fix and retry.
 */
export default defineTool({
  description:
    "Validate a marker-formatted report. Checks the required ---STRUCTURED_DATA--- " +
    "and ---ANALYSIS--- markers, that the JSON parses, and that there are at least " +
    "two https sources. Call this on your draft and fix any reported errors before " +
    "you output the final report.",
  inputSchema: z.object({
    report: z.string().describe("The full marker-formatted report draft."),
  }),
  async execute({ report }) {
    if (!hasRequiredMarkers(report)) {
      return { valid: false as const, errors: ["Missing one or more required markers."] }
    }
    if (looksIncomplete(report)) {
      return {
        valid: false as const,
        errors: ["Report looks incomplete (too short or contains search narration)."],
      }
    }
    try {
      const parsed = parseReport(report)
      return {
        valid: true as const,
        summaryPreview: parsed.summary,
        sourceCount: parsed.sources.length,
        chartSymbol: parsed.chartSymbol,
      }
    } catch (err) {
      return {
        valid: false as const,
        errors: [err instanceof Error ? err.message : "Unknown validation error."],
      }
    }
  },
})
