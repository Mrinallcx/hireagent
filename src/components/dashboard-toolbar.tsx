"use client"

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LayoutGridIcon,
  ListFilterIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react"

import type { AgentStatus } from "@/components/agent-cards"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type StatusFilter = "all" | AgentStatus

type StatusOption = {
  value: StatusFilter
  label: string
  dotClass?: string
  icon: React.ReactNode
  itemClass?: string
}

const statusOptions: StatusOption[] = [
  {
    value: "all",
    label: "All statuses",
    icon: <LayoutGridIcon className="size-3.5" />,
  },
  {
    value: "success",
    label: "Success",
    dotClass: "bg-emerald-500",
    itemClass: "text-emerald-700 dark:text-emerald-400",
    icon: <CheckCircle2Icon className="size-3.5" />,
  },
  {
    value: "running",
    label: "Running",
    dotClass: "bg-sky-500",
    itemClass: "text-sky-700 dark:text-sky-400",
    icon: <LoaderIcon className="size-3.5" />,
  },
  {
    value: "error",
    label: "Error",
    dotClass: "bg-red-500",
    itemClass: "text-red-700 dark:text-red-400",
    icon: <CircleAlertIcon className="size-3.5" />,
  },
  {
    value: "rejected",
    label: "Rejected",
    dotClass: "bg-orange-500",
    itemClass: "text-orange-700 dark:text-orange-400",
    icon: <XCircleIcon className="size-3.5" />,
  },
]

function getStatusOption(value: StatusFilter) {
  return statusOptions.find((option) => option.value === value)
}

function FilterOption({
  option,
  count,
}: {
  option: StatusOption
  count: number
}) {
  return (
    <div className="flex w-full items-center gap-2.5">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md bg-muted",
          option.itemClass
        )}
      >
        {option.icon}
      </span>
      <span className="flex-1 font-medium">{option.label}</span>
      <Badge
        variant="secondary"
        className="h-5 min-w-5 justify-center px-1.5 text-[0.65rem] tabular-nums"
      >
        {count}
      </Badge>
    </div>
  )
}

type DashboardToolbarProps = {
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  statusCounts: Record<StatusFilter, number>
}

export function DashboardToolbar({
  statusFilter,
  onStatusFilterChange,
  statusCounts,
}: DashboardToolbarProps) {
  const selected = getStatusOption(statusFilter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-56 flex-col gap-1.5">
        <Label
          htmlFor="status-filter"
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ListFilterIcon className="size-3.5" />
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            if (value) onStatusFilterChange(value as StatusFilter)
          }}
        >
          <SelectTrigger
            id="status-filter"
            className="h-9 w-full bg-background px-2.5 dark:bg-input/30"
          >
              {selected ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md bg-muted",
                      selected.itemClass
                    )}
                  >
                    {selected.icon}
                  </span>
                  <span className="truncate">{selected.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 px-1.5 text-[0.65rem] tabular-nums"
                  >
                    {statusCounts[statusFilter]}
                  </Badge>
                </div>
              ) : (
                <SelectValue placeholder="Filter status" />
              )}
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger
              sideOffset={4}
              className="p-1.5"
            >
              {statusOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="py-2"
                >
                  <FilterOption
                    option={option}
                    count={statusCounts[option.value]}
                  />
                </SelectItem>
              ))}
            </SelectContent>
        </Select>
      </div>
    </div>
  )
}
