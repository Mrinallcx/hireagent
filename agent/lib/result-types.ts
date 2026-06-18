/** Minimal result shapes used by Eve-side parsers and tools (no src/lib imports). */

export type AgentResultMetric = {
  label: string
  value: string
  change?: string
}

export type AgentResultSource = {
  title: string
  url: string
  type: "news" | "filing" | "data" | "doc"
}

export type AgentResultChart = {
  symbol: string
  label: string
  currency: string
  data: Array<{ date: string; price: number }>
}
