import { z } from "zod"

import { agentRepository } from "@/lib/agent-repository"
import { isCategoryEnabled } from "@/lib/agent-catalog"
import { DEFAULT_MODEL_PROVIDER } from "@/lib/model-providers"

/**
 * Public-launch safeguards for POST /api/agents.
 *
 * The form-first product is public, but the engine behind it spends real money
 * (Kimi + Groq), so unauthenticated requests must be bounded. Auth is
 * deferred; until it lands these limits are keyed by client IP. The job model
 * already carries ownerId so these upgrade to per-user + plan tier later.
 */

const NAME_MAX = 100
const OBJECTIVE_MIN = 10
const OBJECTIVE_MAX = Number(process.env.OBJECTIVE_MAX ?? 2000)

const MAX_RUNS_PER_IP_PER_DAY = Number(process.env.MAX_RUNS_PER_IP_PER_DAY ?? 3)
const MAX_KING_PER_IP_PER_DAY = Number(process.env.MAX_KING_PER_IP_PER_DAY ?? 1)
const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS ?? 2)

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(NAME_MAX),
  description: z
    .string()
    .trim()
    .min(OBJECTIVE_MIN, "Objective is too short")
    .max(OBJECTIVE_MAX, "Objective is too long"),
  category: z.string().trim().min(1),
  experience: z.enum(["Intern", "King"]),
  modelProvider: z.enum(["kimi", "groq"]).default(DEFAULT_MODEL_PROVIDER),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

export type GuardResult =
  | { ok: true; data: CreateAgentInput }
  | { ok: false; status: 400 | 403 | 429; error: string }

// Per-IP daily counters, persisted across HMR via globalThis.
type IpCounter = { day: string; total: number; king: number }
const g = globalThis as typeof globalThis & {
  __agentRateLimit_v1?: Map<string, IpCounter>
}
if (!g.__agentRateLimit_v1) g.__agentRateLimit_v1 = new Map()
const counters = g.__agentRateLimit_v1

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function counterFor(ip: string): IpCounter {
  const day = today()
  const existing = counters.get(ip)
  if (!existing || existing.day !== day) {
    const fresh: IpCounter = { day, total: 0, king: 0 }
    counters.set(ip, fresh)
    return fresh
  }
  return existing
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

/**
 * Validate input and enforce category + rate + concurrency limits. Does NOT
 * mutate counters; call commitRun() after a successful create so failed/blocked
 * requests don't consume quota.
 */
export function checkCreate(ip: string, body: unknown): GuardResult {
  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  if (!isCategoryEnabled(data.category)) {
    return { ok: false, status: 403, error: `Category "${data.category}" is not available yet` }
  }

  if (agentRepository.countRunning() >= MAX_CONCURRENT_RUNS) {
    return { ok: false, status: 429, error: "Too many agents are running right now. Try again shortly." }
  }

  const counter = counterFor(ip)
  if (counter.total >= MAX_RUNS_PER_IP_PER_DAY) {
    return { ok: false, status: 429, error: "Daily run limit reached. Try again tomorrow." }
  }
  if (data.experience === "King" && counter.king >= MAX_KING_PER_IP_PER_DAY) {
    return { ok: false, status: 429, error: "Daily King-tier limit reached. Use Intern or try tomorrow." }
  }

  return { ok: true, data }
}

/** Record a successful run against the IP's daily quota. */
export function commitRun(ip: string, experience: "Intern" | "King"): void {
  const counter = counterFor(ip)
  counter.total += 1
  if (experience === "King") counter.king += 1
}
