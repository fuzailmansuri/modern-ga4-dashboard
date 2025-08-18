import React from 'react';
import type { AnalyticsProperty } from "~/types/analytics";

// Minimal stub to avoid compile errors; the dashboard now uses an internal Excel-like table.
export function ExcelTable({
  properties,
  startDate,
  endDate,
  refreshKey,
  selectedPropertyIndex,
  onPropertySelect,
}: {
  properties: AnalyticsProperty[];
  startDate: string;
  endDate: string;
  refreshKey: number;
  selectedPropertyIndex: number;
  onPropertySelect: (index: number) => void;
}) {
  return null;
}
