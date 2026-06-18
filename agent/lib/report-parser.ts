/**
 * Report marker parsing + validation, extracted from the legacy researcher.ts.
 *
 * The orchestrator's final message must contain the exact marker blocks so the
 * existing result contract (AgentResult) and the dashboard UI stay unchanged:
 *   ---STRUCTURED_DATA_START--- { ...json... } ---STRUCTURED_DATA_END---
 *   ---ANALYSIS_START--- ...markdown... ---ANALYSIS_END---
 */

import type { AgentResultMetric, AgentResultSource } from "./result-types"

export type ParsedReport = {
  summary: string
  chartSymbol?: string
  metrics: AgentResultMetric[]
  highlights: string[]
  analysis: string
  sources: AgentResultSource[]
}

const INCOMPLETE_PATTERNS = [
  /let me (search|make|run|do|gather|fetch)/i,
  /i need to search/i,
  /i('ll| will) search/i,
  /additional targeted search/i,
]

export function hasRequiredMarkers(content: string): boolean {
  return (
    content.includes("---STRUCTURED_DATA_START---") &&
    content.includes("---STRUCTURED_DATA_END---") &&
    content.includes("---ANALYSIS_START---") &&
    content.includes("---ANALYSIS_END---")
  )
}

export function looksIncomplete(content: string): boolean {
  if (!content || content.length < 800) return true
  return INCOMPLETE_PATTERNS.some((p) => p.test(content))
}

export function validSources(sources: AgentResultSource[] | undefined): boolean {
  if (!sources || sources.length < 2) return false
  return sources.filter((s) => s.url?.startsWith("https://")).length >= 2
}

/**
 * Parse the marker-formatted report into a structured report object.
 * Throws on missing markers, bad JSON, or insufficient https sources so the
 * caller can mark the job as failed (matching legacy behavior).
 */
export function parseReport(raw: string): ParsedReport {
  if (!hasRequiredMarkers(raw)) {
    throw new Error("Model returned incomplete report (missing markers)")
  }
  if (looksIncomplete(raw)) {
    throw new Error("Model returned incomplete report (too short or still searching)")
  }

  const structuredMatch = raw.match(
    /---STRUCTURED_DATA_START---\s*([\s\S]*?)\s*---STRUCTURED_DATA_END---/
  )
  const analysisMatch = raw.match(
    /---ANALYSIS_START---\s*([\s\S]*?)\s*---ANALYSIS_END---/
  )

  let structured: {
    summary?: string
    chartSymbol?: string
    metrics?: AgentResultMetric[]
    highlights?: string[]
    sources?: AgentResultSource[]
  } = {}

  if (structuredMatch?.[1]) {
    try {
      structured = JSON.parse(structuredMatch[1].trim()) as typeof structured
    } catch {
      throw new Error("Failed to parse structured JSON from model response")
    }
  }

  const analysis = analysisMatch?.[1]?.trim() ?? ""

  if (!structured.summary || !analysis) {
    throw new Error("Missing summary or analysis in model response")
  }

  if (!validSources(structured.sources)) {
    throw new Error("Insufficient valid source URLs in response")
  }

  return {
    summary: structured.summary,
    chartSymbol: structured.chartSymbol?.trim() || undefined,
    metrics: structured.metrics ?? [],
    highlights: structured.highlights ?? [],
    analysis,
    sources: structured.sources ?? [],
  }
}
