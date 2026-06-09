import type { Agent } from "@/lib/types"

// Bump the version suffix to force a fresh store (clears old seeded data)
const g = globalThis as typeof globalThis & {
  __agentStore_v3?: Map<string, Agent>
}

if (!g.__agentStore_v3) {
  g.__agentStore_v3 = new Map()
}

export const agentStore = g.__agentStore_v3

export function getAgentsSorted(): Agent[] {
  return Array.from(agentStore.values()).sort((a, b) => b.createdAt - a.createdAt)
}
