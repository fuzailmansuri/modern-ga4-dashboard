import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import { analyticsDataSync } from "~/lib/analytics/AnalyticsDataSync";
import { optimizedAnalyticsService } from "~/lib/analytics/OptimizedAnalyticsService";
import { AnalyticsContextManager } from "~/lib/analytics/AnalyticsContextManager";
import { AnalyticsQueryProcessor } from "~/lib/analytics/AnalyticsQueryProcessor";
import { AnalyticsGeminiService } from "~/lib/analytics/AnalyticsGeminiService";
import type { ApiError, AnalyticsProperty } from "~/types/analytics";
import type { AnalyticsResponse, ChatError, ChatMessage } from "~/types/chat";

// Request body interface
interface ChatRequest {
  query: string;
  propertyIds?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  conversationHistory?: ChatMessage[];
  sessionId?: string;
  filterPreset?: string;
  maxProperties?: number;
  organicOnly?: boolean;
  minTrafficThreshold?: number;
}

interface CacheStatusSummary {
  status: "fresh" | "stale" | "error" | "missing";
  lastSync?: string;
  message?: string;
}

// Response interface
interface ChatApiResponse {
  success: boolean;
  response?: (AnalyticsResponse & {
    warnings?: string[];
    cacheStatus?: Record<string, CacheStatusSummary>;
  });
  error?: string;
  errorDetails?: {
    type: string;
    severity?: string;
    canRetry?: boolean;
    retryAfter?: number;
    suggestions?: string[];
    code?: string;
  };
  sessionId?: string;
  timestamp: string;
}

// Basic in-memory conversation store (last 20 messages per session)
const conversationSessions = new Map<string, ChatMessage[]>();

/**
 * POST /api/analytics/chat
 * Process natural language queries about analytics data
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to access Analytics chat",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    if (!session.accessToken) {
      const error: ApiError = {
        error: "Missing Access Token",
        message: "No valid Google Analytics access token found. Please re-authenticate.",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Parse and validate request body
    let body: ChatRequest;
    try {
      body = await request.json() as ChatRequest;
    } catch (error) {
      const apiError: ApiError = {
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    // Validate required fields
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      const error: ApiError = {
        error: "Missing Query",
        message: "Query field is required and must be a non-empty string",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Basic date range default
    const dateRange = body.dateRange && body.dateRange.startDate && body.dateRange.endDate
      ? body.dateRange
      : { startDate: "7daysAgo", endDate: "today" };

    // Validate conversation history if provided
    let conversationHistory: ChatMessage[] = [];
    if (Array.isArray(body.conversationHistory)) {
      conversationHistory = body.conversationHistory
        .filter((message): message is ChatMessage => !!message && typeof message.content === "string")
        .map(message => ({
          ...message,
          timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
        }));
    }

    // Generate or use provided session ID
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Retrieve or initialize conversation session
    const existing = conversationSessions.get(sessionId) ?? [];
    const mergedHistory = [...existing, ...conversationHistory].slice(-10);

    // Determine properties to query
    const warningSet = new Set<string>();
    let properties: AnalyticsProperty[] = [];
    let allProperties: AnalyticsProperty[] = [];

    try {
      allProperties = await googleAnalyticsService.getProperties(session.accessToken);
    } catch (error) {
      const apiError: ApiError = {
        error: "Properties Fetch Failed",
        message: "Unable to load Google Analytics properties for the current user.",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(apiError, { status: 500 });
    }

    const requestedIds = Array.isArray(body.propertyIds) ? body.propertyIds.filter(Boolean) : [];
    if (requestedIds.length > 0) {
      const idSet = new Set(requestedIds);
      properties = allProperties.filter(prop => idSet.has(prop.propertyId) || idSet.has(prop.name));

      if (properties.length < requestedIds.length) {
        warningSet.add("One or more requested properties could not be found. Showing available data instead.");
      }
    }

    if (properties.length === 0) {
      try {
        const optimizedResult = await optimizedAnalyticsService.fetchOptimizedAnalyticsData(
          session.accessToken,
          dateRange,
          {
            maxProperties: body.maxProperties ?? 10,
            organicOnly: body.organicOnly ?? false,
            minTrafficThreshold: body.minTrafficThreshold,
            useCache: true,
          }
        );

        if (optimizedResult.successful.length > 0) {
          const optimizedIds = new Set(optimizedResult.successful.map(item => item.propertyId));
          properties = allProperties.filter(prop => optimizedIds.has(prop.propertyId));

          if (optimizedResult.failed.length > 0) {
            warningSet.add("Some properties could not be refreshed and may rely on cached data.");
          }
        }
      } catch (error) {
        warningSet.add("Unable to apply optimized property filtering. Using a default property selection.");
      }
    }

    if (properties.length === 0) {
      properties = allProperties.slice(0, Math.min(allProperties.length, body.maxProperties ?? 5));
      if (properties.length === 0) {
        const apiError: ApiError = {
          error: "No Properties Available",
          message: "No Google Analytics properties are available for analysis.",
          statusCode: 404,
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(apiError, { status: 404 });
      }

      warningSet.add("Falling back to the first available properties due to filtering issues.");
    }

    // Retrieve cached analytics data
    const analyticsData = await analyticsDataSync.batchGetAnalyticsData(
      session.accessToken,
      properties,
      dateRange,
      false
    );

    const syncStatus = analyticsDataSync.getSyncStatus(properties.map(p => p.propertyId));
    const cacheStatus: Record<string, CacheStatusSummary> = {};
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (const property of properties) {
      const status = syncStatus[property.propertyId];
      const dataAvailable = Boolean(analyticsData[property.propertyId]);

      if (!status) {
        if (!dataAvailable) {
          warningSet.add(`No cached analytics data is available for ${property.displayName}.`);
        }

        cacheStatus[property.propertyId] = {
          status: dataAvailable ? "stale" : "missing",
          message: "Cache status unavailable.",
        };
        continue;
      }

      const lastSyncIso = new Date(status.lastSync).toISOString();

      if (status.status === "error") {
        warningSet.add(`We couldn't refresh ${property.displayName}. Showing the last cached data.`);
        cacheStatus[property.propertyId] = {
          status: "error",
          lastSync: lastSyncIso,
          message: status.error ?? "Unknown synchronization error.",
        };
        continue;
      }

      const isStale = Date.now() - status.lastSync > STALE_THRESHOLD;
      if (isStale) {
        warningSet.add(`${property.displayName} data is older than 5 minutes. Refresh to see the latest numbers.`);
      }

      if (!dataAvailable) {
        warningSet.add(`Cached analytics data is missing for ${property.displayName}.`);
      }

      cacheStatus[property.propertyId] = {
        status: dataAvailable ? (isStale ? "stale" : "fresh") : "missing",
        lastSync: lastSyncIso,
        message: !dataAvailable
          ? "No cached analytics report was found for this property."
          : isStale
            ? "Using cached analytics data older than 5 minutes."
            : undefined,
      };
    }

    const contextManager = new AnalyticsContextManager();
    const analyticsContext = contextManager.buildContext(
      properties,
      analyticsData,
      dateRange,
      body.query
    );

    const queryProcessor = new AnalyticsQueryProcessor();
    const processedQuery = await queryProcessor.processQuery(
      body.query,
      analyticsContext,
      mergedHistory
    );

    const geminiService = new AnalyticsGeminiService();
    const aiResponse = await geminiService.generateAnalyticsResponse(
      body.query,
      analyticsContext,
      mergedHistory,
      processedQuery.contextPrompt
    );

    // Create user message for conversation history
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: body.query,
      timestamp: new Date(),
    };

    // Create assistant message for conversation history
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content: aiResponse.answer,
      timestamp: new Date(),
      dataReferences: aiResponse.dataReferences,
      context: analyticsContext,
    };

    // Update conversation session
    const updatedHistory = [...mergedHistory, userMessage, assistantMessage];
    conversationSessions.set(sessionId, updatedHistory.slice(-20)); // Keep last 20 messages

    const response: ChatApiResponse = {
      success: true,
      response: {
        ...aiResponse,
        warnings: warningSet.size > 0 ? Array.from(warningSet) : undefined,
        cacheStatus: Object.keys(cacheStatus).length > 0 ? cacheStatus : undefined,
      },
      sessionId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      const chatError = error as ChatError;
      const response: ChatApiResponse = {
        success: false,
        error: chatError.message,
        errorDetails: {
          type: chatError.type,
          canRetry: chatError.retryable,
          severity: chatError.type === "ai_service" ? "high" : "medium",
        },
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const response: ChatApiResponse = {
      success: false,
      error: message,
      errorDetails: {
        type: "server_error",
        severity: "high",
        canRetry: true,
        suggestions: ["Retry your request shortly", "Try a simpler question"],
      },
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/analytics/chat
 * Get conversation history for a session
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      const error: ApiError = {
        error: "Unauthorized",
        message: "You must be logged in to access conversation history",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ success: true, history: [] });
    }
    const history = conversationSessions.get(sessionId) ?? [];
    return NextResponse.json({ success: true, history });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve history' }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/chat
 * Clear conversation history for a session
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: true });
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (sessionId) conversationSessions.delete(sessionId);
    return NextResponse.json({ success: true, sessionId: sessionId ?? null });

  } catch (error) {
    console.error("Error in DELETE /api/analytics/chat:", error);

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