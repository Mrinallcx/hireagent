import { AgentDashboard } from "@/components/agent-dashboard"
import { SiteHeader } from "@/components/site-header"
import { getAgentsSorted } from "@/lib/store"

// Always render fresh — agents change at runtime
export const dynamic = "force-dynamic"

export default function Page() {
  const agents = getAgentsSorted()

  return (
    <>
      <SiteHeader title="Agents" />
      <div className="flex flex-1 flex-col px-4 py-4 lg:px-6">
        <AgentDashboard initialAgents={agents} />
      </div>
    </>
  )
}
