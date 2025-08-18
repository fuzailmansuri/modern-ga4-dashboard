import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { googleAnalyticsService } from '~/lib/google-analytics';
import type { ApiError } from '~/types/analytics';

/**
 * GET /api/analytics/properties/[id]
 * Fetch detailed information about a specific Google Analytics property
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      const error: ApiError = {
        error: 'Unauthorized',
        message: 'You must be logged in to access Analytics data',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    if (!session.accessToken) {
      const error: ApiError = {
        error: 'No Access Token',
        message: 'No valid access token found. Please re-authenticate.',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    if (session.error === 'RefreshAccessTokenError') {
      const error: ApiError = {
        error: 'Token Refresh Failed',
        message: 'Unable to refresh access token. Please sign in again.',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    const { id: propertyId } = await params;

    if (!propertyId) {
      const error: ApiError = {
        error: 'Bad Request',
        message: 'Property ID is required',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    const propertyDetails = await googleAnalyticsService.getPropertyDetails(session.accessToken, propertyId);
    
    return NextResponse.json({
      property: propertyDetails,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const { id } = await params;
    console.error(`Error in /api/analytics/properties/${id}:`, error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      const apiError: ApiError = {
        error: 'Not Found',
        message: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(apiError, { status: 404 });
    }
    
    const apiError: ApiError = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}