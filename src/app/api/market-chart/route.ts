import { resolveMarketChart } from "@/lib/market-chart"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const description = searchParams.get("description") ?? undefined
  const chartSymbol =
    searchParams.get("chartSymbol") ?? searchParams.get("symbol") ?? undefined

  const { chart, chartSymbol: resolved, candidates } = await resolveMarketChart({
    chartSymbol,
    description,
  })

  if (!candidates.length) {
    return Response.json({ error: "no tradable symbol detected" }, { status: 400 })
  }

  if (!chart) {
    return Response.json(
      { error: "chart data unavailable", chartSymbol: resolved ?? candidates[0] },
      { status: 404 }
    )
  }

  return Response.json(chart)
}
