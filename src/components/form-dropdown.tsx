"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type DropdownOption = {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  indicatorClassName?: string
  comingSoon?: boolean
}

export type DropdownGroup = {
  label: string
  options: DropdownOption[]
  comingSoon?: boolean
}

type FormDropdownProps = {
  id: string
  label: string
  placeholder: string
  value: string | null
  onValueChange: (value: string | null) => void
  options?: DropdownOption[]
  groups?: DropdownGroup[]
  compact?: boolean
}

function findOption(
  options: DropdownOption[] | undefined,
  groups: DropdownGroup[] | undefined,
  value: string | null
): DropdownOption | undefined {
  if (!value) return undefined

  const flat = [
    ...(options ?? []),
    ...(groups?.flatMap((group) => group.options) ?? []),
  ]

  return flat.find((option) => option.value === value)
}

function ComingSoonBadge() {
  return (
    <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium tracking-normal text-muted-foreground normal-case">
      Coming soon
    </span>
  )
}

function OptionContent({
  option,
  compact,
}: {
  option: DropdownOption
  compact: boolean
}) {
  if (compact) {
    return (
      <div className="flex w-full items-center gap-2">
        {option.icon ? (
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            {option.icon}
          </span>
        ) : option.indicatorClassName ? (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              option.indicatorClassName
            )}
          />
        ) : null}
        <span>{option.label}</span>
        {option.comingSoon ? <ComingSoonBadge /> : null}
      </div>
    )
  }

  return (
    <div className="flex w-full items-start gap-3 py-0.5">
      {option.icon ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          {option.icon}
        </div>
      ) : option.indicatorClassName ? (
        <div
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            option.indicatorClassName
          )}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium leading-none">{option.label}</span>
        {option.description ? (
          <span className="text-xs leading-snug text-muted-foreground">
            {option.description}
          </span>
        ) : null}
      </div>
      {option.comingSoon ? <ComingSoonBadge /> : null}
    </div>
  )
}

function renderOptions(
  options: DropdownOption[],
  compact: boolean,
  groupComingSoon = false
) {
  return options.map((option) => {
    const disabled = groupComingSoon || option.comingSoon

    return (
      <SelectItem
        key={option.value}
        value={option.value}
        disabled={disabled}
        className={cn(
          compact ? "py-1.5" : "py-2.5",
          disabled && "opacity-50"
        )}
      >
        <OptionContent option={option} compact={compact} />
      </SelectItem>
    )
  })
}

export function FormDropdown({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  options,
  groups,
  compact = false,
}: FormDropdownProps) {
  const selected = findOption(options, groups, value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className="h-8 w-full bg-background px-2.5 dark:bg-input/30"
        >
          {selected ? (
            <div className="flex min-w-0 items-center gap-2">
              {selected.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                  {selected.icon}
                </span>
              ) : selected.indicatorClassName ? (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    selected.indicatorClassName
                  )}
                />
              ) : null}
              <span className="truncate">{selected.label}</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          sideOffset={4}
          className={cn(
            "max-h-48 min-w-52 p-1",
            compact ? "overflow-y-auto" : "min-w-72 p-1.5"
          )}
        >
          {groups
            ? groups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel
                    className={cn(
                      "flex items-center justify-between gap-2 px-2 text-muted-foreground",
                      compact
                        ? "py-1 text-[0.65rem] font-medium tracking-wide uppercase"
                        : "text-xs font-medium tracking-wide uppercase"
                    )}
                  >
                    <span>{group.label}</span>
                    {group.comingSoon ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium tracking-normal text-muted-foreground normal-case">
                        Coming soon
                      </span>
                    ) : null}
                  </SelectLabel>
                  {renderOptions(group.options, compact, group.comingSoon)}
                </SelectGroup>
              ))
            : renderOptions(options ?? [], compact)}
        </SelectContent>
      </Select>
    </div>
  )
}
