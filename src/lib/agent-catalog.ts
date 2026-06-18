import type { ExperienceLevel } from "@/lib/types"

/**
 * Single source of truth for agent categories and tiers.
 *
 * Feeds both the post-agent form (which categories are selectable / coming soon)
 * and backend recipe selection + public guards (which categories are accepted).
 * Enabling a category is a one-place flip here plus a recipe entry.
 */

export type AgentCategoryGroup =
  | "Market intelligence"
  | "Crypto research"
  | "Risk & portfolio"

export type AgentCategory = {
  value: string
  label: string
  group: AgentCategoryGroup
  /** Icon name from lucide-react, resolved in the form. */
  icon: string
  enabled: boolean
}

export const AGENT_CATEGORIES: AgentCategory[] = [
  { value: "Market Analysis", label: "Market Analysis", group: "Market intelligence", icon: "TrendingUp", enabled: true },
  { value: "Trading Signals", label: "Trading Signals", group: "Market intelligence", icon: "Activity", enabled: false },
  { value: "Macro & Economics", label: "Macro & Economics", group: "Market intelligence", icon: "Globe", enabled: false },
  { value: "Token Research", label: "Token Research", group: "Crypto research", icon: "Coins", enabled: false },
  { value: "On-Chain Analysis", label: "On-Chain Analysis", group: "Crypto research", icon: "Link", enabled: false },
  { value: "DeFi Analysis", label: "DeFi Analysis", group: "Crypto research", icon: "Layers", enabled: false },
  { value: "Portfolio Analysis", label: "Portfolio Analysis", group: "Risk & portfolio", icon: "Wallet", enabled: false },
  { value: "Risk Assessment", label: "Risk Assessment", group: "Risk & portfolio", icon: "ShieldAlert", enabled: false },
  { value: "Financial Reporting", label: "Financial Reporting", group: "Risk & portfolio", icon: "ChartLine", enabled: false },
]

export const EXPERIENCE_LEVELS: ExperienceLevel[] = ["Intern", "King"]

export function getCategory(value: string): AgentCategory | undefined {
  return AGENT_CATEGORIES.find((c) => c.value === value)
}

export function isCategoryEnabled(value: string): boolean {
  return getCategory(value)?.enabled ?? false
}

export function isExperienceLevel(value: string): value is ExperienceLevel {
  return (EXPERIENCE_LEVELS as string[]).includes(value)
}

/** Group categories for rendering in the form dropdown. */
export function categoryGroups(): { label: AgentCategoryGroup; options: AgentCategory[] }[] {
  const order: AgentCategoryGroup[] = ["Market intelligence", "Crypto research", "Risk & portfolio"]
  return order.map((label) => ({
    label,
    options: AGENT_CATEGORIES.filter((c) => c.group === label),
  }))
}
