import { resolveMarketChart } from "@/lib/market-chart"
import { agentRepository } from "@/lib/agent-repository"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const agent = agentRepository.get(id)

  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 })
  }

  const input = {
    description: agent.description,
    chartSymbol: agent.result?.chartSymbol,
  }

  const { chart, chartSymbol, candidates } = await resolveMarketChart(input)

  if (!candidates.length) {
    return Response.json({
      available: false,
      reason: "no_symbol",
    })
  }

  if (!chart) {
    return Response.json({
      available: false,
      reason: "no_data",
      chartSymbol: chartSymbol ?? candidates[0],
    })
  }

  return Response.json({
    available: true,
    chart,
    chartSymbol: chart.symbol,
  })
}
