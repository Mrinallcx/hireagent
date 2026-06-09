"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import {
  ActivityIcon,
  ChartLineIcon,
  CoinsIcon,
  GlobeIcon,
  LayersIcon,
  LinkIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"

import {
  AgentOutputField,
  isOutputValid,
  type AgentOutput,
} from "@/components/agent-output-field"
import {
  AgentScheduleField,
  isScheduleValid,
  type AgentSchedule,
} from "@/components/agent-schedule-field"
import { FormDropdown, type DropdownGroup, type DropdownOption } from "@/components/form-dropdown"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExperienceLevel } from "@/lib/types"

const categoryGroups: DropdownGroup[] = [
  {
    label: "Market intelligence",
    options: [
      { value: "Market Analysis", label: "Market Analysis", icon: <TrendingUpIcon className="size-3.5" /> },
      { value: "Trading Signals", label: "Trading Signals", icon: <ActivityIcon className="size-3.5" />, comingSoon: true },
      { value: "Macro & Economics", label: "Macro & Economics", icon: <GlobeIcon className="size-3.5" />, comingSoon: true },
    ],
  },
  {
    label: "Crypto research",
    options: [
      { value: "Token Research", label: "Token Research", icon: <CoinsIcon className="size-3.5" />, comingSoon: true },
      { value: "On-Chain Analysis", label: "On-Chain Analysis", icon: <LinkIcon className="size-3.5" />, comingSoon: true },
      { value: "DeFi Analysis", label: "DeFi Analysis", icon: <LayersIcon className="size-3.5" />, comingSoon: true },
    ],
  },
  {
    label: "Risk & portfolio",
    options: [
      { value: "Portfolio Analysis", label: "Portfolio Analysis", icon: <WalletIcon className="size-3.5" />, comingSoon: true },
      { value: "Risk Assessment", label: "Risk Assessment", icon: <ShieldAlertIcon className="size-3.5" />, comingSoon: true },
      { value: "Financial Reporting", label: "Financial Reporting", icon: <ChartLineIcon className="size-3.5" />, comingSoon: true },
    ],
  },
]

const experienceLevels: DropdownOption[] = [
  {
    value: "Intern",
    label: "Intern",
    description: "Basic research — fast & lightweight",
    indicatorClassName: "bg-sky-400",
  },
  {
    value: "King",
    label: "King",
    description: "Deep multi-source analysis + scenarios",
    indicatorClassName: "bg-amber-400",
  },
]

export function PostAgentForm() {
  const router = useRouter()
  const [category, setCategory] = useState<string | null>("Market Analysis")
  const [experience, setExperience] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<AgentSchedule>({ type: "once" })
  const [output, setOutput] = useState<AgentOutput>({ destination: "dashboard" })
  const [launching, setLaunching] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!category || !experience || !isScheduleValid(schedule) || !isOutputValid(output)) {
      toast.error("Please fill in all required fields")
      return
    }

    const formData = new FormData(event.currentTarget)
    const name = formData.get("name") as string
    const description = formData.get("description") as string

    setLaunching(true)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          experience: experience as ExperienceLevel,
        }),
      })

      if (!res.ok) throw new Error("Failed to launch agent")

      toast.success("Agent launched", {
        description: `"${name}" is now running. Check the dashboard for updates.`,
      })

      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Failed to launch agent", {
        description: "Something went wrong. Please try again.",
      })
      setLaunching(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card size="sm">
        <CardHeader className="border-b pb-4">
          <CardTitle>Create agent</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-sm">
                  Agent name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. BTC Deep Research Agent"
                  required
                />
              </div>

              <FormDropdown
                id="category"
                label="Category"
                placeholder="Select category"
                value={category}
                onValueChange={setCategory}
                groups={categoryGroups}
                compact
              />

              <FormDropdown
                id="experience"
                label="Experience"
                placeholder="Select tier"
                value={experience}
                onValueChange={setExperience}
                options={experienceLevels}
                compact
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm">
                Research objective
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe what the agent should research. e.g. &quot;Analyze Bitcoin price action and macro outlook for the next 30 days. Focus on on-chain metrics, funding rates, and Fed policy impact.&quot;"
                rows={5}
                className="min-h-32 resize-y"
                required
              />
              <p className="text-[0.7rem] text-muted-foreground">
                The more specific your objective, the more targeted the output.
              </p>
            </div>

            <AgentOutputField value={output} onChange={setOutput} />

            <div className="pb-4">
              <AgentScheduleField value={schedule} onChange={setSchedule} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              disabled={launching}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={launching}>
              {launching ? "Launching…" : "Launch agent"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
