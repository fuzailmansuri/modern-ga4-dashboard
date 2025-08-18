import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import { analyticsDataSync } from "~/lib/analytics/AnalyticsDataSync";
import { validateDateRange } from "~/lib/validation/chat-validation";
import type { ApiError } from "~/types/analytics";
import type { DateRange } from "~/types/chat";

// Request interfaces
interface SyncRequest {
  propertyIds?: string[];
  dateRange?: DateRange;
  forceRefresh?: boolean;
  enableAutoSync?: boolean;
}

interface SyncStatusRequest {
  propertyIds?: string[];
}

/**
 * POST /api/analytics/sync
 * Trigger data synchronization for analytics properties
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to sync analytics data",
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

    // Parse request body
    let body: SyncRequest = {};
    try {
      body = await request.json() as SyncRequest;
    } catch (error) {
      // Empty body is acceptable for sync
    }

    // Validate date range
    let dateRange: DateRange = { startDate: "7daysAgo", endDate: "today" };
    if (body.dateRange) {
      try {
        dateRange = validateDateRange(body.dateRange);
      } catch (error) {
        const apiError: ApiError = {
          error: "Invalid Date Range",
          message: error instanceof Error ? error.message : "Invalid date range format",
          statusCode: 400,
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(apiError, { status: 400 });
      }
    }

    // Get properties to sync
    let properties;
    try {
      properties = await googleAnalyticsService.getProperties(session.accessToken);
    } catch (error) {
      const apiError: ApiError = {
        error: "Properties Fetch Failed",
        message: "Failed to fetch Google Analytics properties",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(apiError, { status: 500 });
    }

    // Filter properties if specific IDs provided
    if (body.propertyIds && Array.isArray(body.propertyIds) && body.propertyIds.length > 0) {
      properties = properties.filter(prop => 
        body.propertyIds!.includes(prop.propertyId) || 
        body.propertyIds!.includes(prop.name)
      );
    }

    if (properties.length === 0) {
      const error: ApiError = {
        error: "No Properties Found",
        message: "No accessible Google Analytics properties found",
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 404 });
    }

    // Perform batch sync
    const syncResults = await analyticsDataSync.batchGetAnalyticsData(
      session.accessToken,
      properties,
      dateRange,
      body.forceRefresh || false
    );

    // Start auto-sync if requested
    if (body.enableAutoSync) {
      analyticsDataSync.startAutoSync(session.accessToken, properties, dateRange);
    }

    // Get sync status
    const syncStatus = analyticsDataSync.getSyncStatus(
      properties.map(p => p.propertyId)
    );

    return NextResponse.json({
      success: true,
      message: "Data synchronization completed",
      syncedProperties: Object.keys(syncResults),
      syncedCount: Object.keys(syncResults).length,
      totalProperties: properties.length,
      syncStatus,
      autoSyncEnabled: body.enableAutoSync || false,
      dateRange,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in /api/analytics/sync:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const apiError: ApiError = {
      error: "Sync Failed",
      message: errorMessage,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * GET /api/analytics/sync
 * Get synchronization status and cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to check sync status",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyIdsParam = searchParams.get("propertyIds");
    const propertyIds = propertyIdsParam ? propertyIdsParam.split(",") : undefined;

    // Get sync status
    const syncStatus = analyticsDataSync.getSyncStatus(propertyIds);
    
    // Get cache statistics
    const cacheStats = analyticsDataSync.getCacheStats();

    return NextResponse.json({
      success: true,
      syncStatus,
      cacheStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in GET /api/analytics/sync:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const apiError: ApiError = {
      error: "Status Check Failed",
      message: errorMessage,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/sync
 * Clear cache and stop auto-sync
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to clear sync data",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyIdsParam = searchParams.get("propertyIds");
    const propertyIds = propertyIdsParam ? propertyIdsParam.split(",") : undefined;
    const stopAutoSync = searchParams.get("stopAutoSync") === "true";

    // Clear cache
    analyticsDataSync.clearCache(propertyIds);

    // Stop auto-sync if requested
    if (stopAutoSync) {
      analyticsDataSync.stopAutoSync();
    }

    return NextResponse.json({
      success: true,
      message: "Sync data cleared",
      clearedProperties: propertyIds || "all",
      autoSyncStopped: stopAutoSync,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in DELETE /api/analytics/sync:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const apiError: ApiError = {
      error: "Clear Failed",
      message: errorMessage,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}