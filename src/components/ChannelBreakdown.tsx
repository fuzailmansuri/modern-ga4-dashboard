"use client";

/**
 * ChannelBreakdown
 * Renders a table showing session/channel breakdown for a property.
 * Props: propertyId, startDate, endDate, compareMode, filters, className
 */
import React, { useMemo } from "react";
import useSWR from "swr";
import { normalizeFilterValues } from "~/lib/analytics-filter-utils";

interface ChannelMetric {
  current: number;
  prev?: number;
  delta?: number;
  deltaPct?: number;
}

interface ChannelRow {
  channel: string;
  metrics: Record<string, ChannelMetric>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
};

function fmtNumber(n?: number) {
  return (n ?? 0).toLocaleString();
}

function fmtPct(n?: number) {
  if (n === undefined || !isFinite(n)) return "--";
  return `${n.toFixed(1)}%`;
}

export function ChannelBreakdown({
  propertyId,
  startDate,
  endDate,
  compareMode,
  channelGroups = [],
  sourceMediums = [],
  countries = [],
  devices = [],
  className = "",
}: {
  propertyId: string;
  startDate: string;
  endDate: string;
  compareMode?: "previous_period" | "previous_year" | "none";
  channelGroups?: string[];
  sourceMediums?: string[];
  countries?: string[];
  devices?: string[];
  className?: string;
}) {
  const normalizedFilters = useMemo(() => ({
    channelGroups: normalizeFilterValues(channelGroups),
    sourceMediums: normalizeFilterValues(sourceMediums),
    countries: normalizeFilterValues(countries),
    devices: normalizeFilterValues(devices),
  }), [channelGroups, sourceMediums, countries, devices]);

  const params = useMemo(() => {
    const search = new URLSearchParams({
      startDate,
      endDate,
      groupBy: "channel",
      metrics: "sessions,totalUsers",
    });
    if (compareMode && compareMode !== "none") {
      search.set("compare", compareMode);
    }
    if (normalizedFilters.channelGroups.length) {
      search.set("channelGroups", normalizedFilters.channelGroups.join(","));
    }
    if (normalizedFilters.sourceMediums.length) {
      search.set("sourceMediums", normalizedFilters.sourceMediums.join(","));
    }
    if (normalizedFilters.countries.length) {
      search.set("countries", normalizedFilters.countries.join(","));
    }
    if (normalizedFilters.devices.length) {
      search.set("devices", normalizedFilters.devices.join(","));
    }
    return search;
  }, [endDate, startDate, compareMode, normalizedFilters]);

  const cacheKey = `channel-${propertyId}-${startDate}-${endDate}-${compareMode ?? "none"}-cg:${normalizedFilters.channelGroups.join("|")}-sm:${normalizedFilters.sourceMediums.join("|")}-co:${normalizedFilters.countries.join("|")}-de:${normalizedFilters.devices.join("|")}`;
  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => fetcher(`/api/analytics/properties/${propertyId}/data?${params.toString()}`),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 0,
    }
  );

  const rows: ChannelRow[] = useMemo(() => {
    const list: ChannelRow[] = (data?.channelBreakdown as ChannelRow[]) || [];
    // Order channels by current sessions desc
    return [...list].sort((a, b) => (b.metrics.sessions?.current ?? 0) - (a.metrics.sessions?.current ?? 0));
  }, [data]);

  function downloadCsv() {
    const headers: string[] = [
      "Channel",
      "Sessions Current",
      "Sessions Prev",
      "Sessions Delta",
      "Sessions Delta %",
      "Users Current",
      "Users Prev",
      "Users Delta",
      "Users Delta %",
    ];
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      const s = r.metrics.sessions || {} as ChannelMetric;
      const u = r.metrics.totalUsers || {} as ChannelMetric;
      lines.push([
        esc(r.channel || "(unassigned)"),
        esc(s.current ?? 0),
        esc(s.prev ?? ""),
        esc(s.delta ?? ""),
        esc(s.deltaPct !== undefined && isFinite(s.deltaPct) ? `${s.deltaPct.toFixed(2)}%` : ""),
        esc(u.current ?? 0),
        esc(u.prev ?? ""),
        esc(u.delta ?? ""),
        esc(u.deltaPct !== undefined && isFinite(u.deltaPct) ? `${u.deltaPct.toFixed(2)}%` : ""),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `channel-breakdown-${propertyId}-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
        <div className="animate-pulse h-5 bg-muted w-40 rounded mb-4"></div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-destructive p-4 ${className}`}>
        Failed to load channel breakdown: {String(error.message || error)}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={`rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground ${className}`}>
        No channel data available for the selected range.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h4 className="font-semibold text-foreground">Session Default Channel Group</h4>
        <div className="flex items-center gap-3">
          {compareMode && compareMode !== "none" && (
            <span className="text-xs text-muted-foreground">Compare: {compareMode.replace("_", " ")}</span>
          )}
          <button
            onClick={downloadCsv}
            className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            title="Download CSV"
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessions</th>
              {compareMode && compareMode !== "none" && (
                <>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Prev</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Δ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Δ%</th>
                </>
              )}
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Users</th>
              {compareMode && compareMode !== "none" && (
                <>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Prev</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Δ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Δ%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const s = r.metrics.sessions;
              const u = r.metrics.totalUsers;
              const deltaColor = (d?: number) => d === undefined ? "text-muted-foreground" : d > 0 ? "text-green-600 dark:text-green-400" : d < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
              return (
                <tr key={r.channel}>
                  <td className="px-4 py-2 text-sm text-foreground">{r.channel || "(unassigned)"}</td>
                  <td className="px-4 py-2 text-sm text-right text-foreground">{fmtNumber(s?.current)}</td>
                  {compareMode && compareMode !== "none" && (
                    <>
                      <td className="px-4 py-2 text-sm text-right text-muted-foreground">{fmtNumber(s?.prev)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(s?.delta)}`}>{fmtNumber(s?.delta)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(s?.delta)}`}>{fmtPct(s?.deltaPct)}</td>
                    </>
                  )}
                  <td className="px-4 py-2 text-sm text-right text-foreground">{fmtNumber(u?.current)}</td>
                  {compareMode && compareMode !== "none" && (
                    <>
                      <td className="px-4 py-2 text-sm text-right text-muted-foreground">{fmtNumber(u?.prev)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(u?.delta)}`}>{fmtNumber(u?.delta)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(u?.delta)}`}>{fmtPct(u?.deltaPct)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
