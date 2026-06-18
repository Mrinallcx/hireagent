import { NextResponse } from "next/server"

import { agentRepository } from "@/lib/agent-repository"
import { cancelSession } from "@/lib/eve-client"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const agent = agentRepository.get(id)

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(agent)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const agent = agentRepository.get(id)

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (agent.eveSessionId) {
    await cancelSession(agent.eveSessionId).catch(() => {})
  }

  agentRepository.delete(id)
  return NextResponse.json({ success: true })
}
