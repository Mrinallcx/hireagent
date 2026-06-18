import { describe, it, expect } from "vitest"

import {
  AGENT_CATEGORIES,
  categoryGroups,
  isCategoryEnabled,
} from "../../src/lib/agent-catalog"
import { getRecipe, resolveRecipe } from "../../agent/lib/recipes"

describe("agent-catalog", () => {
  it("enables Market Analysis and gates the rest", () => {
    expect(isCategoryEnabled("Market Analysis")).toBe(true)
    expect(isCategoryEnabled("Trading Signals")).toBe(false)
    expect(isCategoryEnabled("Nonexistent")).toBe(false)
  })

  it("groups every category", () => {
    const total = categoryGroups().reduce((n, g) => n + g.options.length, 0)
    expect(total).toBe(AGENT_CATEGORIES.length)
  })
})

describe("recipes", () => {
  it("resolves Market Analysis to its three subagents and skills", () => {
    const recipe = getRecipe("Market Analysis")
    expect(recipe?.subagents).toEqual([
      "market_data",
      "news_sentiment",
      "report_synthesizer",
    ])
    expect(recipe?.skill.King).toBe("market_analysis_king")
  })

  it("falls back to the default recipe for unknown categories", () => {
    expect(getRecipe("Unknown Category")).toBeUndefined()
    expect(resolveRecipe("Unknown Category").category).toBe("Market Analysis")
  })
})
