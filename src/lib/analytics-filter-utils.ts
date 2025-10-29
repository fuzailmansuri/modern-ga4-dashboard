import type { AnalyticsFilterSelection } from "~/types/analytics";

export const GA4_CHANNEL_GROUP_OPTIONS = [
  "Organic Search",
  "Paid Search",
  "Direct",
  "Referral",
  "Display",
  "Paid Social",
  "Organic Social",
  "Email",
  "Video",
  "Audio",
  "Affiliates",
  "SMS",
  "Mobile Push Notifications",
  "Other Advertising",
  "(Other)",
] as const;

export const GA4_DEVICE_CATEGORIES = [
  "desktop",
  "mobile",
  "tablet",
] as const;

export function normalizeFilterValues(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(trimmed);
  }
  return deduped.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function buildFiltersSearchParams(
  filters: AnalyticsFilterSelection,
  organicOnly: boolean,
): URLSearchParams {
  const params = new URLSearchParams();
  if (organicOnly) {
    params.set("organicOnly", "1");
  }

  const channelGroups = normalizeFilterValues(filters.channelGroups);
  if (channelGroups.length) {
    params.set("channelGroups", channelGroups.join(","));
  }

  const sourceMediums = normalizeFilterValues(filters.sourceMediums);
  if (sourceMediums.length) {
    params.set("sourceMediums", sourceMediums.join(","));
  }

  const countries = normalizeFilterValues(filters.countries);
  if (countries.length) {
    params.set("countries", countries.join(","));
  }

  const devices = normalizeFilterValues(filters.devices);
  if (devices.length) {
    params.set("devices", devices.join(","));
  }

  return params;
}

export function createFiltersSignature(
  filters: AnalyticsFilterSelection,
  organicOnly: boolean,
): string {
  const channelGroups = normalizeFilterValues(filters.channelGroups).join("|");
  const sourceMediums = normalizeFilterValues(filters.sourceMediums).join("|");
  const countries = normalizeFilterValues(filters.countries).join("|");
  const devices = normalizeFilterValues(filters.devices).join("|");

  return [
    `org:${organicOnly ? "1" : "0"}`,
    `cg:${channelGroups}`,
    `sm:${sourceMediums}`,
    `co:${countries}`,
    `de:${devices}`,
  ].join("|");
}
