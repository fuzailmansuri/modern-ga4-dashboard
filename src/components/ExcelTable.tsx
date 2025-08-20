"use client";

import React from 'react';
import type { AnalyticsProperty } from "~/types/analytics";
import useSWR from "swr";
import { defaultMetrics, getMetricColors, getMetricLabel, formatValue } from "./_excelHelpers";

// Lightweight fetcher used internally (keeps parity with dashboard hook behavior)
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

function usePropertyData(property: AnalyticsProperty, startDate: string, endDate: string, refreshKey: number, organicOnly: boolean) {
  const metricsQuery = defaultMetrics.join(',');
  const { data, error, isLoading } = useSWR(
    `${property.propertyId}-${startDate}-${endDate}-${refreshKey}-org:${organicOnly ? '1' : '0'}`,
    () => fetcher(`/api/analytics/properties/${property.propertyId}/data?startDate=${startDate}&endDate=${endDate}&metrics=${metricsQuery}${organicOnly ? '&organicOnly=1' : ''}`),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }
  );

  return { data: data as any, error: error as any, isLoading: Boolean(isLoading) };
}

function extractMetrics(resp?: any): Record<string, number> {
  const metrics: Record<string, number> = {};
  defaultMetrics.forEach(m => (metrics[m] = 0));

  if (!resp?.data?.rows || !Array.isArray(resp.data.rows)) return metrics;

  for (const row of resp.data.rows) {
    const values = row.metricValues ?? [];
    defaultMetrics.forEach((metric, idx) => {
      if (values[idx]?.value !== undefined) {
        const val = Number(values[idx].value) || 0;
        if (metric === 'bounceRate') metrics[metric] = Math.max(metrics[metric] ?? 0, val);
        else metrics[metric] = (metrics[metric] ?? 0) + val;
      }
    });
  }

  return metrics;
}

function PropertyRow({ property, startDate, endDate, refreshKey, isSelected, onClick, isFavorite, onToggleFavorite, organicOnly }: {
  property: AnalyticsProperty;
  startDate: string;
  endDate: string;
  refreshKey: number;
  isSelected: boolean;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  organicOnly: boolean;
}) {
  const { data, error, isLoading } = usePropertyData(property, startDate, endDate, refreshKey, organicOnly);
  const metrics = extractMetrics(data);

  if (isLoading) return (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
      {defaultMetrics.map(m => <td key={m} className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>)}
    </tr>
  );

  if (error) return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{property.displayName} - Error loading</td>
      {defaultMetrics.map(metric => <td key={metric} className="px-6 py-4 whitespace-nowrap text-sm text-red-400">--</td>)}
    </tr>
  );

  return (
    <tr className={`cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`} onClick={onClick}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={property.displayName}>{property.displayName}</div>
        <div className="text-xs text-gray-500 truncate max-w-xs">{property.propertyId}</div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} aria-label={isFavorite ? "Unpin favorite" : "Pin as favorite"} className={`mt-2 inline-flex items-center text-sm ${isFavorite ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"}`} title={isFavorite ? "Unpin favorite" : "Pin as favorite"}>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <span className="ml-1">{isFavorite ? "Pinned" : "Pin"}</span>
        </button>
      </td>
      {defaultMetrics.map(metric => {
        const colors = getMetricColors(metric);
        return (<td key={metric} className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${colors.number}`}>{formatValue(metric, metrics[metric] ?? 0)}</td>);
      })}
    </tr>
  );
}

export function ExcelTable({ properties, startDate, endDate, refreshKey, selectedPropertyIndex, onPropertySelect, favorites, onToggleFavorite, organicOnly }: {
  properties: AnalyticsProperty[];
  startDate: string;
  endDate: string;
  refreshKey: number;
  selectedPropertyIndex: number;
  onPropertySelect: (index: number) => void;
  favorites: Set<string>;
  onToggleFavorite: (propertyId: string) => void;
  organicOnly: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 min-w-[200px]">Brand / Property</th>
              {defaultMetrics.map(metric => {
                const colors = getMetricColors(metric);
                return (<th key={metric} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky top-0 bg-gray-50 z-20 ${colors.label} ${colors.border} border-l min-w-[120px]`}>{getMetricLabel(metric)}</th>);
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.map((property, index) => (
              <PropertyRow key={property.propertyId} property={property} startDate={startDate} endDate={endDate} refreshKey={refreshKey} isSelected={index === selectedPropertyIndex} onClick={() => onPropertySelect(index)} isFavorite={favorites.has(property.propertyId)} onToggleFavorite={() => onToggleFavorite(property.propertyId)} organicOnly={organicOnly} />
            ))}
          </tbody>
        </table>
      </div>
      {properties.length === 0 && (<div className="text-center py-12"><p className="text-gray-500">No properties found</p></div>)}
    </div>
  );
}

