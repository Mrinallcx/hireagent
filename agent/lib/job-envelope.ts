/**
 * Canonical job-envelope format passed as the Eve session message.
 *
 * Eve hooks/tools must import from agent/lib — not src/lib. Next re-exports this
 * module from src/lib/job-envelope.ts for API routes.
 */

export type JobEnvelope = {
  jobId: string
  category: string
  experience: "Intern" | "King"
  objective: string
}

const JOB_HEADER = "<<<AGENT_JOB>>>"
const OBJECTIVE_MARKER = "<<<OBJECTIVE>>>"

export function buildEnvelope(job: JobEnvelope): string {
  return [
    JOB_HEADER,
    `jobId: ${job.jobId}`,
    `category: ${job.category}`,
    `experience: ${job.experience}`,
    OBJECTIVE_MARKER,
    job.objective.trim(),
  ].join("\n")
}

/** Extract just the job id from an envelope string (used by the sync hook). */
export function parseJobId(message: string): string | undefined {
  const match = message.match(/jobId:\s*([^\s]+)/)
  return match?.[1]
}

/** Fully parse an envelope. Returns undefined if it is not a well-formed envelope. */
export function parseEnvelope(message: string): JobEnvelope | undefined {
  if (!message.includes(JOB_HEADER)) return undefined

  const jobId = parseJobId(message)
  const category = message.match(/category:\s*(.+)/)?.[1]?.trim()
  const experienceRaw = message.match(/experience:\s*(Intern|King)/)?.[1]?.trim()
  const objectiveIndex = message.indexOf(OBJECTIVE_MARKER)
  const objective =
    objectiveIndex >= 0
      ? message.slice(objectiveIndex + OBJECTIVE_MARKER.length).trim()
      : undefined

  if (!jobId || !category || !experienceRaw || !objective) return undefined

  return {
    jobId,
    category,
    experience: experienceRaw as "Intern" | "King",
    objective,
  }
}
