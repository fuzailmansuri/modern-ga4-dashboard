import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import type { ApiError } from "~/types/analytics";

/**
 * GET /api/analytics/properties/[id]/data
 * Fetch analytics data and metrics for a specific Google Analytics property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to access Analytics data",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    if (!session.accessToken) {
      const error: ApiError = {
        error: "No Access Token",
        message: "No valid access token found. Please re-authenticate.",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    if (session.error === "RefreshAccessTokenError") {
      const error: ApiError = {
        error: "Token Refresh Failed",
        message: "Unable to refresh access token. Please sign in again.",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    const { id: propertyId } = await params;

    if (!propertyId) {
      const error: ApiError = {
        error: "Bad Request",
        message: "Property ID is required",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Get query parameters for date range and analysis options
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? "30daysAgo";
    const endDate = searchParams.get("endDate") ?? "today";
    const groupBy = searchParams.get("groupBy"); // e.g., "channel"
    const metricsParam = searchParams.get("metrics"); // comma-separated
    const compare = searchParams.get("compare"); // "previous_period" | "previous_year"
    const organicOnly = searchParams.get("organicOnly") === "1";

    // No additional CSV filters; only organicOnly supported for now

    // Metrics handling: default to sessions & users when grouping by channel
    const defaultMetrics = groupBy === "channel"
      ? ["sessions", "totalUsers"]
      : ["activeUsers", "newUsers", "sessions", "screenPageViews", "bounceRate", "averageSessionDuration"];
    const parsedMetrics = metricsParam?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
    const metrics = parsedMetrics.length > 0 ? parsedMetrics : defaultMetrics;

    // Simple in-memory cache (module-scoped)
    type CacheEntry = { data: any; expiresAt: number };
    const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    // @ts-ignore module scoped singleton
    globalThis.__ga_property_cache__ = globalThis.__ga_property_cache__ || new Map<string, CacheEntry>();
    // @ts-ignore
    const CACHE: Map<string, CacheEntry> = globalThis.__ga_property_cache__;

    const baseKey = `${propertyId}|${startDate}|${endDate}|${(metrics || []).join(";")}|${groupBy || ''}|${compare || ''}|organic:${organicOnly ? '1' : '0'}`;
    const now = Date.now();
    const cached = CACHE.get(baseKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    // Only organic-only filter supported
    const dimensionFilter = organicOnly
      ? {
          filter: {
            fieldName: "sessionDefaultChannelGroup",
            stringFilter: { value: "Organic Search", matchType: "EXACT" },
          },
        } as any
      : undefined;

    const analyticsData = await googleAnalyticsService.getAnalyticsData(
      session.accessToken,
      propertyId,
      startDate,
      endDate,
      metrics,
      dimensionFilter,
    );

    // Optional: channel breakdown with deltas
    let channelBreakdown: any[] | undefined;
    if (groupBy === "channel") {
      const dim = "sessionDefaultChannelGroup";

      // No extra filters in channel breakdown for now
      const dimensionFilter = undefined;

      // Helper to resolve relative date ranges (supports GA keywords or ISO). For simplicity, when given GA keywords we reuse them.
      const resolvePrevRange = (s: string, e: string, mode: string): { startDate: string; endDate: string } => {
        // If GA relative keywords are used, calculate previous period length by making a best-effort simplistic approach:
        // We'll not convert keywords; instead, for previous_period we rely on GA to accept explicit dates. If keywords are used, we fallback to same keywords (no-op compare).
        // For robust behavior, expect explicit YYYY-MM-DD from the UI when compare is needed.
        if (/^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
          const sd = new Date(s);
          const ed = new Date(e);
          const msInDay = 24 * 60 * 60 * 1000;
          const lenDays = Math.max(1, Math.round((ed.getTime() - sd.getTime()) / msInDay) + 1);
          if (mode === "previous_period") {
            const prevEnd = new Date(sd.getTime() - msInDay);
            const prevStart = new Date(prevEnd.getTime() - (lenDays - 1) * msInDay);
            const toISO = (d: Date) => d.toISOString().slice(0, 10);
            return { startDate: toISO(prevStart), endDate: toISO(prevEnd) };
          }
          if (mode === "previous_year") {
            const toISO = (d: Date) => d.toISOString().slice(0, 10);
            const prevStart = new Date(sd);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            const prevEnd = new Date(ed);
            prevEnd.setFullYear(prevEnd.getFullYear() - 1);
            return { startDate: toISO(prevStart), endDate: toISO(prevEnd) };
          }
        }
        // Fallback: reuse same range when unable to compute
        return { startDate: s, endDate: e };
      };

      let currentPromise = googleAnalyticsService.runReport(session.accessToken, propertyId, {
        startDate,
        endDate,
        dimensions: [dim],
        metrics,
        limit: 100,
        dimensionFilter: dimensionFilter as any,
      });

      let previousPromise: Promise<typeof currentPromise extends Promise<infer T> ? T : any> | undefined;
      if (compare === "previous_period" || compare === "previous_year") {
        const prevRange = resolvePrevRange(startDate, endDate, compare);
        previousPromise = googleAnalyticsService.runReport(session.accessToken, propertyId, {
          startDate: prevRange.startDate,
          endDate: prevRange.endDate,
          dimensions: [dim],
          metrics,
          limit: 100,
          dimensionFilter: dimensionFilter as any,
        });
      }

      const [current, previous] = await Promise.all([currentPromise, previousPromise ?? Promise.resolve(undefined)]);

      // Build maps { channel -> {metricName: value} }
      const metricHeaders = current.metricHeaders.map(m => m.name);
      const getChannelFromRow = (row: { dimensionValues: { value: string }[] }) => row.dimensionValues[0]?.value || "(unassigned)";
      const parseNumber = (v: string | undefined) => {
        if (!v) return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const currentMap = new Map<string, Record<string, number>>();
      for (const r of current.rows) {
        const ch = getChannelFromRow(r);
        const obj: Record<string, number> = {};
        r.metricValues.forEach((mv, idx) => { obj[metricHeaders[idx] ?? `m${idx}`] = parseNumber(mv.value); });
        currentMap.set(ch, obj);
      }

      const prevMap = new Map<string, Record<string, number>>();
      if (previous) {
        for (const r of previous.rows) {
          const ch = getChannelFromRow(r);
          const obj: Record<string, number> = {};
          r.metricValues.forEach((mv, idx) => { obj[metricHeaders[idx] ?? `m${idx}`] = parseNumber(mv.value); });
          prevMap.set(ch, obj);
        }
      }

      const channels = Array.from(new Set<string>([...currentMap.keys(), ...prevMap.keys()]));
      channelBreakdown = channels.map((channel) => {
        const cur = currentMap.get(channel) ?? {};
        const prev = prevMap.get(channel) ?? {};
        const metricsObj: Record<string, { current: number; prev?: number; delta?: number; deltaPct?: number }>
          = {};
        for (const m of metricHeaders) {
          const c = cur[m] ?? 0;
          const p = previous ? (prev[m] ?? 0) : undefined;
          const delta = p !== undefined ? c - p : undefined;
          const deltaPct = p !== undefined ? (p === 0 ? (c === 0 ? 0 : 100) : (delta! / p) * 100) : undefined;
          metricsObj[m] = { current: c, prev: p, delta, deltaPct };
        }
        return { channel, metrics: metricsObj };
      });
    }

    const responsePayload = {
      propertyId,
      data: analyticsData,
      dateRange: { startDate, endDate },
      timestamp: new Date().toISOString(),
      channelBreakdown,
      compare,
      groupBy,
      metrics,
      organicOnly,
    };

    // Cache the payload
    CACHE.set(baseKey, { data: responsePayload, expiresAt: now + TTL_MS });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const { id } = await params;
    console.error(`Error in /api/analytics/properties/${id}/data:`, error);

    // Handle specific error cases
    if (error instanceof Error && error.message.includes("not found")) {
      const apiError: ApiError = {
        error: "Not Found",
        message: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(apiError, { status: 404 });
    }

    const apiError: ApiError = {
      error: "Internal Server Error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}
