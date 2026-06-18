export type AgentStatus = "success" | "running" | "error" | "rejected"
export type ExperienceLevel = "Intern" | "King"

/** kimi = legacy researcher.ts | groq = Eve + Groq multi-agent (UI label: "Other") */
export type ModelProvider = "kimi" | "groq"

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

/**
 * Forward-compatible category-specific block. The result drawer renders known
 * kinds and ignores unknown ones, so new agent types do not break the UI.
 */
export type AgentResultSection = {
  title: string
  kind: string
  data: unknown
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
  sections?: AgentResultSection[]
}

export type AgentUsage = {
  inputTokens: number
  outputTokens: number
}

export type Agent = {
  id: string
  name: string
  description: string
  category: string
  experience: ExperienceLevel
  modelProvider: ModelProvider
  progress: number
  status: AgentStatus
  createdAt: number
  result?: AgentResult
  // Eve session linkage (set when a run starts)
  eveSessionId?: string
  continuationToken?: string
  // Watchdog timing
  startedAt?: number
  deadlineAt?: number
  // Cost/usage captured from the Eve run
  usage?: AgentUsage
  // Auth-ready: null = anonymous public job until platform auth lands
  ownerId?: string | null
}
