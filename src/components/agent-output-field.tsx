"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type OutputDestination = "dashboard" | "email" | "slack" | "webhook"

export type AgentOutput = {
  destination: OutputDestination
  email?: string
  slackWebhook?: string
  webhookUrl?: string
}

type AgentOutputFieldProps = {
  value: AgentOutput
  onChange: (value: AgentOutput) => void
}

export function AgentOutputField({ value, onChange }: AgentOutputFieldProps) {
  function updateOutput(patch: Partial<AgentOutput>) {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm">Output destination</Label>

      <ToggleGroup
        multiple={false}
        variant="outline"
        spacing={0}
        value={value.destination ? [value.destination] : []}
        onValueChange={(selected) => {
          const destination = selected[0] as OutputDestination | undefined
          if (destination) updateOutput({ destination })
        }}
        className="grid w-full grid-cols-2 sm:grid-cols-4"
      >
        <ToggleGroupItem value="dashboard" className="px-2">
          Dashboard
        </ToggleGroupItem>
        <ToggleGroupItem value="email" className="px-2">
          Email
        </ToggleGroupItem>
        <ToggleGroupItem value="slack" className="px-2">
          Slack
        </ToggleGroupItem>
        <ToggleGroupItem value="webhook" className="px-2">
          Webhook
        </ToggleGroupItem>
      </ToggleGroup>

      {value.destination === "dashboard" ? (
        <p className="text-xs text-muted-foreground">
          Results appear on your dashboard agent card after each run.
        </p>
      ) : null}

      {value.destination === "email" ? (
        <Input
          id="output-email"
          name="outputEmail"
          type="email"
          placeholder="you@company.com"
          aria-label="Email address"
          value={value.email ?? ""}
          onChange={(event) => updateOutput({ email: event.target.value })}
          required
        />
      ) : null}

      {value.destination === "slack" ? (
        <Input
          id="output-slack"
          name="outputSlack"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          aria-label="Slack webhook URL"
          value={value.slackWebhook ?? ""}
          onChange={(event) =>
            updateOutput({ slackWebhook: event.target.value })
          }
          required
        />
      ) : null}

      {value.destination === "webhook" ? (
        <Input
          id="output-webhook"
          name="outputWebhook"
          type="url"
          placeholder="https://api.yourapp.com/agent-results"
          aria-label="Webhook URL"
          value={value.webhookUrl ?? ""}
          onChange={(event) => updateOutput({ webhookUrl: event.target.value })}
          required
        />
      ) : null}
    </div>
  )
}

export function isOutputValid(output: AgentOutput): boolean {
  switch (output.destination) {
    case "dashboard":
      return true
    case "email":
      return Boolean(output.email?.includes("@"))
    case "slack":
      return Boolean(output.slackWebhook?.startsWith("http"))
    case "webhook":
      return Boolean(output.webhookUrl?.startsWith("http"))
    default:
      return false
  }
}
