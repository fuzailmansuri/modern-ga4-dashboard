"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import useSWR from "swr";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { ExcelTable } from "./ExcelTable";
import { defaultMetrics, getMetricColors, getMetricLabel, formatValue } from "./_excelHelpers";
import { ChannelBreakdown } from "./ChannelBreakdown";
import {
  GA4_CHANNEL_GROUP_OPTIONS,
  GA4_DEVICE_CATEGORIES,
  buildFiltersSearchParams,
  createFiltersSignature,
  normalizeFilterValues,
} from "~/lib/analytics-filter-utils";
import type { AnalyticsProperty, AnalyticsData, AnalyticsFilterSelection } from "~/types/analytics";

// Local storage keys for persisting UI choices
const LS_KEYS = {
  limit: "ga4:ui:limit",
  compact: "ga4:ui:compact",
  hideFailed: "ga4:ui:hide-failed",
  sortActivity: "ga4:ui:sort-activity",
  favorites: "ga4:ui:favorites",
  favoritesOnly: "ga4:ui:favorites-only",
  organicOnly: "ga4:ui:organic-only",
} as const;

// Note: default metrics are imported from _excelHelpers to keep a single source of truth for table/chart.

const PROPERTY_DATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper to color metrics beautifully
const getMetricColors = (metricKey: string) => {
  switch (metricKey) {
    case 'sessions':
      return { number: 'text-green-700', label: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' };
    case 'activeUsers':
      return { number: 'text-blue-700', label: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'newUsers':
      return { number: 'text-indigo-700', label: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    case 'screenPageViews':
      return { number: 'text-teal-700', label: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' };
    case 'bounceRate':
      return { number: 'text-orange-700', label: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'averageSessionDuration':
      return { number: 'text-purple-700', label: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' };
    default:
      return { number: 'text-gray-900', label: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
};

const getMetricLabel = (key: string) => {
  const labels: Record<string, string> = {
    activeUsers: 'Active Users',
    newUsers: 'New Users',
    sessions: 'Sessions',
    screenPageViews: 'Pageviews',
    bounceRate: 'Bounce Rate',
    averageSessionDuration: 'Avg. Session Duration'
  };
  return labels[key] ?? key;
};


// API response type for property data endpoint
interface PropertyDataResponse {
  propertyId: string;
  data: AnalyticsData;
  dateRange: { startDate: string; endDate: string };
  timestamp: string;
  channelBreakdown?: unknown;
  compare?: string;
  groupBy?: string;
  metrics: string[];
  organicOnly: boolean;
  filters?: AnalyticsFilterSelection;
}

// Single property data hook with 24-hour cache (matches API policy)
function usePropertyData(
  property: AnalyticsProperty,
  startDate: string,
  endDate: string,
  refreshKey: number,
  organicOnly: boolean,
  filters: AnalyticsFilterSelection,
) {
  const metricsQuery = defaultMetrics.join(',');
  const signature = createFiltersSignature(filters, organicOnly);
  const { data, error, isLoading } = useSWR<PropertyDataResponse>(
    `${property.propertyId}-${startDate}-${endDate}-${refreshKey}-${signature}`,
    () => {
      const params = buildFiltersSearchParams(filters, organicOnly);
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("metrics", metricsQuery);
      return fetch(`/api/analytics/properties/${property.propertyId}/data?${params.toString()}`).then(r => r.json());
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      errorRetryCount: 1,
      errorRetryInterval: 5000,
      dedupingInterval: PROPERTY_DATA_CACHE_TTL_MS,
    }
  );

  return { data, error, isLoading };
}

// The ExcelTable and related helpers were moved to `src/components/ExcelTable.tsx` and `src/components/_excelHelpers.ts` to keep this file focused.

const createEmptyFilters = (): AnalyticsFilterSelection => ({
  channelGroups: [],
  sourceMediums: [],
  countries: [],
  devices: [],
});

const removeValueCaseInsensitive = (values: string[], target: string) => {
  const lower = target.toLowerCase();
  return values.filter((value) => value.toLowerCase() !== lower);
};

type ChannelCompareMode = "previous_period" | "previous_year" | "none";

function FilterToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent"}`}
    >
      {label}
    </button>
  );
}

function TokenInput({
  label,
  values,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  description?: string;
}) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    if (!draft.trim()) return;
    const tokens = draft.split(/[,\n]+/).map((token) => token.trim()).filter(Boolean);
    if (!tokens.length) {
      setDraft("");
      return;
    }
    const next = normalizeFilterValues([...values, ...tokens]);
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
    if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {values.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-background px-2 py-2">
        {values.map((value) => (
          <span
            key={value.toLowerCase()}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-foreground"
          >
            {value}
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange(removeValueCaseInsensitive(values, value))}
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] border-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

// Individual Property Analytics for Chart View
function PropertyAnalytics({
  property,
  startDate,
  endDate,
  refreshKey,
  hideFailedDashboards = false,
  isFavorite,
  onToggleFavorite,
  organicOnly,
  filters,
  channelCompareMode,
}: {
  property: AnalyticsProperty;
  startDate: string;
  endDate: string;
  refreshKey: number;
  hideFailedDashboards?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  organicOnly: boolean;
  filters: AnalyticsFilterSelection;
  channelCompareMode: ChannelCompareMode;
}) {
  const { data, error, isLoading } = usePropertyData(
    property,
    startDate,
    endDate,
    refreshKey,
    organicOnly,
    filters,
  );
  const dataObj = data;

  if (isLoading) {
    return (
      <div className="card-elevated rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    if (hideFailedDashboards) return null;
    return (
      <div className="card-elevated rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-foreground">
            {property.displayName}
          </h3>
          <button
            type="button"
            onClick={() => onToggleFavorite()}
            className={`inline-flex items-center text-sm ${isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={isFavorite ? "Unpin favorite" : "Pin as favorite"}
            title={isFavorite ? "Unpin favorite" : "Pin as favorite"}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        </div>
        <div className="text-destructive text-sm">
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  if (!dataObj?.data?.rows?.length) {
    if (hideFailedDashboards) return null;
    return (
      <div className="card-elevated rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-foreground">
            {property.displayName}
          </h3>
          <button
            type="button"
            onClick={() => onToggleFavorite()}
            className={`inline-flex items-center text-sm ${isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={isFavorite ? "Unpin favorite" : "Pin as favorite"}
            title={isFavorite ? "Unpin favorite" : "Pin as favorite"}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        </div>
        <div className="text-yellow-600 dark:text-yellow-400 text-sm">
          No data available for selected date range
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-lg">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-medium text-foreground">
          {property.displayName} <span className="text-xs text-muted-foreground">({property.propertyId})</span>
        </h3>
        <button
          type="button"
          onClick={() => onToggleFavorite()}
          className={`inline-flex items-center text-sm ${isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}
          aria-label={isFavorite ? "Unpin favorite" : "Pin as favorite"}
          title={isFavorite ? "Unpin favorite" : "Pin as favorite"}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <AnalyticsCharts
          data={dataObj.data}
          propertyName={`${property.displayName} (${property.propertyId})`}
          onRefresh={() => {}}
        />
        <ChannelBreakdown
          propertyId={property.propertyId}
          startDate={startDate}
          endDate={endDate}
          compareMode={channelCompareMode === "none" ? undefined : channelCompareMode}
          channelGroups={filters.channelGroups}
          sourceMediums={filters.sourceMediums}
          countries={filters.countries}
          devices={filters.devices}
          className="mt-6"
        />
      </div>
    </div>
  );
}

// Main Dashboard Component
export function PropertyAnalyticsDashboard({
  properties,
}: {
  properties: AnalyticsProperty[];
}) {
  const { data: session, status } = useSession();
  
  const [dateRange, setDateRange] = useState({
    startDate: "7daysAgo",
    endDate: "today",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [hideFailedDashboards, setHideFailedDashboards] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(0);
  const [limit, setLimit] = useState<number>(50);
  const [sortByActivity, setSortByActivity] = useState<boolean>(true);
  const [activityScores, setActivityScores] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [organicOnly, setOrganicOnly] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [filters, setFilters] = useState<AnalyticsFilterSelection>(() => createEmptyFilters());
  const [channelCompareMode, setChannelCompareMode] = useState<ChannelCompareMode>("none");

  const filtersSignature = useMemo(
    () => createFiltersSignature(filters, organicOnly),
    [filters, organicOnly],
  );

  const updateFilterValues = (key: keyof AnalyticsFilterSelection, values: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: normalizeFilterValues(values),
    }));
  };

  const toggleChannelGroup = (group: string) => {
    setFilters((prev) => {
      const has = prev.channelGroups.some((value) => value.toLowerCase() === group.toLowerCase());
      const next = has
        ? removeValueCaseInsensitive(prev.channelGroups, group)
        : [...prev.channelGroups, group];
      return {
        ...prev,
        channelGroups: normalizeFilterValues(next),
      };
    });
  };

  const toggleDevice = (device: string) => {
    setFilters((prev) => {
      const has = prev.devices.some((value) => value.toLowerCase() === device.toLowerCase());
      const next = has
        ? removeValueCaseInsensitive(prev.devices, device)
        : [...prev.devices, device];
      return {
        ...prev,
        devices: normalizeFilterValues(next),
      };
    });
  };

  const handleSourceMediumChange = (next: string[]) => updateFilterValues("sourceMediums", next);
  const handleCountryChange = (next: string[]) => updateFilterValues("countries", next);

  const clearFilters = () => {
    setFilters(createEmptyFilters());
    setChannelCompareMode("none");
  };

  // Filter properties based on search
  const filteredProperties = properties.filter(
    (property) =>
      property.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.propertyId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Optional favorites-only filter
  const favoritesFiltered = favoritesOnly
    ? filteredProperties.filter((p) => favorites.has(p.propertyId))
    : filteredProperties;

  // Apply limit after filtering
  const limitedProperties = favoritesFiltered.slice(0, limit);

  // Reset selected index when filtering or limit changes
  useEffect(() => {
    if (selectedPropertyIndex >= limitedProperties.length) {
      setSelectedPropertyIndex(0);
    }
  }, [limitedProperties.length, selectedPropertyIndex]);

  // Activity probe: fetch a small sample to check which properties have recent data
  // Cache activity scores for 24 hours to align with API cache policy
  useEffect(() => {
    if (!properties.length) return;

    const cacheKey = `activity-${dateRange.startDate}-${dateRange.endDate}-${filtersSignature}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheExpiry = localStorage.getItem(`${cacheKey}-expiry`);

    // Check if we have valid cached data (within 24 hours)
    if (cached && cacheExpiry) {
      const expiry = Number(cacheExpiry);
      if (!Number.isNaN(expiry) && Date.now() < expiry) {
        try {
          const cachedScores = JSON.parse(cached) as Record<string, number>;
          setActivityScores(cachedScores);
          return;
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }

    const limitedProperties = properties.slice(0, Math.min(20, properties.length));
    const probeActivity = async () => {
      const results = await Promise.allSettled(
        limitedProperties.map(async (p) => {
          try {
            const metricsQuery = 'totalUsers,sessions';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for probe

            const params = buildFiltersSearchParams(filters, organicOnly);
            params.set('startDate', dateRange.startDate);
            params.set('endDate', dateRange.endDate);
            params.set('metrics', metricsQuery);

            const res = await fetch(
              `/api/analytics/properties/${p.propertyId}/data?${params.toString()}`,
              { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);
            
            if (!res.ok) return null;
            const json = await res.json() as any;
            const rows = json?.data?.rows ?? [];
            const totalUsers = json?.data?.totals?.[0]?.metricValues?.[0]?.value;
            const sessions = json?.data?.totals?.[0]?.metricValues?.[1]?.value;
            const score = (Number(totalUsers) || 0) + (Number(sessions) || 0) + rows.length;
            return { propertyId: p.propertyId, score };
          } catch (error) {
            return null;
          }
        })
      );

      const scores: Record<string, number> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          scores[result.value.propertyId] = result.value.score;
        }
      }
      
      // Cache the results for 24 hours
      localStorage.setItem(cacheKey, JSON.stringify(scores));
      localStorage.setItem(`${cacheKey}-expiry`, String(Date.now() + PROPERTY_DATA_CACHE_TTL_MS));
      
      setActivityScores(scores);
    };

    probeActivity();
  }, [properties, dateRange.startDate, dateRange.endDate, organicOnly, filtersSignature, filters]);

  // Manual refresh function to invalidate the 24-hour cache window
  const forceRefresh = () => {
    const cacheKey = `activity-${dateRange.startDate}-${dateRange.endDate}-${filtersSignature}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}-expiry`);
    setRefreshKey(prev => prev + 1);
  };

  // Robust export all visible properties data to CSV
  const exportAllData = async () => {
    if (isExporting || sortedProperties.length === 0) return;
    
    setIsExporting(true);
    try {
      const headers = [
        'Property ID',
        'Display Name',
        'Active Users',
        'New Users', 
        'Sessions',
        'Pageviews',
        'Bounce Rate (%)',
        'Avg Session Duration (s)',
        'Activity Status',
        'Export Status'
      ];

      const rows: string[] = [headers.join(',')];
      let successCount = 0;
      let failCount = 0;
      
      const escapeCSV = (val: unknown) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      };

      // Process properties in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < sortedProperties.length; i += batchSize) {
        const batch = sortedProperties.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (property) => {
            try {
              const metricsQuery = defaultMetrics.join(',');
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
              
              const params = buildFiltersSearchParams(filters, organicOnly);
              params.set('startDate', dateRange.startDate);
              params.set('endDate', dateRange.endDate);
              params.set('metrics', metricsQuery);

              const res = await fetch(
                `/api/analytics/properties/${property.propertyId}/data?${params.toString()}`,
                { signal: controller.signal }
              );
              
              clearTimeout(timeoutId);
              
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              }
              
              const json = await res.json() as any;
              // Prefer totals; if missing or misaligned, aggregate from rows as a fallback
              const metricHeaders: string[] = (json?.data?.metricHeaders ?? []).map((h: any) => h?.name).filter(Boolean);
              const totals: Array<{ value?: string }> = json?.data?.totals?.[0]?.metricValues || [];
              const rowsData: Array<{ metricValues?: Array<{ value?: string }> }> = json?.data?.rows || [];

              const getMetricValue = (metricName: string): string => {
                const idx = metricHeaders.indexOf(metricName);
                // If we have totals and a valid index, use it when non-empty
                if (idx >= 0) {
                  const v = Number(totals[idx]?.value);
                  if (Number.isFinite(v) && (v !== 0 || rowsData.length === 0)) {
                    return String(v);
                  }
                }
                // Fallback: aggregate from rows
                let agg = 0;
                for (const r of rowsData) {
                  const v = Number(r?.metricValues?.[idx]?.value);
                  if (Number.isFinite(v)) {
                    if (metricName === 'bounceRate') {
                      // Use max as a simple, non-weighted fallback for rate metrics
                      agg = Math.max(agg, v);
                    } else {
                      agg += v;
                    }
                  }
                }
                return String(agg || 0);
              };

              const row = [
                escapeCSV(property.propertyId),
                escapeCSV(property.displayName),
                escapeCSV(getMetricValue('activeUsers')),
                escapeCSV(getMetricValue('newUsers')),
                escapeCSV(getMetricValue('sessions')),
                escapeCSV(getMetricValue('screenPageViews')),
                escapeCSV(getMetricValue('bounceRate')),
                escapeCSV(getMetricValue('averageSessionDuration')),
                escapeCSV((activityScores[property.propertyId] ?? 0) > 0 ? 'Active' : 'Inactive'),
                escapeCSV('Success')
              ];
              
              rows.push(row.join(','));
              successCount++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              
              const row = [
                escapeCSV(property.propertyId),
                escapeCSV(property.displayName),
                escapeCSV('Error'),
                escapeCSV('Error'),
                escapeCSV('Error'),
                escapeCSV('Error'),
                escapeCSV('Error'),
                escapeCSV('Error'),
                escapeCSV('Unknown'),
                escapeCSV(`Failed: ${errorMsg}`)
              ];
              
              rows.push(row.join(','));
              failCount++;
            }
          })
        );
        
        if (i + batchSize < sortedProperties.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (rows.length <= 1) {
        alert('No data was successfully exported. Please check your connection and try again.');
        return;
      }

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `ga4-dashboard-export-${timestamp}-${successCount}success-${failCount}failed.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const message = failCount > 0 
        ? `Export completed with ${successCount} successful and ${failCount} failed properties.`
        : `Export completed successfully for ${successCount} properties.`;
      alert(message);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Apply sorting: most active first; inactive (score 0 or undefined) drop lower
  const sortedProperties = [...limitedProperties].sort((a, b) => {
    // Favorites first
    const fa = favorites.has(a.propertyId) ? 1 : 0;
    const fb = favorites.has(b.propertyId) ? 1 : 0;
    if (fb !== fa) return fb - fa;
    if (sortByActivity) {
      const sa = activityScores[a.propertyId] ?? 0;
      const sb = activityScores[b.propertyId] ?? 0;
      if (sb !== sa) return sb - sa; // desc by score
    }
    // Tiebreaker: alphabetical by displayName
    return a.displayName.localeCompare(b.displayName);
  });

  // Load persisted UI preferences on mount
  useEffect(() => {
    try {
      const ls = globalThis?.localStorage;
      if (!ls) return;
      const rawLimit = ls.getItem(LS_KEYS.limit);
      const rawCompact = ls.getItem(LS_KEYS.compact);
      const rawHide = ls.getItem(LS_KEYS.hideFailed);
      const rawSort = ls.getItem(LS_KEYS.sortActivity);
      const rawFavs = ls.getItem(LS_KEYS.favorites);
      const rawFavOnly = ls.getItem(LS_KEYS.favoritesOnly);
      const rawOrganic = ls.getItem(LS_KEYS.organicOnly);
      

      if (rawLimit) setLimit(Number(rawLimit));
      if (rawCompact) setCompactMode(rawCompact === "1");
      if (rawHide) setHideFailedDashboards(rawHide === "1");
      if (rawSort) setSortByActivity(rawSort === "1");
      if (rawFavOnly) setFavoritesOnly(rawFavOnly === "1");
      if (rawOrganic) setOrganicOnly(rawOrganic === "1");
      if (rawFavs) {
        const arr = JSON.parse(rawFavs) as string[];
        setFavorites(new Set(arr));
      }
      
    } catch {
      // ignore
    }
  }, []);

  // Persist preferences when they change
  useEffect(() => {
    try {
      const ls = globalThis?.localStorage;
      if (!ls) return;
      ls.setItem(LS_KEYS.limit, String(limit));
      ls.setItem(LS_KEYS.compact, compactMode ? "1" : "0");
      ls.setItem(LS_KEYS.hideFailed, hideFailedDashboards ? "1" : "0");
      ls.setItem(LS_KEYS.sortActivity, sortByActivity ? "1" : "0");
      ls.setItem(LS_KEYS.favoritesOnly, favoritesOnly ? "1" : "0");
      ls.setItem(LS_KEYS.favorites, JSON.stringify(Array.from(favorites)));
      ls.setItem(LS_KEYS.organicOnly, organicOnly ? "1" : "0");
    } catch {
      // ignore
    }
  }, [limit, compactMode, hideFailedDashboards, sortByActivity, favoritesOnly, favorites, organicOnly]);

  // Favorite handlers
  const toggleFavorite = (propertyId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  // Auth handling is done at the page level (server-side)

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!properties?.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No properties available to display analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-border pb-4">
            <h1 className="text-3xl leading-tight font-bold text-foreground">
              Analytics Data & Metrics
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 px-4 sm:px-0">
          <div className="relative max-w-lg">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring"
              placeholder="Search brands or properties..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <svg className="h-4 w-4 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 px-4 sm:px-0">
          <div className="card-elevated rounded-lg p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="mb-4 text-lg font-medium text-foreground">Date Range & Controls</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "1daysAgo", label: "Yesterday" },
                      { key: "7daysAgo", label: "Last 7 Days" },
                      { key: "14daysAgo", label: "Last 14 Days" },
                      { key: "30daysAgo", label: "Last 30 Days" },
                      { key: "90daysAgo", label: "Last 90 Days" },
                      { key: "180daysAgo", label: "Last 6 Months" },
                      { key: "365daysAgo", label: "Last Year" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setDateRange({ startDate: key, endDate: "today" })}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          dateRange.startDate === key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none transition-colors dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh All Data
                  </button>

                  <button
                    onClick={() => setCompactMode(prev => !prev)}
                    className={`inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-colors ${
                      compactMode
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    } focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={compactMode ? "M4 8V4m0 0h4m-4 0l5.172 5.172a2.828 2.828 0 010 4l-5.172 5.172M20 8V4m0 0h-4m4 0l-5.172 5.172a2.828 2.828 0 000 4L20 20" : "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"} />
                    </svg>
                    {compactMode ? "Show Charts" : "Table View"}
                  </button>

                  <div className="flex items-center gap-2">
                    <label htmlFor="property-limit" className="text-sm text-foreground">Show</label>
                    <select
                      id="property-limit"
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="rounded-md border-input bg-background text-sm text-foreground focus:border-ring focus:ring-ring"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-foreground">properties</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <input
                    id="hide-failed-dashboards"
                    type="checkbox"
                    checked={hideFailedDashboards}
                    onChange={(e) => setHideFailedDashboards(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  <label htmlFor="hide-failed-dashboards" className="ml-2 text-sm text-foreground">
                    Hide failed or empty dashboards
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      id="organic-only"
                      type="checkbox"
                      checked={organicOnly}
                      onChange={(e) => setOrganicOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <label htmlFor="organic-only" className="text-sm text-foreground">
                      Organic only (Session Default Channel Group)
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div>
                        Showing {Math.min(sortedProperties.length, limit)} of {favoritesFiltered.length} filtered properties
                      </div>
                    {favorites.size > 0 && (
                      <div className="flex items-center gap-2">
                        <input
                          id="favorites-only"
                          type="checkbox"
                          checked={favoritesOnly}
                          onChange={(e) => setFavoritesOnly(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring"
                        />
                        <label htmlFor="favorites-only" className="text-muted-foreground">Show favorites only</label>
                      </div>
                    )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={forceRefresh}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        title="Refresh data (clears 24-hour cache)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                      
                      <button
                        onClick={exportAllData}
                        disabled={sortedProperties.length === 0 || isExporting}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isExporting ? "Exporting data..." : "Export all visible properties data to CSV"}
                      >
                        {isExporting ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        {isExporting ? "Exporting..." : "Export All Data"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4 space-y-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Channel groups</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GA4_CHANNEL_GROUP_OPTIONS.map((group) => (
                      <FilterToggleChip
                        key={group}
                        label={group}
                        selected={filters.channelGroups.some((value) => value.toLowerCase() === group.toLowerCase())}
                        onToggle={() => toggleChannelGroup(group)}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Values map to the GA4 <code className="font-mono">sessionDefaultChannelGroup</code> dimension.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-foreground">Device categories</span>
                  <div className="flex flex-wrap gap-2">
                    {GA4_DEVICE_CATEGORIES.map((device) => (
                      <FilterToggleChip
                        key={device}
                        label={device}
                        selected={filters.devices.some((value) => value.toLowerCase() === device.toLowerCase())}
                        onToggle={() => toggleDevice(device)}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Matches GA4 <code className="font-mono">deviceCategory</code> values (desktop, mobile, tablet).
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TokenInput
                    label="Source / medium pairs"
                    values={filters.sourceMediums}
                    onChange={handleSourceMediumChange}
                    placeholder="e.g. google / organic"
                    description="Applies to the GA4 sessionSourceMedium dimension. Enter exact strings separated by commas or press Enter."
                  />
                  <TokenInput
                    label="Countries"
                    values={filters.countries}
                    onChange={handleCountryChange}
                    placeholder="e.g. United States"
                    description="Filters against the GA4 country dimension. Use the exact country names reported by GA."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="channel-compare-mode" className="text-sm text-foreground">
                      Channel compare range
                    </label>
                    <select
                      id="channel-compare-mode"
                      value={channelCompareMode}
                      onChange={(event) => setChannelCompareMode(event.target.value as ChannelCompareMode)}
                      className="rounded-md border-input bg-background text-sm text-foreground focus:border-ring focus:ring-ring"
                    >
                      <option value="none">No compare</option>
                      <option value="previous_period">Previous period</option>
                      <option value="previous_year">Previous year</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Filters apply to all analytics charts and the channel breakdown.</span>
                    {(filters.channelGroups.length > 0 || filters.devices.length > 0 || filters.sourceMediums.length > 0 || filters.countries.length > 0 || channelCompareMode !== "none") && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={clearFilters}
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-0">
          {compactMode ? (
            <ExcelTable
              properties={sortedProperties}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              refreshKey={refreshKey}
              selectedPropertyIndex={selectedPropertyIndex}
              onPropertySelect={setSelectedPropertyIndex}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              organicOnly={organicOnly}
              filters={filters}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sortedProperties.map((property) => (
                <PropertyAnalytics
                  key={`${property.propertyId}-${refreshKey}`}
                  property={property}
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  refreshKey={refreshKey}
                  hideFailedDashboards={hideFailedDashboards}
                  isFavorite={favorites.has(property.propertyId)}
                  onToggleFavorite={() => toggleFavorite(property.propertyId)}
                  organicOnly={organicOnly}
                  filters={filters}
                  channelCompareMode={channelCompareMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
