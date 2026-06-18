"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { LineChartIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import type { AgentResultChart } from "@/lib/types"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const chartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

type TimeRange = "7d" | "30d" | "90d" | "all"

type ChartResponse =
  | { available: true; chart: AgentResultChart; chartSymbol: string }
  | { available: false; reason: "no_symbol" | "no_data"; chartSymbol?: string }

function filterByRange(
  data: AgentResultChart["data"],
  range: TimeRange
): AgentResultChart["data"] {
  if (range === "all" || data.length === 0) return data

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const end = new Date(data[data.length - 1].date)
  const start = new Date(end)
  start.setDate(start.getDate() - days)

  return data.filter((point) => new Date(point.date) >= start)
}

function formatPrice(value: number, currency = "USD"): string {
  if (currency === "USD") {
    return value >= 1000
      ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

type AgentResultChartPanelProps = {
  agentId: string
}

export function AgentResultChartPanel({ agentId }: AgentResultChartPanelProps) {
  const [chart, setChart] = React.useState<AgentResultChart | undefined>()
  const [loading, setLoading] = React.useState(true)
  const [unavailable, setUnavailable] = React.useState<{
    reason: "no_symbol" | "no_data"
    chartSymbol?: string
  } | null>(null)
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d")

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setUnavailable(null)
    setChart(undefined)

    fetch(`/api/agents/${agentId}/chart`)
      .then((res) => res.json())
      .then((data: ChartResponse) => {
        if (cancelled) return
        if (data.available) {
          setChart(data.chart)
          setUnavailable(null)
        } else {
          setChart(undefined)
          setUnavailable({
            reason: data.reason,
            chartSymbol: data.chartSymbol,
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChart(undefined)
          setUnavailable({ reason: "no_data" })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [agentId])

  const filteredData = React.useMemo(
    () => (chart ? filterByRange(chart.data, timeRange) : []),
    [chart, timeRange]
  )

  const priceChange = React.useMemo(() => {
    if (filteredData.length < 2) return null
    const first = filteredData[0].price
    const last = filteredData[filteredData.length - 1].price
    const delta = ((last - first) / first) * 100
    return { last, delta }
  }, [filteredData])

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <LineChartIcon className="size-3.5" />
          Price chart
        </div>
        <div className="mt-4 h-[220px] animate-pulse rounded-lg bg-muted/50" />
      </div>
    )
  }

  if (unavailable?.reason === "no_symbol") {
    return null
  }

  if (unavailable) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center shadow-xs">
        <LineChartIcon className="mx-auto size-6 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-foreground/80">
          Price chart unavailable
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {unavailable.chartSymbol
            ? `No market data found for ${unavailable.chartSymbol} on Yahoo Finance. The research report is still complete.`
            : "Market data could not be loaded for this asset."}
        </p>
      </div>
    )
  }

  if (!chart || filteredData.length < 2) return null

  const changeUp = (priceChange?.delta ?? 0) >= 0

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <LineChartIcon className="size-3.5" />
          Price chart
        </h3>
        <div className="flex items-center gap-2">
          <ToggleGroup
            multiple={false}
            value={[timeRange]}
            onValueChange={(value) => {
              const next = value[0] as TimeRange | undefined
              if (next) setTimeRange(next)
            }}
            variant="outline"
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="7d" className="px-2.5 text-xs">
              7D
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="px-2.5 text-xs">
              30D
            </ToggleGroupItem>
            <ToggleGroupItem value="90d" className="px-2.5 text-xs">
              90D
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="px-2.5 text-xs">
              All
            </ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value) setTimeRange(value as TimeRange)
            }}
          >
            <SelectTrigger size="sm" className="w-28 sm:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All data</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{chart.label}</p>
            {priceChange ? (
              <p className="text-xl font-semibold tabular-nums tracking-tight">
                {formatPrice(priceChange.last, chart.currency)}
              </p>
            ) : null}
          </div>
          {priceChange ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                changeUp
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
              )}
            >
              {changeUp ? (
                <TrendingUpIcon className="size-3" />
              ) : (
                <TrendingDownIcon className="size-3" />
              )}
              {changeUp ? "+" : ""}
              {priceChange.delta.toFixed(2)}%
            </span>
          ) : null}
        </div>

        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value) => formatPrice(Number(value), chart.currency)}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                  formatter={(value) => formatPrice(Number(value), chart.currency)}
                  indicator="line"
                />
              }
            />
            <Area
              dataKey="price"
              type="monotone"
              fill="url(#fillPrice)"
              stroke="var(--color-price)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
        <p className="mt-2 text-center text-[0.6rem] text-muted-foreground">
          Daily close · {chart.symbol} via Yahoo Finance
        </p>
      </div>
    </section>
  )
}
