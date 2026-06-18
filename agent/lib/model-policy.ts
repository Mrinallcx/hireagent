/**
 * Central map of agent role -> Groq model id.
 *
 * Orchestration and synthesis use Groq (requires GROQ_API_KEY). Kimi remains the
 * Canonical Groq model ids per role. Used by tests, recipes, and instructions.
 *
 * agent.ts / subagent agent.ts files MUST NOT import this module — Eve reloads
 * those configs at runtime and cannot resolve agent/lib/* from the compiled map.
 * Duplicate the model id inline in each agent.ts (see comments there).
 *
 * `agent.ts` `model` is static at compile time, so per-tier (Intern/King)
 * routing is expressed through instructions + recipe depth rather than swapping
 * the model at runtime. `synthesizerTokens(tier)` carries the tier-dependent
 * budget the synthesizer should target.
 */

export type AgentRole =
  | "orchestrator"
  | "market_data"
  | "news_sentiment"
  | "report_synthesizer"

export type Tier = "Intern" | "King"

const GROQ_MODELS: Record<AgentRole, string> = {
  orchestrator: "llama-3.3-70b-versatile",
  market_data: "llama-3.1-8b-instant",
  news_sentiment: "llama-3.3-70b-versatile",
  report_synthesizer: "llama-3.3-70b-versatile",
}

/** Resolve the Groq model id for a role, honoring optional per-recipe overrides. */
export function modelIdFor(
  role: AgentRole,
  overrides?: Partial<Record<AgentRole, string>>
): string {
  return overrides?.[role] ?? GROQ_MODELS[role]
}

/** Minimum distinct web searches required before a report may be written. */
export const MIN_SEARCHES: Record<Tier, number> = {
  Intern: 2,
  King: 3,
}

/** Target max output tokens for the synthesizer, scaled by tier. */
export function synthesizerTokens(tier: Tier): number {
  return tier === "King" ? 12000 : 8000
}
