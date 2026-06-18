"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { AgentCards } from "@/components/agent-cards"
import {
  DashboardToolbar,
  type StatusFilter,
} from "@/components/dashboard-toolbar"
import type { Agent } from "@/lib/types"

type AgentDashboardProps = {
  initialAgents: Agent[]
}

export function AgentDashboard({
  initialAgents,
}: AgentDashboardProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const filteredAgents = useMemo(() => {
    if (statusFilter === "all") return agents
    return agents.filter((agent) => agent.status === statusFilter)
  }, [agents, statusFilter])

  const statusCounts = useMemo(() => {
    const counts = { all: agents.length, success: 0, running: 0, error: 0, rejected: 0 }
    for (const agent of agents) counts[agent.status] += 1
    return counts
  }, [agents])

  const hasRunning = agents.some((a) => a.status === "running")

  // Poll the API every 2s while any agent is running
  useEffect(() => {
    if (!hasRunning) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/agents")
        if (res.ok) {
          const fresh: Agent[] = await res.json()
          setAgents(fresh)
        }
      } catch {
        // silently ignore network errors during polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [hasRunning])

  const handleDelete = useCallback(async (id: string) => {
    const agent = agents.find((a) => a.id === id)

    // Optimistic remove
    setAgents((current) => current.filter((a) => a.id !== id))

    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" })
      toast.success("Agent deleted", {
        description: agent ? `"${agent.name}" has been removed.` : undefined,
      })
    } catch {
      // Roll back on failure
      if (agent) setAgents((current) => [agent, ...current])
      toast.error("Failed to delete agent")
    }
  }, [agents])

  const handleRerun = useCallback(async (id: string) => {
    const agent = agents.find((a) => a.id === id)
    if (!agent) return

    // Optimistic update
    setAgents((current) =>
      current.map((a) =>
        a.id === id ? { ...a, status: "running" as const, progress: 0, result: undefined } : a
      )
    )

    try {
      const res = await fetch(`/api/agents/${id}/rerun`, { method: "POST" })
      if (res.ok) {
        const updated: Agent = await res.json()
        setAgents((current) => current.map((a) => (a.id === id ? updated : a)))
        toast.success("Agent rerun started", {
          description: `"${agent.name}" is running again.`,
        })
      }
    } catch {
      // Roll back
      setAgents((current) => current.map((a) => (a.id === id ? agent : a)))
      toast.error("Failed to rerun agent")
    }
  }, [agents])

  return (
    <div className="flex flex-col gap-4">
      <DashboardToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
      />
      <AgentCards
        agents={filteredAgents}
        onDelete={handleDelete}
        onRerun={handleRerun}
        emptyMessage={
          statusFilter === "all"
            ? undefined
            : `No agents with "${statusFilter}" status.`
        }
      />
    </div>
  )
}
