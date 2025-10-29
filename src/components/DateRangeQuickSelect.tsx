"use client";

import { useMemo } from "react";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface DateRangeOption extends DateRangeValue {
  key: string;
  label: string;
}

const DEFAULT_OPTIONS: DateRangeOption[] = [
  { key: "1daysAgo", label: "Yesterday", startDate: "1daysAgo", endDate: "today" },
  { key: "7daysAgo", label: "Last 7 Days", startDate: "7daysAgo", endDate: "today" },
  { key: "14daysAgo", label: "Last 14 Days", startDate: "14daysAgo", endDate: "today" },
  { key: "30daysAgo", label: "Last 30 Days", startDate: "30daysAgo", endDate: "today" },
  { key: "90daysAgo", label: "Last 90 Days", startDate: "90daysAgo", endDate: "today" },
  { key: "180daysAgo", label: "Last 6 Months", startDate: "180daysAgo", endDate: "today" },
  { key: "365daysAgo", label: "Last Year", startDate: "365daysAgo", endDate: "today" },
];

export function useDateRangeQuickOptions(options?: DateRangeOption[]) {
  return useMemo(() => options ?? DEFAULT_OPTIONS, [options]);
}

export function DateRangeQuickSelect({
  value,
  onSelect,
  options,
  className = "",
  buttonClassName = "",
}: {
  value: DateRangeValue;
  onSelect: (option: DateRangeOption) => void;
  options?: DateRangeOption[];
  className?: string;
  buttonClassName?: string;
}) {
  const quickOptions = useDateRangeQuickOptions(options);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickOptions.map((option) => {
        const isActive = value.startDate === option.startDate && value.endDate === option.endDate;
        return (
          <button
            key={option.key}
            onClick={() => onSelect(option)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            } ${buttonClassName}`}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
