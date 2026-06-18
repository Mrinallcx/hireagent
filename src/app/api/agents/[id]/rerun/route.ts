import { NextResponse } from "next/server"

import { agentRepository } from "@/lib/agent-repository"
import { startResearch } from "@/lib/research-engine"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  const agent = agentRepository.get(id)

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Reset to a fresh running state, dropping any prior session/result.
  const reset =
    agentRepository.update(id, {
      status: "running",
      progress: 0,
      result: undefined,
      eveSessionId: undefined,
      continuationToken: undefined,
      usage: undefined,
    }) ?? agent

  const started = await startResearch(reset)
  return NextResponse.json(started)
}
