"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LinkIcon,
  MinusIcon,
  SparklesIcon,
} from "lucide-react"

import type { Agent, AgentResultMetric, AgentResultSource } from "@/lib/types"
import { AgentResultChartPanel } from "@/components/agent-result-chart"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type { AgentResult, AgentResultMetric, AgentResultSource } from "@/lib/types"

const sourceTypeLabel: Record<string, string> = {
  news: "News",
  filing: "Filing",
  data: "Data",
  doc: "Research",
}

const sourceTypeClass: Record<string, string> = {
  news: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/80 dark:text-sky-300",
  filing: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-300",
  data: "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/80 dark:text-violet-300",
  doc: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300",
}

const tierClass: Record<string, string> = {
  Intern: "border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300",
  King: "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
}

function parseSearchCount(summary: string): number | null {
  const match = summary.match(/\((\d+)\s+web searches?\)/i)
  return match ? Number(match[1]) : null
}

function cleanSummary(summary: string): string {
  return summary.replace(/\s*\(\d+\s+web searches?\)/i, "").trim()
}

function metricTone(change?: string): "up" | "down" | "neutral" {
  if (!change) return "neutral"
  const c = change.toLowerCase()
  if (c.includes("oversold") || c.includes("fear") || c.includes("sell") || c.includes("bear")) {
    return "down"
  }
  if (c.includes("buy") || c.includes("bull") || c.includes("greed") || c.startsWith("+")) {
    return "up"
  }
  if (c.startsWith("-") || c.includes("outflow") || c.includes("decline")) {
    return "down"
  }
  return "neutral"
}

function MetricChange({ change }: { change?: string }) {
  if (!change) return null
  const tone = metricTone(change)
  const Icon =
    tone === "up" ? ArrowUpIcon : tone === "down" ? ArrowDownIcon : MinusIcon

  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-0.5 text-[0.65rem] font-medium",
        tone === "up" && "text-emerald-600 dark:text-emerald-400",
        tone === "down" && "text-red-600 dark:text-red-400",
        tone === "neutral" && "text-muted-foreground"
      )}
    >
      <Icon className="size-2.5" />
      {change}
    </span>
  )
}

function MetricsGrid({ metrics }: { metrics: AgentResultMetric[] }) {
  const [hero, ...rest] = metrics

  return (
    <div className="space-y-3">
      {hero ? (
        <div className="rounded-xl border bg-linear-to-br from-muted/40 to-muted/10 p-4">
          <p className="text-xs font-medium text-muted-foreground">{hero.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {hero.value}
          </p>
          <MetricChange change={hero.change} />
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rest.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border bg-card px-3 py-2.5 shadow-xs"
            >
              <p className="text-[0.65rem] font-medium text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums leading-tight">
                {metric.value}
              </p>
              <MetricChange change={metric.change} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function HighlightsList({ highlights }: { highlights: string[] }) {
  return (
    <ol className="space-y-2">
      {highlights.map((item, index) => (
        <li
          key={item}
          className="flex gap-3 rounded-lg border border-l-2 border-l-emerald-500/70 bg-card px-3 py-2.5 text-sm leading-relaxed shadow-xs"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[0.65rem] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            {index + 1}
          </span>
          <span className="text-foreground/90">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function SourcesList({ sources }: { sources: AgentResultSource[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/15 hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "h-5 shrink-0 px-1.5 text-[0.6rem]",
                  sourceTypeClass[source.type] ?? ""
                )}
              >
                {sourceTypeLabel[source.type] ?? source.type}
              </Badge>
              <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
              {source.title}
            </p>
            <p className="truncate text-[0.65rem] text-muted-foreground">
              {source.url.replace(/^https?:\/\/(www\.)?/, "")}
            </p>
          </a>
        </li>
      ))}
    </ul>
  )
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-8 mb-4 text-lg font-bold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-7 mb-3 border-b border-border/60 pb-2 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-5 mb-2 text-sm font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-[0.9rem] leading-7 text-foreground/88 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[0.9rem] leading-relaxed text-foreground/88">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-5 overflow-x-auto rounded-xl border shadow-xs">
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/60">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-border/60">{children}</tbody>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2.5 text-xs text-foreground/90">{children}</td>
  ),
  hr: () => <hr className="my-6 border-border/60" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 rounded-r-lg border-l-4 border-amber-400/60 bg-amber-50/50 py-1 pl-4 text-sm italic text-foreground/75 dark:bg-amber-950/20">
      {children}
    </blockquote>
  ),
}

type AgentResultSheetProps = {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentResultSheet({
  agent,
  open,
  onOpenChange,
}: AgentResultSheetProps) {
  if (!agent?.result) return null

  const { result } = agent
  const searchCount = parseSearchCount(result.summary)
  const summaryText = cleanSummary(result.summary)
  const sourceCount = result.sources?.length ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{ width: "min(64vw, 58rem)", maxWidth: "none" }}
        className="top-0 right-0 bottom-0 flex h-svh max-h-svh min-h-svh flex-col gap-0 overflow-hidden border-l p-0 data-[side=right]:max-w-none"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3 pr-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80">
              <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <SheetTitle className="text-left text-base leading-snug sm:text-lg">
                {agent.name}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("h-5 gap-1 px-2 text-[0.65rem]", tierClass[agent.experience])}
                >
                  <SparklesIcon className="size-3" />
                  {agent.experience}
                </Badge>
                <Badge variant="outline" className="h-5 gap-1 px-2 text-[0.65rem] text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {result.completedAt}
                </Badge>
                {searchCount !== null ? (
                  <Badge variant="outline" className="h-5 px-2 text-[0.65rem] text-muted-foreground">
                    {searchCount} searches
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-card px-4 py-3 shadow-xs">
            <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              Executive summary
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
              {summaryText}
            </p>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b px-5 py-2 sm:px-6">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <LayoutDashboardIcon className="size-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="report" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <FileTextIcon className="size-3.5" />
                Report
              </TabsTrigger>
              <TabsTrigger value="sources" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <LinkIcon className="size-3.5" />
                Sources
                {sourceCount > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 text-[0.6rem] tabular-nums">
                    {sourceCount}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="overview" className="mt-0 px-5 py-4 sm:px-6">
              <div className="space-y-6">
                <AgentResultChartPanel agentId={agent.id} />

                {result.metrics && result.metrics.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      <LayoutDashboardIcon className="size-3.5" />
                      Key metrics
                    </h3>
                    <MetricsGrid metrics={result.metrics} />
                  </section>
                ) : null}

                {result.highlights && result.highlights.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      <BookOpenIcon className="size-3.5" />
                      Highlights
                    </h3>
                    <HighlightsList highlights={result.highlights} />
                  </section>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="report" className="mt-0 px-5 py-4 sm:px-6">
              <article className="rounded-xl border bg-card px-4 py-5 shadow-xs sm:px-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {result.analysis}
                </ReactMarkdown>
              </article>
              <p className="mt-4 text-center text-[0.65rem] leading-relaxed text-muted-foreground">
                Research only — not investment advice. Verify figures against primary sources.
              </p>
            </TabsContent>

            <TabsContent value="sources" className="mt-0 px-5 py-4 sm:px-6">
              {result.sources && result.sources.length > 0 ? (
                <SourcesList sources={result.sources} />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                  <LinkIcon className="size-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No sources cited</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
