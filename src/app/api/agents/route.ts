import { NextResponse } from "next/server"

import { runResearch } from "@/lib/researcher"
import { agentStore, getAgentsSorted } from "@/lib/store"
import type { Agent, ExperienceLevel } from "@/lib/types"

export function GET() {
  return NextResponse.json(getAgentsSorted())
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string
    description: string
    category: string
    experience: ExperienceLevel
  }

  const id = crypto.randomUUID()

  const agent: Agent = {
    id,
    name: body.name,
    description: body.description,
    category: body.category,
    experience: body.experience,
    progress: 0,
    status: "running",
    createdAt: Date.now(),
  }

  agentStore.set(id, agent)

  // Start background research — does not block the response
  runResearch(agent)

  return NextResponse.json(agent, { status: 201 })
}
