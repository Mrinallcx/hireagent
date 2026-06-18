import { agentRepository } from "@/lib/agent-repository"
import type { Agent, AgentResult } from "@/lib/types"

/**
 * Deterministic mock research path for RESEARCH_MODE=mock.
 *
 * Skips Eve, Kimi, and Groq entirely: emits a fixed progress sequence and
 * a canned AgentResult so dev and E2E are fast and reproducible. The chart is
 * resolved lazily by the chart endpoint (same as the real path), so fixtures
 * carry only chartSymbol, not chart data.
 */

function fixtureFor(description: string): AgentResult {
  const text = description.toLowerCase()

  if (text.includes("sol") || text.includes("solana")) {
    return buildFixture({
      asset: "Solana",
      chartSymbol: "SOL-USD",
      price: "$152.30",
      change: "+4.2%",
    })
  }
  if (text.includes("aapl") || text.includes("apple")) {
    return buildFixture({
      asset: "Apple",
      chartSymbol: "AAPL",
      price: "$228.10",
      change: "+1.1%",
    })
  }
  if (text.includes("fail") || text.includes("xyzzy")) {
    // Sentinel objective used by the E2E failure-path test.
    throw new Error("Mock failure: objective is not researchable")
  }
  return buildFixture({
    asset: "Bitcoin",
    chartSymbol: "BTC-USD",
    price: "$104,250",
    change: "+2.6%",
  })
}

function buildFixture(opts: {
  asset: string
  chartSymbol: string
  price: string
  change: string
}): AgentResult {
  return {
    summary: `${opts.asset} trades at ${opts.price} (${opts.change} over 3 months) [mock]`,
    chartSymbol: opts.chartSymbol,
    metrics: [
      { label: "Price", value: opts.price, change: opts.change },
      { label: "3M Trend", value: "Uptrend" },
      { label: "Volatility", value: "Moderate" },
    ],
    highlights: [
      `${opts.asset} momentum is constructive on the 3-month window.`,
      "Macro backdrop is supportive with cooling rate expectations.",
      "Sentiment skews mildly bullish across surveyed sources.",
    ],
    analysis:
      `## ${opts.asset} Market Analysis (mock)\n\n` +
      `| Metric | Value |\n| --- | --- |\n| Price | ${opts.price} |\n| 3M Change | ${opts.change} |\n\n` +
      `### Technicals\n${opts.asset} holds above its medium-term moving averages with steady momentum. ` +
      `This is deterministic fixture content used for development and end-to-end tests.\n\n` +
      `### Outlook\nConstructive over the near term, contingent on macro stability. ` +
      `Not investment advice.`,
    sources: [
      { title: `${opts.asset} market data`, url: "https://example.com/markets", type: "data" },
      { title: `${opts.asset} latest news`, url: "https://example.com/news", type: "news" },
    ],
    completedAt: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }
}

const STEP_MS = Number(process.env.MOCK_STEP_MS ?? 400)

/** Drive a job to completion (or failure) via the repository over a few steps. */
export function runMockResearch(agent: Agent): void {
  void driveMock(agent.id, agent.description)
}

async function driveMock(id: string, description: string): Promise<void> {
  const steps = [15, 40, 70, 90]
  for (const progress of steps) {
    await delay(STEP_MS)
    const current = agentRepository.get(id)
    if (!current || current.status !== "running" || current.eveSessionId !== MOCK_SESSION) {
      return // deleted, rerun, or replaced
    }
    agentRepository.update(id, { progress: Math.max(current.progress, progress) })
  }

  await delay(STEP_MS)
  const current = agentRepository.get(id)
  if (!current || current.status !== "running" || current.eveSessionId !== MOCK_SESSION) return

  try {
    const result = fixtureFor(description)
    agentRepository.update(id, {
      status: "success",
      progress: 100,
      result,
      usage: { inputTokens: 0, outputTokens: 0 },
    })
  } catch {
    agentRepository.update(id, { status: "error", result: undefined })
  }
}

export const MOCK_SESSION = "mock-session"

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
