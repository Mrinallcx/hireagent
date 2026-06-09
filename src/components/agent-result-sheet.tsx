"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CheckCircle2Icon, ClockIcon, ExternalLinkIcon } from "lucide-react"

import type { Agent } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// Re-export for any code that still imports these from here
export type { AgentResult, AgentResultMetric, AgentResultSource } from "@/lib/types"

const sourceTypeLabel: Record<string, string> = {
  news: "News",
  filing: "Filing",
  data: "Data",
  doc: "Research",
}

const sourceTypeClass: Record<string, string> = {
  news: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  filing: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  data: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  doc: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="top-0 right-0 bottom-0 flex h-svh max-h-svh min-h-svh w-full flex-col gap-0 overflow-hidden p-0 sm:w-[70vw] sm:max-w-none"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-left leading-snug">
                {agent.name}
              </SheetTitle>
              <SheetDescription className="text-left">
                {result.summary}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  Completed {result.completedAt}
                </span>
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 text-[0.65rem] border-muted-foreground/20 text-muted-foreground"
                >
                  {agent.experience} tier
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5 pb-8">
          {result.metrics && result.metrics.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Key metrics
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {result.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border bg-muted/30 px-3 py-2.5"
                  >
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {metric.value}
                    </p>
                    {metric.change ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {metric.change}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.highlights && result.highlights.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Highlights
              </h3>
              <ul className="space-y-2">
                {result.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Separator />

          <section className="space-y-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Full analysis
            </h3>
            <div className="rounded-lg border bg-card p-4 sm:p-5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mt-6 mb-3 text-base font-bold text-foreground first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-5 mb-2.5 text-sm font-semibold text-foreground first:mt-0 border-b pb-1">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-2 text-sm font-semibold text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-7 text-foreground/90 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 space-y-1.5 pl-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 space-y-1.5 pl-4 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm leading-relaxed text-foreground/90 list-disc">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/80">{children}</em>
                  ),
                  table: ({ children }) => (
                    <div className="mb-4 overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="divide-x">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-xs text-foreground/90">{children}</td>
                  ),
                  hr: () => <hr className="my-4 border-border" />,
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-2 border-muted-foreground/30 pl-4 text-sm italic text-foreground/70">{children}</blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-")
                    return isBlock ? (
                      <pre className="mb-3 overflow-x-auto rounded-md bg-muted px-4 py-3 text-xs">
                        <code>{children}</code>
                      </pre>
                    ) : (
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
                    )
                  },
                }}
              >
                {result.analysis}
              </ReactMarkdown>
            </div>
          </section>

          {result.sources && result.sources.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sources ({result.sources.length})
              </h3>
              <ul className="space-y-1.5">
                {result.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <Badge
                        variant="outline"
                        className={`h-4 shrink-0 px-1.5 text-[0.6rem] ${sourceTypeClass[source.type] ?? ""}`}
                      >
                        {sourceTypeLabel[source.type] ?? source.type}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {source.title}
                      </span>
                      <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Badge
            variant="outline"
            className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <CheckCircle2Icon className="size-3" />
            Run completed successfully
          </Badge>
        </div>
      </SheetContent>
    </Sheet>
  )
}
