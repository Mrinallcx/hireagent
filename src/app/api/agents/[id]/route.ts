import { NextResponse } from "next/server"

import { agentStore } from "@/lib/store"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const agent = agentStore.get(id)

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(agent)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const deleted = agentStore.delete(id)

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
