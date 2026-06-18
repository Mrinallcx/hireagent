import { agentRepository } from "@/lib/agent-repository"
import { startSession } from "@/lib/eve-client"
import { buildEnvelope } from "@/lib/job-envelope"
import { DEFAULT_MODEL_PROVIDER } from "@/lib/model-providers"
import { MOCK_SESSION, runMockResearch } from "@/lib/mock-research"
import type { Agent } from "@/lib/types"

/**
 * Engine entrypoint: chooses how a job runs.
 *
 * Global RESEARCH_MODE (env) can force mock/legacy/eve for all jobs. When unset
 * or "eve", each job's `modelProvider` decides:
 *   - "kimi" → legacy researcher.ts (original Kimi pipeline)
 *   - "groq" → Eve + Groq multi-agent (UI label: "Other")
 *
 * - "mock"  : deterministic canned progression (dev/CI/E2E)
 */

export type ResearchMode = "eve" | "mock" | "legacy"

export function researchMode(): ResearchMode {
  const mode = (process.env.RESEARCH_MODE ?? "eve").toLowerCase()
  if (mode === "mock" || mode === "legacy") return mode
  return "eve"
}

/** Resolve the engine for a specific job (respects env override, then modelProvider). */
export function engineForAgent(agent: Agent): ResearchMode {
  const global = researchMode()
  if (global === "mock" || global === "legacy") return global
  const provider = agent.modelProvider ?? DEFAULT_MODEL_PROVIDER
  return provider === "kimi" ? "legacy" : "eve"
}

const TIMEOUT_MS: Record<Agent["experience"], number> = {
  Intern: 600_000,
  King: 900_000,
}

function deadlineFor(mode: ResearchMode, experience: Agent["experience"]): number {
  if (mode === "mock") return Date.now() + 30_000
  return Date.now() + TIMEOUT_MS[experience]
}

/**
 * Start (or restart) research for a job. Sets watchdog timing, then dispatches
 * by mode. For Eve mode the session start is awaited so a failure to start is
 * surfaced immediately as an errored job; the run itself proceeds in the Eve
 * runtime and syncs via the hook.
 */
export async function startResearch(agent: Agent): Promise<Agent> {
  const mode = engineForAgent(agent)
  const startedAt = Date.now()
  const deadlineAt = deadlineFor(mode, agent.experience)

  if (mode === "mock") {
    const job =
      agentRepository.update(agent.id, {
        startedAt,
        deadlineAt,
        eveSessionId: MOCK_SESSION,
      }) ?? agent
    runMockResearch(job)
    return job
  }

  if (mode === "legacy") {
    const job = agentRepository.update(agent.id, { startedAt, deadlineAt }) ?? agent
    const { runResearch } = await import("@/lib/researcher")
    runResearch(job)
    return job
  }

  // mode === "eve"
  agentRepository.update(agent.id, { startedAt, deadlineAt })
  try {
    const envelope = buildEnvelope({
      jobId: agent.id,
      category: agent.category,
      experience: agent.experience,
      objective: agent.description,
    })
    const { sessionId, continuationToken } = await startSession(envelope)
    return (
      agentRepository.update(agent.id, { eveSessionId: sessionId, continuationToken }) ??
      agent
    )
  } catch (err) {
    console.error(`[research-engine] failed to start Eve session for ${agent.id}:`, err)
    return agentRepository.update(agent.id, { status: "error" }) ?? agent
  }
}
