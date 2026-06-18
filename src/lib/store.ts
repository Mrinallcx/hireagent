import { agentJobsMap, agentRepository } from "@/lib/agent-repository"
import type { Agent } from "@/lib/types"

/**
 * Backwards-compatible shim over the repository seam.
 *
 * `agentStore` is the same underlying map the repository uses, kept only so the
 * legacy researcher.ts (RESEARCH_MODE=legacy) can read/write jobs directly. All
 * new code should use `agentRepository` from "@/lib/agent-repository".
 */
export const agentStore = agentJobsMap

export function getAgentsSorted(): Agent[] {
  return agentRepository.list()
}
