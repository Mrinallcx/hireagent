import { groq } from "@ai-sdk/groq"
import { defineAgent } from "eve"

// Model id must be inline — Eve cannot load agent/lib/* from agent.ts at runtime.
// Keep in sync with GROQ_MODELS.orchestrator in ./lib/model-policy.ts
export default defineAgent({
  model: groq("llama-3.3-70b-versatile"),
})
