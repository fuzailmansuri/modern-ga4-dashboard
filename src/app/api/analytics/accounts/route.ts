import { type NextRequest, NextResponse } from 'next/server';
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import type { ApiError } from "~/types/analytics";

/**
 * GET /api/analytics/accounts
 * Fetch all Google Analytics accounts for the authenticated user
 */
export async function GET(_request: NextRequest) {
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

    const accounts = await googleAnalyticsService.getAccounts(
      session.accessToken,
    );

    return NextResponse.json({
      accounts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/analytics/accounts:", error);

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
