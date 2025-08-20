import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import { logger } from "~/lib/logger";
import type { ApiError } from "~/types/analytics";

/**
 * GET /api/analytics/properties
 * Fetch Google Analytics properties for the authenticated user
 * Query parameters:
 * - accountId: Filter by specific account
 * - limit: Limit number of properties returned (default: 50)
 * - search: Search properties by name or ID
 * - propertyIds: Comma-separated list of specific property IDs to fetch
 * - favorites: Comma-separated list of favorite property IDs to show only
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const search = searchParams.get("search") ?? undefined;
    const propertyIds = searchParams.get("propertyIds") ?? undefined;
    const favorites = searchParams.get("favorites") ?? undefined;

  // Fetch all properties first
  logger.debug("[properties] requesting GA properties for user:", session.user?.email ?? "unknown");
  let properties = await googleAnalyticsService.getProperties(session.accessToken);
  logger.debug("[properties] initial properties count:", properties.length);

    // Filter by account if specified
    if (accountId) {
      properties = properties.filter(property => 
        property.parent === `accounts/${accountId}` || 
        property.parent === accountId
      );
    }

    // Filter by specific property IDs if provided
    if (propertyIds) {
      const idList = propertyIds.split(',').map(id => id.trim());
      properties = properties.filter(property => 
        idList.includes(property.propertyId) || 
        idList.includes(property.name)
      );
    }

    // Filter by favorites if provided
    if (favorites) {
      const favoriteIds = favorites.split(',').map(id => id.trim());
      properties = properties.filter(property => 
        favoriteIds.includes(property.propertyId) || 
        favoriteIds.includes(property.name)
      );
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      properties = properties.filter(property =>
        property.displayName.toLowerCase().includes(searchLower) ||
        property.propertyId.toLowerCase().includes(searchLower) ||
        property.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
  properties = properties.slice(0, limit);
  logger.debug("[properties] final properties count after filters/limit:", properties.length);

    if (properties.length === 0) {
      // Provide a helpful message when nothing is found
      return NextResponse.json({
        properties,
        message:
          "No GA4 properties were found for the signed-in account. Ensure this Google account has access to GA4 properties, the Analytics Admin/Data APIs are enabled, and you granted the requested scopes.",
        filters: {
          accountId: accountId ?? null,
          limit,
          search: search ?? null,
          propertyIds: propertyIds ?? null,
          favorites: favorites ?? null,
        },
        totalFound: properties.length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      properties,
      filters: {
        accountId: accountId ?? null,
        limit,
        search: search ?? null,
        propertyIds: propertyIds ?? null,
        favorites: favorites ?? null,
      },
      totalFound: properties.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/analytics/properties:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const apiError: ApiError = {
      error: "Internal Server Error",
      message: errorMessage,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}
