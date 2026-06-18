import { NextResponse } from "next/server"

import { agentRepository } from "@/lib/agent-repository"
import { checkCreate, commitRun, getClientIp } from "@/lib/guards"
import { startResearch } from "@/lib/research-engine"
import type { Agent } from "@/lib/types"

export function GET() {
  return NextResponse.json(agentRepository.list())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const ip = getClientIp(request)
  const check = checkCreate(ip, body)
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status })
  }

  const { name, description, category, experience, modelProvider } = check.data
  const id = crypto.randomUUID()

  const agent: Agent = {
    id,
    name,
    description,
    category,
    experience,
    modelProvider,
    progress: 0,
    status: "running",
    createdAt: Date.now(),
    ownerId: null, // anonymous public job until auth lands
  }

  agentRepository.create(agent)
  commitRun(ip, experience)

  const started = await startResearch(agent)

  return NextResponse.json(started, { status: 201 })
}
