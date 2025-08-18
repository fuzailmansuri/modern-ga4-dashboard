"use client";

import React, { useMemo } from "react";
import useSWR from "swr";

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
  const compareParam = compareMode && compareMode !== "none" ? `&compare=${compareMode}` : "";
  const qs = [
    `startDate=${encodeURIComponent(startDate)}`,
    `endDate=${encodeURIComponent(endDate)}`,
    `groupBy=channel`,
    `metrics=sessions,totalUsers`,
    compareParam.replace(/^&/, ""),
    channelGroups.length ? `channelGroups=${encodeURIComponent(channelGroups.join(","))}` : "",
    sourceMediums.length ? `sourceMediums=${encodeURIComponent(sourceMediums.join(","))}` : "",
    countries.length ? `countries=${encodeURIComponent(countries.join(","))}` : "",
    devices.length ? `devices=${encodeURIComponent(devices.join(","))}` : "",
  ].filter(Boolean).join("&");
  const cacheKey = `channel-${propertyId}-${startDate}-${endDate}-${compareMode ?? "none"}-cg:${channelGroups.join("|")}-sm:${sourceMediums.join("|")}-co:${countries.join("|")}-de:${devices.join("|")}`;
  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => fetcher(`/api/analytics/properties/${propertyId}/data?${qs}`),
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
      <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${className}`}>
        <div className="animate-pulse h-5 bg-gray-200 w-40 rounded mb-4"></div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 ${className}`}>
        Failed to load channel breakdown: {String(error.message || error)}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 ${className}`}>
        No channel data available for the selected range.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Session Default Channel Group</h4>
        <div className="flex items-center gap-3">
          {compareMode && compareMode !== "none" && (
            <span className="text-xs text-gray-500">Compare: {compareMode.replace("_", " ")}</span>
          )}
          <button
            onClick={downloadCsv}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Download CSV"
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Channel</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sessions</th>
              {compareMode && compareMode !== "none" && (
                <>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prev</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Δ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Δ%</th>
                </>
              )}
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Users</th>
              {compareMode && compareMode !== "none" && (
                <>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prev</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Δ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Δ%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((r) => {
              const s = r.metrics.sessions;
              const u = r.metrics.totalUsers;
              const deltaColor = (d?: number) => d === undefined ? "text-gray-500" : d > 0 ? "text-green-600" : d < 0 ? "text-red-600" : "text-gray-600";
              return (
                <tr key={r.channel}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{r.channel || "(unassigned)"}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-100">{fmtNumber(s?.current)}</td>
                  {compareMode && compareMode !== "none" && (
                    <>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{fmtNumber(s?.prev)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(s?.delta)}`}>{fmtNumber(s?.delta)}</td>
                      <td className={`px-4 py-2 text-sm text-right ${deltaColor(s?.delta)}`}>{fmtPct(s?.deltaPct)}</td>
                    </>
                  )}
                  <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-100">{fmtNumber(u?.current)}</td>
                  {compareMode && compareMode !== "none" && (
                    <>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{fmtNumber(u?.prev)}</td>
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
