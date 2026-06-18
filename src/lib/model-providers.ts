import type { ModelProvider } from "@/lib/types"

export type ModelProviderOption = {
  value: ModelProvider
  label: string
  description: string
  indicatorClassName?: string
}

/** Form + API options for the model provider dropdown. */
export const MODEL_PROVIDERS: ModelProviderOption[] = [
  {
    value: "kimi",
    label: "Kimi",
    description: "Original Kimi engine — web search + synthesis in one pipeline",
    indicatorClassName: "bg-violet-400",
  },
  {
    value: "groq",
    label: "Other",
    description: "Groq + Eve multi-agent orchestration (market data, news, report)",
    indicatorClassName: "bg-orange-400",
  },
]

export const DEFAULT_MODEL_PROVIDER: ModelProvider = "groq"

export function modelProviderLabel(value: ModelProvider | undefined): string {
  return MODEL_PROVIDERS.find((p) => p.value === value)?.label ?? "Other"
}
