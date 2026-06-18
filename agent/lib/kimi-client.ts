/**
 * Kimi (Moonshot) client, extracted from the legacy researcher.ts.
 *
 * Retains the proven web-search behavior: Kimi's builtin `$web_search` is a
 * server-side function on Moonshot. The protocol is to echo the tool-call
 * arguments back as the tool result; Moonshot injects real search results on the
 * next turn. We run a bounded loop, then ask the model to emit a compact JSON of
 * findings + https sources.
 *
 * This module is imported by the kimi_web_search tool, which runs in the app
 * runtime with full process.env (so KIMI_API_KEY is available).
 */

import { Agent as UndiciAgent, fetch as undiciFetch } from "undici"

const KIMI_BASE = "https://api.moonshot.ai/v1"
const REQUEST_TIMEOUT_MS = 120_000

const kimiDispatcher = new UndiciAgent({
  headersTimeout: REQUEST_TIMEOUT_MS,
  bodyTimeout: REQUEST_TIMEOUT_MS,
  connectTimeout: 30_000,
})

type KimiMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant"
      content: string | null
      tool_calls?: KimiToolCall[]
      reasoning_content?: string
    }
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

export type WebSearchSource = {
  title: string
  url: string
  type: "news" | "filing" | "data" | "doc"
}

export type WebSearchResult = {
  findings: string
  sources: WebSearchSource[]
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

async function callKimi(body: object): Promise<KimiResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
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

const SEARCH_TOOLS = [{ type: "builtin_function", function: { name: "$web_search" } }]

function normalizeSources(raw: unknown): WebSearchSource[] {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(["news", "filing", "data", "doc"])
  const seen = new Set<string>()
  const sources: WebSearchSource[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const url = String((item as Record<string, unknown>).url ?? "")
    if (!url.startsWith("https://") || seen.has(url)) continue
    seen.add(url)
    const typeRaw = String((item as Record<string, unknown>).type ?? "data")
    sources.push({
      title: String((item as Record<string, unknown>).title ?? url),
      url,
      type: (allowed.has(typeRaw) ? typeRaw : "data") as WebSearchSource["type"],
    })
  }
  return sources
}

/**
 * Run a single focused web search via Kimi and return findings + https sources.
 * `recency` is an optional hint appended to the query (e.g. "past week").
 */
export async function kimiWebSearch(
  query: string,
  opts: { recency?: string; maxIterations?: number } = {}
): Promise<WebSearchResult> {
  const recencyHint = opts.recency ? ` Focus on the ${opts.recency}.` : ""
  const messages: KimiMessage[] = [
    {
      role: "system",
      content:
        "You are a financial research web-search assistant. Use $web_search to gather " +
        "real, current data with citations. After searching, return ONLY a JSON object: " +
        `{"findings": "concise factual summary with specific numbers and dates", ` +
        `"sources": [{"title": "...", "url": "https://...", "type": "news|filing|data|doc"}]}. ` +
        "Every source url MUST be a real https:// link from your search results.",
    },
    { role: "user", content: `Search the web for: ${query}.${recencyHint}` },
  ]

  const maxIterations = opts.maxIterations ?? 4
  for (let i = 0; i < maxIterations; i++) {
    const data = await callKimi({
      model: "kimi-k2.6",
      messages,
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 2000,
      tools: SEARCH_TOOLS,
      thinking: { type: "disabled" },
    })

    const choice = data.choices[0]
    if (choice?.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
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
        // Moonshot protocol: echo the search arguments back; results are injected server-side.
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(args),
        })
      }
      continue
    }

    // Model produced a final answer; parse the JSON payload.
    const content = choice?.message?.content ?? ""
    return parseSearchPayload(content)
  }

  // Out of iterations: force a final structured answer with no more tools.
  messages.push({
    role: "user",
    content:
      "Stop searching. Return ONLY the JSON object with findings and https sources now.",
  })
  const final = await callKimi({
    model: "kimi-k2.6",
    messages,
    // kimi-k2.6 only accepts temperature 0.6; other values are rejected with 400.
    temperature: 0.6,
    max_tokens: 2000,
    thinking: { type: "disabled" },
  })
  return parseSearchPayload(final.choices[0]?.message?.content ?? "")
}

function parseSearchPayload(content: string): WebSearchResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        findings?: unknown
        sources?: unknown
      }
      return {
        findings: typeof parsed.findings === "string" ? parsed.findings : content.trim(),
        sources: normalizeSources(parsed.sources),
      }
    } catch {
      // fall through to raw text
    }
  }
  return { findings: content.trim(), sources: [] }
}
