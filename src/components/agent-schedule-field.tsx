"use client"

import { CalendarIcon, ClockIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ScheduleType = "once" | "everyday" | "custom"

export type AgentSchedule = {
  type: ScheduleType
  runDate?: string
  runTime?: string
  dailyTime?: string
  customInterval?: string
  customUnit?: string
}

type AgentScheduleFieldProps = {
  value: AgentSchedule
  onChange: (value: AgentSchedule) => void
}

const customUnits = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
] as const

const scheduleTypes = [
  {
    value: "once" as const,
    label: "Once",
    description: "Run on a specific date",
  },
  {
    value: "everyday" as const,
    label: "Daily",
    description: "Coming soon",
    comingSoon: true,
  },
  {
    value: "custom" as const,
    label: "Custom",
    description: "Coming soon",
    comingSoon: true,
  },
]

export function AgentScheduleField({ value, onChange }: AgentScheduleFieldProps) {
  function updateSchedule(patch: Partial<AgentSchedule>) {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Label className="text-sm">Run schedule</Label>

      <div
        role="radiogroup"
        aria-label="Run schedule"
        className="grid grid-cols-3 gap-2"
      >
        {scheduleTypes.map((option) => {
          const selected = value.type === option.value
          const disabled = option.comingSoon

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => {
                if (!disabled) updateSchedule({ type: option.value })
              }}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                selected
                  ? "border-foreground/15 bg-muted shadow-sm"
                  : "border-input bg-background hover:bg-muted/40",
                disabled &&
                  "cursor-not-allowed opacity-55 hover:bg-background"
              )}
            >
              <span className="text-sm font-medium leading-none">
                {option.label}
              </span>
              <span
                className={cn(
                  "text-[0.65rem] leading-snug",
                  option.comingSoon
                    ? "font-medium text-muted-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {option.description}
              </span>
            </button>
          )
        })}
      </div>

      {value.type === "once" ? (
        <div className="rounded-lg border border-dashed bg-muted/25 p-3 opacity-60">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              When should this agent run?
            </p>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
              Coming soon
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="run-date"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <CalendarIcon className="size-3" />
                Date
              </Label>
              <Input
                id="run-date"
                name="runDate"
                type="date"
                disabled
                className="h-8 bg-background"
                value={value.runDate ?? ""}
                onChange={(event) =>
                  updateSchedule({ runDate: event.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="run-time"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <ClockIcon className="size-3" />
                Time
              </Label>
              <Input
                id="run-time"
                name="runTime"
                type="time"
                disabled
                className="h-8 bg-background"
                value={value.runTime ?? ""}
                onChange={(event) =>
                  updateSchedule({ runTime: event.target.value })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {value.type === "everyday" ? (
        <Input
          id="daily-time"
          name="dailyTime"
          type="time"
          aria-label="Daily run time"
          value={value.dailyTime ?? ""}
          onChange={(event) =>
            updateSchedule({ dailyTime: event.target.value })
          }
          required
        />
      ) : null}

      {value.type === "custom" ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">Every</span>
          <Input
            id="custom-interval"
            name="customInterval"
            type="number"
            min={1}
            placeholder="6"
            aria-label="Custom interval"
            className="w-20"
            value={value.customInterval ?? ""}
            onChange={(event) =>
              updateSchedule({ customInterval: event.target.value })
            }
            required
          />
          <Select
            value={value.customUnit ?? null}
            onValueChange={(unit) => {
              if (unit) updateSchedule({ customUnit: unit })
            }}
          >
            <SelectTrigger id="custom-unit" className="flex-1">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {customUnits.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}

export function isScheduleValid(schedule: AgentSchedule): boolean {
  switch (schedule.type) {
    case "once":
      return true
    case "everyday":
      return Boolean(schedule.dailyTime)
    case "custom":
      return Boolean(
        schedule.customInterval &&
          Number(schedule.customInterval) > 0 &&
          schedule.customUnit
      )
    default:
      return false
  }
}
