import type { AgentResultChart } from "@/lib/types"

const TICKER_ALIASES: Record<string, string> = {
  "binance coin": "BNB-USD",
  bitcoin: "BTC-USD",
  ethereum: "ETH-USD",
  solana: "SOL-USD",
  dogecoin: "DOGE-USD",
  ripple: "XRP-USD",
  cardano: "ADA-USD",
  bnb: "BNB-USD",
  btc: "BTC-USD",
  eth: "ETH-USD",
  sol: "SOL-USD",
  doge: "DOGE-USD",
  xrp: "XRP-USD",
  ada: "ADA-USD",
  chainlink: "LINK-USD",
  link: "LINK-USD",
  pepe: "PEPE-USD",
  apple: "AAPL",
  microsoft: "MSFT",
  google: "GOOGL",
  alphabet: "GOOGL",
  amazon: "AMZN",
  tesla: "TSLA",
  nvidia: "NVDA",
  meta: "META",
  netflix: "NFLX",
  spy: "SPY",
  qqq: "QQQ",
  "s&p 500": "^GSPC",
  "s&p500": "^GSPC",
  nasdaq: "^IXIC",
  gold: "GC=F",
  oil: "CL=F",
  crude: "CL=F",
}

const ORDERED_ALIASES = Object.entries(TICKER_ALIASES).sort(
  (a, b) => b[0].length - a[0].length
)

export type ChartResolutionInput = {
  description?: string
  chartSymbol?: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function aliasPattern(alias: string): RegExp {
  if (alias.length <= 5) {
    return new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i")
  }
  return new RegExp(escapeRegExp(alias), "i")
}

function normalizeChartSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "")
}

function isLikelyTicker(value: string): boolean {
  const ticker = normalizeChartSymbol(value)
  if (ticker.length < 2 || ticker.length > 12) return false
  return /^[\^]?[A-Z][A-Z0-9.\-=^]{1,11}$/.test(ticker)
}

function expandSymbolVariants(symbol: string): string[] {
  const trimmed = symbol.trim()
  const upper = normalizeChartSymbol(trimmed)
  const variants = [trimmed, upper]

  if (upper.startsWith("^") || upper.includes("=") || upper.includes(".")) {
    return [...new Set(variants)]
  }

  if (upper.endsWith("-USD")) {
    variants.push(upper.replace("-USD", ""))
  } else if (!upper.includes("-")) {
    variants.push(`${upper}-USD`, upper)
  }

  return [...new Set(variants.filter(Boolean))]
}

function symbolsMatch(a: string, b: string): boolean {
  const left = normalizeChartSymbol(a).replace(/-USD$/, "")
  const right = normalizeChartSymbol(b).replace(/-USD$/, "")
  return left === right
}

/**
 * Resolve the primary tradable symbol for a research run.
 * Priority: explicit (TICKER) in objective → model chartSymbol → asset name aliases → $TICKER.
 * Metrics and comparison mentions (BTC/ETH) are intentionally ignored.
 */
export function buildSymbolCandidates(input: ChartResolutionInput): string[] {
  const description = input.description?.trim() ?? ""
  const candidates: string[] = []

  const paren = description.match(/\(([A-Za-z]{2,12})\)/)
  if (paren && isLikelyTicker(paren[1])) {
    candidates.push(...expandSymbolVariants(paren[1]))
  }

  if (input.chartSymbol?.trim()) {
    candidates.push(...expandSymbolVariants(input.chartSymbol))
  }

  for (const [alias, symbol] of ORDERED_ALIASES) {
    if (aliasPattern(alias).test(description)) {
      candidates.push(...expandSymbolVariants(symbol))
    }
  }

  for (const match of description.matchAll(/\$([A-Za-z]{2,12})\b/g)) {
    if (isLikelyTicker(match[1])) {
      candidates.push(...expandSymbolVariants(match[1]))
    }
  }

  return [...new Set(candidates)]
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string
        currency?: string
        longName?: string
        shortName?: string
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
  }
}

export async function fetchMarketChart(symbol: string): Promise<AgentResultChart | null> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  )
  url.searchParams.set("range", "3mo")
  url.searchParams.set("interval", "1d")

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 AgentHire/1.0" },
    cache: "no-store",
  })

  if (!res.ok) return null

  const json = (await res.json()) as YahooChartResponse
  const result = json.chart?.result?.[0]
  const timestamps = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []

  const data = timestamps
    .map((ts, index) => {
      const close = closes[index]
      if (close == null || Number.isNaN(close)) return null
      return {
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        price: close,
      }
    })
    .filter((point): point is { date: string; price: number } => point !== null)

  if (data.length < 2) return null

  const meta = result?.meta
  const label =
    meta?.shortName ?? meta?.longName ?? symbol.replace("-USD", "").replace("^", "")

  return {
    symbol: meta?.symbol ?? symbol,
    label,
    currency: meta?.currency ?? "USD",
    data,
  }
}

export async function resolveMarketChart(input: ChartResolutionInput): Promise<{
  chart?: AgentResultChart
  chartSymbol?: string
  candidates: string[]
}> {
  const candidates = buildSymbolCandidates(input)
  const expected = candidates[0]

  for (const candidate of candidates) {
    try {
      const chart = await fetchMarketChart(candidate)
      if (!chart) continue

      if (expected && !symbolsMatch(chart.symbol, expected) && !symbolsMatch(chart.symbol, candidate)) {
        continue
      }

      return { chart, chartSymbol: chart.symbol, candidates }
    } catch {
      continue
    }
  }

  return { chartSymbol: expected, candidates }
}

export async function attachMarketChart(
  description: string,
  chartSymbol?: string
): Promise<{ chart?: AgentResultChart; chartSymbol?: string }> {
  const { chart, chartSymbol: resolved } = await resolveMarketChart({
    description,
    chartSymbol,
  })
  return { chart, chartSymbol: chart?.symbol ?? resolved ?? chartSymbol }
}
