import { NextResponse } from "next/server"

import { runResearch } from "@/lib/researcher"
import { agentStore } from "@/lib/store"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  const agent = agentStore.get(id)

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const reset = { ...agent, status: "running" as const, progress: 0, result: undefined }
  agentStore.set(id, reset)

  runResearch(reset)

  return NextResponse.json(reset)
}
