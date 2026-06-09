import { PostAgentForm } from "@/components/post-agent-form"
import { SiteHeader } from "@/components/site-header"

export default function PostAgentPage() {
  return (
    <>
      <SiteHeader title="Create agent" />
      <div className="flex flex-1 flex-col px-4 py-4 lg:px-6">
        <PostAgentForm />
      </div>
    </>
  )
}
