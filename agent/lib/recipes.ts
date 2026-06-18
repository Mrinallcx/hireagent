import type { AgentRole } from "./model-policy"

/**
 * Recipe registry: maps a category to the specialists, skill, and any model
 * overrides that shape its report. Adding a new agent type is a new entry here
 * plus any new subagent folders — no orchestrator code change.
 *
 * The orchestrator is instruction-driven, so this registry is the canonical,
 * testable description of what each category runs. Keep the keys in sync with
 * the enabled categories in src/lib/agent-catalog.ts.
 */

export type Recipe = {
  category: string
  /** Declared subagent ids to delegate to, in dependency order. */
  subagents: string[]
  /** Skill ids the synthesizer loads, by tier. */
  skill: { Intern: string; King: string }
  /** Optional per-role Groq model id overrides for this category. */
  modelOverrides?: Partial<Record<AgentRole, string>>
}

export const RECIPES: Record<string, Recipe> = {
  "Market Analysis": {
    category: "Market Analysis",
    subagents: ["market_data", "news_sentiment", "report_synthesizer"],
    skill: { Intern: "market_analysis_intern", King: "market_analysis_king" },
  },
}

export const DEFAULT_RECIPE_KEY = "Market Analysis"

export function getRecipe(category: string): Recipe | undefined {
  return RECIPES[category]
}

/** Resolve a recipe, falling back to the default for any unknown category. */
export function resolveRecipe(category: string): Recipe {
  return RECIPES[category] ?? RECIPES[DEFAULT_RECIPE_KEY]
}
