import { Agent as UndiciAgent, fetch as undiciFetch } from "undici"

import { agentStore } from "@/lib/store"
import type { Agent, AgentResult, AgentResultMetric, AgentResultSource, ExperienceLevel } from "@/lib/types"

const KIMI_BASE = "https://api.moonshot.ai/v1"
const REQUEST_TIMEOUT_MS = 600_000 // 10 min per API call (web search can be slow)
const OVERALL_TIMEOUT_MS = 900_000 // 15 min total

// Node's default fetch headers timeout (~5 min) is too short for Kimi $web_search
const kimiDispatcher = new UndiciAgent({
  headersTimeout: REQUEST_TIMEOUT_MS,
  bodyTimeout: REQUEST_TIMEOUT_MS,
  connectTimeout: 30_000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Slow creep 93→99 while waiting on a long final API response */
function startCreepTicker(id: string, from = 93) {
  let current = from
  return setInterval(() => {
    if (current < 99) {
      current += 1
      updateProgress(id, current)
    }
  }, 8000)
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

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildSystemPrompt(experience: ExperienceLevel): string {
  const isKing = experience === "King"

  return `You are a professional financial market research analyst. Use the web search tool to gather REAL, CURRENT market data before writing your analysis. Make ${isKing ? "3–4" : "2"} targeted searches — be efficient.

CRITICAL RULES:
• Do NOT output narration like "Let me search" or "I need to gather more data" — either call $web_search silently or output the final report.
• When you have enough data, STOP searching and output ONLY the final formatted report in your very next message.
• Never end a response with plans to search — always deliver the complete report.

After completing all your research, format your response EXACTLY as follows — no deviations:

---STRUCTURED_DATA_START---
{
  "summary": "One sharp sentence summarising the key finding with a specific data point",
  "metrics": [
    { "label": "Metric name", "value": "actual value", "change": "context or delta (optional)" }
  ],
  "highlights": ["insight 1", "insight 2", ...],
  "sources": [
    { "title": "Source title", "url": "https://...", "type": "news|filing|data|doc" }
  ]
}
---STRUCTURED_DATA_END---

---ANALYSIS_START---
[Full markdown analysis here]
---ANALYSIS_END---

Requirements:
• metrics: ${isKing ? "6–8" : "4–5"} items — use REAL values from your searches
• highlights: ${isKing ? "5–6" : "3"} key insights with specific data points
• sources: ${isKing ? "6–10" : "3–5"} real URLs from your searches
• analysis: Write in MARKDOWN with headers, tables, and bold text.
  ${isKing
    ? `Include: Metrics Dashboard table, Key Highlights, Technical Structure, On-Chain/Flow, Macro Context, News & Sentiment, Scenario Analysis (🟢 Bull / 🟡 Base / 🔴 Bear with %), Key Levels, Summary`
    : `Include: Metrics table, Technical Structure, Macro Backdrop, Short-Term Outlook`
  }
• Base EVERY number on data from web search — do NOT fabricate`
}

// ─── Response validation ──────────────────────────────────────────────────────

const INCOMPLETE_PATTERNS = [
  /let me (search|make|run|do|gather|fetch)/i,
  /i need to search/i,
  /i('ll| will) search/i,
  /searching for/i,
  /additional targeted search/i,
]

function isCompleteResponse(content: string): boolean {
  if (!content || content.length < 500) return false
  const hasMarkers =
    content.includes("---STRUCTURED_DATA_START---") &&
    content.includes("---ANALYSIS_START---")
  if (hasMarkers) return true
  // Accept long markdown reports even without exact markers
  if (content.length > 2000 && content.includes("##")) return true
  return false
}

function looksIncomplete(content: string): boolean {
  if (!content) return true
  if (content.length < 300) return true
  return INCOMPLETE_PATTERNS.some((p) => p.test(content))
}

function nudgeToFinish(messages: KimiMessage[]) {
  messages.push({
    role: "user",
    content:
      "You have enough data. Do NOT narrate or say you will search more. " +
      "Output the COMPLETE final report NOW using this exact format:\n\n" +
      "---STRUCTURED_DATA_START---\n{ json with summary, metrics, highlights, sources }\n---STRUCTURED_DATA_END---\n\n" +
      "---ANALYSIS_START---\n[ full markdown analysis ]\n---ANALYSIS_END---",
  })
}

// ─── API Loop ─────────────────────────────────────────────────────────────────

async function runKimiLoop(
  description: string,
  experience: ExperienceLevel,
  agentId: string
): Promise<string> {
  const messages: KimiMessage[] = [
    { role: "system", content: buildSystemPrompt(experience) },
    { role: "user", content: `Research objective:\n\n${description}` },
  ]

  const tools = [{ type: "builtin_function", function: { name: "$web_search" } }]
  const maxIterations = experience === "King" ? 14 : 8
  const overallDeadline = Date.now() + OVERALL_TIMEOUT_MS

  let iterations = 0
  let searchCount = 0

  while (iterations < maxIterations) {
    if (Date.now() > overallDeadline) {
      throw new Error("Research timed out after 10 minutes")
    }

    iterations++
    const isLikelyFinal = searchCount >= (experience === "King" ? 4 : 2)
    const progressBase = Math.min(
      10 + iterations * 8 + searchCount * 6,
      isLikelyFinal ? 88 : 75
    )
    updateProgress(agentId, progressBase)

    console.log(`[researcher] ${agentId} iteration ${iterations}, searches so far: ${searchCount}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let creepTicker: ReturnType<typeof setInterval> | undefined
    if (isLikelyFinal) {
      creepTicker = startCreepTicker(agentId, Math.max(progressBase, 88))
    }

    let data: KimiResponse
    try {
      data = await kimiFetch(
        {
          model: "kimi-k2.6",
          messages,
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: experience === "King" ? 12000 : 6000,
          tools,
          thinking: { type: "disabled" },
        },
        controller.signal
      )
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Kimi API request timed out after 10 minutes")
      }
      const cause = err instanceof Error ? (err as Error & { cause?: Error }).cause : undefined
      if (cause && "code" in cause && cause.code === "UND_ERR_HEADERS_TIMEOUT") {
        throw new Error("Kimi API took too long to respond — try Intern tier or a shorter research objective")
      }
      throw err
    } finally {
      clearTimeout(timeout)
      if (creepTicker) clearInterval(creepTicker)
    }

    const choice = data.choices[0]
    const content = choice.message.content ?? ""

    console.log(
      `[researcher] ${agentId} finish_reason=${choice.finish_reason}, content_len=${content.length}`
    )

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      searchCount += choice.message.tool_calls.length
      updateProgress(agentId, Math.min(10 + iterations * 8 + searchCount * 6, 90))

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

    if (choice.finish_reason === "stop" || choice.finish_reason === "length") {
      if (isCompleteResponse(content) && !looksIncomplete(content)) {
        updateProgress(agentId, 99)
        console.log(
          `[researcher] ${agentId} completed after ${iterations} iterations, ${searchCount} searches`
        )
        return content
      }

      // Model stopped early with narration only — nudge it to finish
      console.log(`[researcher] ${agentId} incomplete response, nudging to finish`)
      if (content) {
        messages.push({ role: "assistant", content })
      }
      nudgeToFinish(messages)
      continue
    }

    // Unexpected state — nudge and continue rather than returning partial text
    console.log(`[researcher] ${agentId} unexpected finish_reason, continuing`)
    if (content) {
      messages.push({ role: "assistant", content })
    }
    nudgeToFinish(messages)
  }

  throw new Error("Max iterations reached without a final response")
}

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseResponse(raw: string): Omit<AgentResult, "completedAt"> {
  const structuredMatch = raw.match(
    /---STRUCTURED_DATA_START---\s*([\s\S]*?)\s*---STRUCTURED_DATA_END---/
  )
  const analysisMatch = raw.match(
    /---ANALYSIS_START---\s*([\s\S]*?)\s*---ANALYSIS_END---/
  )

  let structured: {
    summary?: string
    metrics?: AgentResultMetric[]
    highlights?: string[]
    sources?: AgentResultSource[]
  } = {}

  if (structuredMatch?.[1]) {
    try {
      structured = JSON.parse(structuredMatch[1].trim()) as typeof structured
    } catch {
      // continue with defaults
    }
  }

  const analysis = analysisMatch?.[1]?.trim() ?? raw.trim()

  return {
    summary: structured.summary ?? "Research completed.",
    metrics: structured.metrics ?? [],
    highlights: structured.highlights ?? [],
    analysis,
    sources: structured.sources ?? [],
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runResearch(agent: Agent): void {
  void _run(agent)
}

async function _run(agent: Agent) {
  const { id, experience, description } = agent

  try {
    updateProgress(id, 5)
    const raw = await runKimiLoop(description, experience, id)

    const current = agentStore.get(id)
    if (!current || current.status !== "running") return

    if (!isCompleteResponse(raw) || looksIncomplete(raw)) {
      throw new Error("Research produced an incomplete response — please rerun the agent")
    }

    const parsed = parseResponse(raw)
    agentStore.set(id, {
      ...current,
      status: "success",
      progress: 100,
      result: { ...parsed, completedAt: formatCompletedAt() },
    })
  } catch (err) {
    console.error(`[researcher] agent ${id} failed:`, err)
    const current = agentStore.get(id)
    if (current) agentStore.set(id, { ...current, status: "error" })
  }
}
