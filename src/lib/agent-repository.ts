import type { Agent } from "@/lib/types"

/**
 * Repository seam for agent jobs.
 *
 * All API routes talk to this interface, never a raw map. The in-memory impl
 * below is the only implementation today; a Neon + Drizzle impl can drop in
 * behind the same interface with zero call-site changes.
 *
 * The repository also owns two cross-cutting concerns that must stay consistent
 * with storage: the stale-job watchdog (applied lazily on reads) and webhook
 * event de-duplication.
 */
export interface AgentRepository {
  /** All jobs, newest first, with the watchdog applied. */
  list(): Agent[]
  get(id: string): Agent | undefined
  getByEveSessionId(sessionId: string): Agent | undefined
  create(agent: Agent): Agent
  update(id: string, patch: Partial<Agent>): Agent | undefined
  delete(id: string): boolean
  countRunning(): number
  /** Webhook idempotency: has this (job,event) pair already been applied? */
  hasProcessedEvent(jobId: string, eventId: string): boolean
  markEventProcessed(jobId: string, eventId: string): void
}

const MAX_EVENTS_PER_JOB = 200

class InMemoryAgentRepository implements AgentRepository {
  private readonly jobs: Map<string, Agent>
  private readonly events: Map<string, Set<string>>

  constructor(jobs: Map<string, Agent>, events: Map<string, Set<string>>) {
    this.jobs = jobs
    this.events = events
  }

  /**
   * Flip any running job past its deadline to error. Applied on every read so a
   * crashed Eve run (or one that never emits a terminal event) cannot leave a
   * job spinning forever.
   */
  private sweepStale(): void {
    const now = Date.now()
    for (const [id, job] of this.jobs) {
      if (job.status === "running" && job.deadlineAt && job.deadlineAt < now) {
        this.jobs.set(id, {
          ...job,
          status: "error",
          result: undefined,
        })
      }
    }
  }

  list(): Agent[] {
    this.sweepStale()
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): Agent | undefined {
    this.sweepStale()
    return this.jobs.get(id)
  }

  getByEveSessionId(sessionId: string): Agent | undefined {
    this.sweepStale()
    for (const job of this.jobs.values()) {
      if (job.eveSessionId === sessionId) return job
    }
    return undefined
  }

  create(agent: Agent): Agent {
    this.jobs.set(agent.id, agent)
    return agent
  }

  update(id: string, patch: Partial<Agent>): Agent | undefined {
    const current = this.jobs.get(id)
    if (!current) return undefined
    const next = { ...current, ...patch }
    this.jobs.set(id, next)
    return next
  }

  delete(id: string): boolean {
    this.events.delete(id)
    return this.jobs.delete(id)
  }

  countRunning(): number {
    this.sweepStale()
    let n = 0
    for (const job of this.jobs.values()) {
      if (job.status === "running") n++
    }
    return n
  }

  hasProcessedEvent(jobId: string, eventId: string): boolean {
    return this.events.get(jobId)?.has(eventId) ?? false
  }

  markEventProcessed(jobId: string, eventId: string): void {
    let set = this.events.get(jobId)
    if (!set) {
      set = new Set()
      this.events.set(jobId, set)
    }
    // Bound memory: drop the oldest marker if we exceed the cap.
    if (set.size >= MAX_EVENTS_PER_JOB) {
      const first = set.values().next().value
      if (first !== undefined) set.delete(first)
    }
    set.add(eventId)
  }
}

// Persist across Next dev HMR / route module reloads via globalThis.
const g = globalThis as typeof globalThis & {
  __agentRepo_jobs_v1?: Map<string, Agent>
  __agentRepo_events_v1?: Map<string, Set<string>>
  __agentRepo_v1?: AgentRepository
}

if (!g.__agentRepo_jobs_v1) g.__agentRepo_jobs_v1 = new Map()
if (!g.__agentRepo_events_v1) g.__agentRepo_events_v1 = new Map()
if (!g.__agentRepo_v1) {
  g.__agentRepo_v1 = new InMemoryAgentRepository(
    g.__agentRepo_jobs_v1,
    g.__agentRepo_events_v1
  )
}

export const agentRepository: AgentRepository = g.__agentRepo_v1

/**
 * The raw jobs map, exposed only for the legacy researcher.ts compatibility path
 * (RESEARCH_MODE=legacy). New code must use `agentRepository`.
 */
export const agentJobsMap: Map<string, Agent> = g.__agentRepo_jobs_v1
