"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ChannelBreakdown, type ChannelBreakdownRow } from "./ChannelBreakdown";
import { DateRangeQuickSelect, type DateRangeValue } from "./DateRangeQuickSelect";
import type { AnalyticsProperty } from "~/types/analytics";

interface ChannelBreakdownResponse {
  channelBreakdown?: ChannelBreakdownRow[];
  compare?: "previous_period" | "previous_year" | "none";
}

const compareModes: Array<{ value: "previous_period" | "previous_year" | "none"; label: string }> = [
  { value: "previous_period", label: "Previous Period" },
  { value: "previous_year", label: "Previous Year" },
  { value: "none", label: "No Comparison" },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as ChannelBreakdownResponse;
};

export function DeltaDashboard({ properties }: { properties: AnalyticsProperty[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.propertyId ?? "");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ startDate: "7daysAgo", endDate: "today" });
  const [compareMode, setCompareMode] = useState<"previous_period" | "previous_year" | "none">("previous_period");

  useEffect(() => {
    if (!selectedPropertyId && properties[0]) {
      setSelectedPropertyId(properties[0].propertyId);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.propertyId === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  );

  const compareParam = compareMode && compareMode !== "none" ? `&compare=${compareMode}` : "";
  const metricsParam = "&metrics=sessions,totalUsers";

  const { data, error, isLoading } = useSWR<ChannelBreakdownResponse>(
    selectedProperty
      ? [
          "delta-channel",
          selectedProperty.propertyId,
          dateRange.startDate,
          dateRange.endDate,
          compareMode,
        ]
      : null,
    () =>
      fetcher(
        `/api/analytics/properties/${selectedProperty!.propertyId}/data?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=channel${metricsParam}${compareParam}`
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
    }
  );

  if (!properties.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">No analytics properties available</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect a Google Analytics 4 property to start exploring channel deltas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-border pb-4">
            <h1 className="text-3xl font-bold text-foreground">Channel Delta Explorer</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Compare channel performance to quickly spot growth and declines.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-0">
          <div className="card-elevated rounded-lg p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-2">
                  <label htmlFor="delta-property" className="text-sm font-medium text-foreground">
                    Select property
                  </label>
                  <select
                    id="delta-property"
                    value={selectedPropertyId}
                    onChange={(event) => setSelectedPropertyId(event.target.value)}
                    className="w-full rounded-md border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {properties.map((property) => (
                      <option key={property.propertyId} value={property.propertyId}>
                        {property.displayName} ({property.propertyId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Compare against</span>
                  <div className="flex flex-wrap gap-2">
                    {compareModes.map((mode) => {
                      const isActive = compareMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setCompareMode(mode.value)}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Quick date ranges</h3>
                <DateRangeQuickSelect
                  value={dateRange}
                  onSelect={(option) =>
                    setDateRange({ startDate: option.startDate, endDate: option.endDate })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 px-4 sm:px-0">
          {selectedProperty ? (
            <ChannelBreakdown
              propertyId={selectedProperty.propertyId}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              compareMode={compareMode}
              className="card-elevated"
              prefetchedRows={data?.channelBreakdown}
              isPrefetchedLoading={isLoading}
              prefetchedError={error ? error.message : null}
              highlightDelta={compareMode !== "none"}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Select a property to view channel metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
