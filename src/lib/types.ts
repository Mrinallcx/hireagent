export type AgentStatus = "success" | "running" | "error" | "rejected"
export type ExperienceLevel = "Intern" | "King"

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

export type AgentResultChartPoint = {
  date: string
  price: number
}

export type AgentResultChart = {
  symbol: string
  label: string
  currency?: string
  data: AgentResultChartPoint[]
}

export type AgentResult = {
  summary: string
  completedAt: string
  metrics?: AgentResultMetric[]
  highlights?: string[]
  analysis: string
  sources?: AgentResultSource[]
  chartSymbol?: string
  chart?: AgentResultChart
}

export type Agent = {
  id: string
  name: string
  description: string
  category: string
  experience: ExperienceLevel
  progress: number
  status: AgentStatus
  createdAt: number
  result?: AgentResult
}
