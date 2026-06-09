"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  LoaderIcon,
  RefreshCwIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"

import { AgentResultSheet } from "@/components/agent-result-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Re-export shared types so existing imports from this file still work
export type { Agent, AgentStatus, AgentResult, AgentResultMetric, AgentResultSource } from "@/lib/types"

import type { Agent, AgentStatus } from "@/lib/types"

const statusConfig: Record<
  AgentStatus,
  {
    label: string
    badgeClass: string
    progressClass: string
    icon: React.ReactNode
  }
> = {
  success: {
    label: "Success",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    progressClass: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
    icon: <CheckCircle2Icon className="size-3" />,
  },
  running: {
    label: "Running",
    badgeClass:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
    progressClass: "[&_[data-slot=progress-indicator]]:bg-sky-500",
    icon: <LoaderIcon className="size-3 animate-spin" />,
  },
  error: {
    label: "Error",
    badgeClass:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    progressClass: "[&_[data-slot=progress-indicator]]:bg-red-500",
    icon: <CircleAlertIcon className="size-3" />,
  },
  rejected: {
    label: "Rejected",
    badgeClass:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
    progressClass: "[&_[data-slot=progress-indicator]]:bg-orange-500",
    icon: <XCircleIcon className="size-3" />,
  },
}

function AgentCard({
  agent,
  onDelete,
  onRerun,
  onCheckResult,
}: {
  agent: Agent
  onDelete: (id: string) => void
  onRerun: (id: string) => void
  onCheckResult: (agent: Agent) => void
}) {
  const config = statusConfig[agent.status]

  return (
    <Card
      size="sm"
      className="relative flex flex-col [--card-spacing:--spacing(2.5)]"
    >
      <CardHeader className="space-y-0 pb-0 pr-8">
        <CardTitle className="line-clamp-1 text-sm leading-tight">
          {agent.name}
        </CardTitle>
        <CardDescription className="line-clamp-1 text-[0.7rem] leading-snug">
          {agent.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-2 pr-8">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("h-5 gap-1 px-1.5 text-[0.65rem]", config.badgeClass)}
          >
            {config.icon}
            {config.label}
          </Badge>
          <span className="text-[0.65rem] tabular-nums text-muted-foreground">
            {agent.progress}%
          </span>
        </div>
        <Progress
          value={agent.progress}
          className={cn("w-full gap-0", config.progressClass)}
        />
        {agent.status === "success" && agent.result ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1.5 text-xs"
            onClick={() => onCheckResult(agent)}
          >
            <ExternalLinkIcon className="size-3" />
            Check result
          </Button>
        ) : null}
      </CardContent>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute right-1.5 bottom-1.5 shrink-0 text-muted-foreground"
            />
          }
        >
          <EllipsisVerticalIcon className="size-3.5" />
          <span className="sr-only">Agent actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {agent.status === "success" && agent.result ? (
            <DropdownMenuItem onClick={() => onCheckResult(agent)}>
              <ExternalLinkIcon />
              Check result
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => onRerun(agent.id)}>
            <RefreshCwIcon />
            Rerun agent
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(agent.id)}
          >
            <Trash2Icon />
            Delete agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  )
}

export function AgentCards({
  agents,
  onDelete,
  onRerun,
  emptyMessage,
}: {
  agents: Agent[]
  onDelete: (id: string) => void
  onRerun: (id: string) => void
  emptyMessage?: string
}) {
  const [resultAgent, setResultAgent] = useState<Agent | null>(null)

  // Keep result sheet in sync if the agent updates (e.g. while open)
  const liveResultAgent = resultAgent
    ? (agents.find((a) => a.id === resultAgent.id) ?? resultAgent)
    : null

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm font-medium">
          {emptyMessage ?? "No agents yet"}
        </p>
        {!emptyMessage ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Create an agent to see it here.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onDelete={onDelete}
            onRerun={onRerun}
            onCheckResult={setResultAgent}
          />
        ))}
      </div>

      <AgentResultSheet
        agent={liveResultAgent}
        open={liveResultAgent !== null}
        onOpenChange={(open) => {
          if (!open) setResultAgent(null)
        }}
      />
    </>
  )
}
