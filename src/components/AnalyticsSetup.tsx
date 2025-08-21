"use client";

/**
 * AnalyticsSetup
 * UI for selecting favorite properties (brands) and metrics to analyze.
 * Props: `properties`, `totalFound`, `onLoadAll`, `onComplete`.
 */
import { useEffect, useMemo, useState } from "react";
import type { AnalyticsProperty } from "~/types/analytics";

export type MetricKey =
  | "sessions"
  | "users"
  | "pageviews"
  | "bounceRate"
  | "conversions"
  | "revenue";

const AVAILABLE_METRICS: { key: MetricKey; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "users", label: "Users" },
  { key: "pageviews", label: "Pageviews" },
  { key: "bounceRate", label: "Bounce Rate" },
  { key: "conversions", label: "Conversions" },
  { key: "revenue", label: "Revenue" },
];

const LS_FAVORITES_KEY = "ga4-favorites";
const LS_METRICS_KEY = "ga4-selected-metrics";

interface AnalyticsSetupProps {
  properties: AnalyticsProperty[];
  totalFound?: number; // total properties available from API (optional)
  onLoadAll?: () => void; // request parent to load all brands
  onComplete: (opts: {
    favoriteIds: string[];
    selectedMetrics: MetricKey[];
  }) => void;
}

export function AnalyticsSetup({ properties, totalFound, onLoadAll, onComplete }: AnalyticsSetupProps) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LS_METRICS_KEY);
      if (raw) return JSON.parse(raw) as MetricKey[];
    } catch {}
    // default: all
    return AVAILABLE_METRICS.map((m) => m.key);
  });
  const [search, setSearch] = useState("");

  // Load favorites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist favorites and metrics
  useEffect(() => {
    try {
      localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_METRICS_KEY, JSON.stringify(selectedMetrics));
    } catch {}
  }, [selectedMetrics]);

  const filtered = useMemo(() => {
    if (!search) return properties;
    const term = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.displayName.toLowerCase().includes(term) ||
        p.propertyId.toLowerCase().includes(term)
    );
  }, [properties, search]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = selectedMetrics.length === AVAILABLE_METRICS.length;
  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllMetrics = () =>
    setSelectedMetrics(AVAILABLE_METRICS.map((m) => m.key));
  const clearAllMetrics = () => setSelectedMetrics([]);

  const selectAllBrands = () => setFavorites(filtered.map((p) => p.propertyId));
  const clearAllBrands = () => setFavorites([]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Analytics Setup</h1>
      <p className="text-muted-foreground mb-6">
        Choose your brands (favorites) and the metrics you want to analyze. You
        can change these later.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brands */}
        <div className="lg:col-span-2 bg-card rounded-md shadow-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-foreground">Brands</h2>
              <div className="text-xs text-muted-foreground mt-1">
                Showing {properties.length}
                {typeof totalFound === 'number' ? ` of ${totalFound}` : ''} brands
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllBrands}
                className="text-sm px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                Select All Shown
              </button>
              <button
                onClick={clearAllBrands}
                className="text-sm px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                Clear
              </button>
              {onLoadAll && typeof totalFound === 'number' && totalFound > properties.length && (
                <button
                  onClick={onLoadAll}
                  className="text-sm px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Load all available brands"
                >
                  Load All
                </button>
              )}
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands by name or ID"
            className="w-full mb-3 rounded border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring"
          />
          <div className="max-h-[420px] overflow-auto divide-y divide-border">
            {filtered.map((p) => {
              const isFav = favorites.includes(p.propertyId);
              return (
                <div key={p.propertyId} className="flex items-center justify-between py-2 px-1">
                  <div>
                    <div className="font-medium text-foreground">{p.displayName}</div>
                    <div className="text-xs text-muted-foreground">{p.propertyId}</div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(p.propertyId)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm border transition-colors ${
                      isFav
                        ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800"
                        : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${isFav ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`}
                      fill={isFav ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                    {isFav ? "Favorited" : "Favorite"}
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">No brands found.</div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-card rounded-md shadow-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Metrics</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllMetrics}
                className="text-sm px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAllMetrics}
                className="text-sm px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {AVAILABLE_METRICS.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(m.key)}
                  onChange={() => toggleMetric(m.key)}
                  className="rounded border-input text-primary focus:ring-ring"
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
            {allSelected && (
              <div className="text-xs text-muted-foreground">All metrics selected</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Selected brands: <strong>{favorites.length}</strong> | Metrics: <strong>{selectedMetrics.length}</strong>
        </div>
        <button
          onClick={() => onComplete({ favoriteIds: favorites, selectedMetrics })}
          className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          disabled={favorites.length === 0 || selectedMetrics.length === 0}
          title={favorites.length === 0 ? "Select at least one brand" : selectedMetrics.length === 0 ? "Select at least one metric" : undefined}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
