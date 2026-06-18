import { Agent as UndiciAgent, fetch as undiciFetch } from "undici"

import { agentStore } from "@/lib/store"
import { attachMarketChart } from "@/lib/market-chart"
import type { Agent, AgentResult, AgentResultMetric, AgentResultSource, ExperienceLevel } from "@/lib/types"

const KIMI_BASE = "https://api.moonshot.ai/v1"
const REQUEST_TIMEOUT_MS = 600_000
const OVERALL_TIMEOUT_MS = 900_000

const MIN_SEARCHES: Record<ExperienceLevel, number> = {
  Intern: 2,
  King: 3,
}

const kimiDispatcher = new UndiciAgent({
  headersTimeout: REQUEST_TIMEOUT_MS,
  bodyTimeout: REQUEST_TIMEOUT_MS,
  connectTimeout: 30_000,
})

type KimiMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: KimiToolCall[]; reasoning_content?: string }
  | { role: "tool"; tool_call_id: string; name: string; content: string }

type KimiToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type KimiChoice = {
  finish_reason: "stop" | "tool_calls" | "length" | null
  message: {
    role: "assistant"
    content: string | null
    tool_calls?: KimiToolCall[]
    reasoning_content?: string
  }
}

type KimiResponse = { choices: KimiChoice[] }

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatCompletedAt() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function updateProgress(id: string, progress: number) {
  const agent = agentStore.get(id)
  if (agent && agent.status === "running") {
    agentStore.set(id, { ...agent, progress: Math.min(progress, 99) })
  }
}

async function kimiFetch(body: object, signal?: AbortSignal): Promise<KimiResponse> {
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) throw new Error("KIMI_API_KEY not set")

  const res = await undiciFetch(`${KIMI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
    dispatcher: kimiDispatcher,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Kimi API ${res.status}: ${text}`)
  }

  return (await res.json()) as KimiResponse
}

async function callKimi(
  body: object,
  agentId: string,
  label: string
): Promise<KimiResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    console.log(`[researcher] ${agentId} ${label}`)
    return await kimiFetch(body, controller.signal)
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Kimi API request timed out")
    }
    const cause = err instanceof Error ? (err as Error & { cause?: Error }).cause : undefined
    if (cause && "code" in cause && cause.code === "UND_ERR_HEADERS_TIMEOUT") {
      throw new Error("Kimi API took too long to respond")
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function buildSystemPrompt(experience: ExperienceLevel): string {
  const isKing = experience === "King"
  const minSearches = MIN_SEARCHES[experience]

  return `You are a financial market research analyst. Today is ${todayLabel()}.

PHASE 1 — RESEARCH (you are here now):
• Use $web_search to gather REAL, CURRENT data. You MUST complete at least ${minSearches} separate web searches before writing the final report.
• Search topics: current price, technical indicators, news/sentiment, ETF/macro flows (as relevant to the objective).
• Do NOT write the final report during this phase. Only search or call tools.
• Do NOT narrate ("let me search") — just call $web_search.

PHASE 2 — REPORT (after enough searches):
• Output ONLY the formatted report below. No more searches.
• All data must be from your searches. Today is ${todayLabel()} — reject stale data from wrong years.
• Every source must be a real https:// URL from search results.

---STRUCTURED_DATA_START---
{
  "summary": "one sentence with a specific current data point",
  "chartSymbol": "Yahoo Finance ticker for the primary asset (e.g. BTC-USD, BNB-USD, LINK-USD, AAPL). Omit only if the objective is not a tradable asset.",
  "metrics": [{ "label": "string", "value": "string", "change": "string or omit" }],
  "highlights": ["string"],
  "sources": [{ "title": "string", "url": "https://...", "type": "news|filing|data|doc" }]
}
---STRUCTURED_DATA_END---

---ANALYSIS_START---
[markdown: ${isKing ? "metrics table, highlights, technicals, on-chain/flows, macro, news, bull/base/bear scenarios with %, key levels, summary" : "metrics table, technicals, macro, short-term outlook"}]
---ANALYSIS_END---`
}

const INCOMPLETE_PATTERNS = [
  /let me (search|make|run|do|gather|fetch)/i,
  /i need to search/i,
  /i('ll| will) search/i,
  /additional targeted search/i,
]

function hasRequiredMarkers(content: string): boolean {
  return (
    content.includes("---STRUCTURED_DATA_START---") &&
    content.includes("---STRUCTURED_DATA_END---") &&
    content.includes("---ANALYSIS_START---") &&
    content.includes("---ANALYSIS_END---")
  )
}

function looksIncomplete(content: string): boolean {
  if (!content || content.length < 800) return true
  return INCOMPLETE_PATTERNS.some((p) => p.test(content))
}

function validSources(sources: AgentResultSource[] | undefined): boolean {
  if (!sources || sources.length < 2) return false
  return sources.filter((s) => s.url?.startsWith("https://")).length >= 2
}

function nudgeSearch(messages: KimiMessage[], needed: number) {
  messages.push({
    role: "user",
    content: `You have not done enough research yet. Run ${needed} more $web_search call(s) for current data. Do NOT write the report yet.`,
  })
}

function nudgeWrite(messages: KimiMessage[]) {
  messages.push({
    role: "user",
    content:
      "Research phase complete. Write the FINAL report NOW. No more searches. " +
      "Use ---STRUCTURED_DATA_START--- / ---ANALYSIS_START--- markers exactly.",
  })
}

/** Phase 1: tool loop until minimum searches met */
async function runSearchPhase(
  messages: KimiMessage[],
  experience: ExperienceLevel,
  agentId: string,
  deadline: number
): Promise<number> {
  const minSearches = MIN_SEARCHES[experience]
  const tools = [{ type: "builtin_function", function: { name: "$web_search" } }]
  let searchCount = 0
  let iterations = 0
  const maxIterations = experience === "King" ? 12 : 8

  while (searchCount < minSearches && iterations < maxIterations) {
    if (Date.now() > deadline) throw new Error("Research timed out")

    iterations++
    updateProgress(agentId, Math.min(10 + searchCount * 15 + iterations * 5, 70))

    const data = await callKimi(
      {
        model: "kimi-k2.6",
        messages,
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 2000,
        tools,
        thinking: { type: "disabled" },
      },
      agentId,
      `search phase iter ${iterations}, searches=${searchCount}/${minSearches}`
    )

    const choice = data.choices[0]

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      searchCount += choice.message.tool_calls.length
      messages.push({
        role: "assistant",
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
        ...(choice.message.reasoning_content
          ? { reasoning_content: choice.message.reasoning_content }
          : {}),
      })
      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(args),
        })
      }
      continue
    }

    // Model tried to stop or write early — push back to search
    if (choice.message.content) {
      messages.push({ role: "assistant", content: choice.message.content })
    }
    nudgeSearch(messages, minSearches - searchCount)
  }

  if (searchCount < minSearches) {
    throw new Error(`Only ${searchCount}/${minSearches} searches completed`)
  }

  console.log(`[researcher] ${agentId} search phase done: ${searchCount} searches`)
  return searchCount
}

/** Phase 2: write report without tools — cannot search anymore */
async function runWritePhase(
  messages: KimiMessage[],
  experience: ExperienceLevel,
  agentId: string
): Promise<string> {
  nudgeWrite(messages)
  updateProgress(agentId, 80)

  const data = await callKimi(
    {
      model: "kimi-k2.6",
      messages,
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: experience === "King" ? 12000 : 8000,
      thinking: { type: "disabled" },
    },
    agentId,
    "write phase (no tools)"
  )

  updateProgress(agentId, 95)
  return data.choices[0]?.message?.content ?? ""
}

function parseResponse(raw: string): Omit<AgentResult, "completedAt"> & { searchCount?: number } {
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

export function runResearch(agent: Agent): void {
  void _run(agent)
}

async function _run(agent: Agent) {
  const { id, experience, description } = agent
  const deadline = Date.now() + OVERALL_TIMEOUT_MS

  try {
    updateProgress(id, 5)

    const messages: KimiMessage[] = [
      { role: "system", content: buildSystemPrompt(experience) },
      {
        role: "user",
        content: `Research objective:\n\n${description}\n\nStart with web searches. Today is ${todayLabel()}.`,
      },
    ]

    const searchCount = await runSearchPhase(messages, experience, id, deadline)
    const raw = await runWritePhase(messages, experience, id)

    if (!hasRequiredMarkers(raw) || looksIncomplete(raw)) {
      throw new Error("Model returned incomplete report")
    }

    const current = agentStore.get(id)
    if (!current || current.status !== "running") return

    const parsed = parseResponse(raw)
    const { chart, chartSymbol } = await attachMarketChart(
      description,
      parsed.chartSymbol
    )

    agentStore.set(id, {
      ...current,
      status: "success",
      progress: 100,
      result: {
        ...parsed,
        chartSymbol: chart?.symbol ?? chartSymbol ?? parsed.chartSymbol,
        chart,
        completedAt: formatCompletedAt(),
        summary: `${parsed.summary} (${searchCount} web searches)`,
      },
    })
  } catch (err) {
    console.error(`[researcher] agent ${id} failed:`, err)
    const current = agentStore.get(id)
    if (current) agentStore.set(id, { ...current, status: "error" })
  }
}
