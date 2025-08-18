import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import type { ApiError } from "~/types/analytics";
import type { ChatMessage } from "~/types/chat";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
}

// Response interface
interface ChatApiResponse {
  success: boolean;
  response?: {
    answer: string;
    dataReferences?: Array<{ propertyId: string; metric?: string }>;
  };
  error?: string;
  errorDetails?: {
    type: string;
    severity: string;
    canRetry: boolean;
    retryAfter?: number;
    suggestions: string[];
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
    if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
      for (const message of body.conversationHistory) {
        // No validation for now
      }
    }

    // Generate or use provided session ID
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Retrieve or initialize conversation session
    const existing = conversationSessions.get(sessionId) ?? [];
    const mergedHistory = [...existing, ...conversationHistory].slice(-10);

    // Compose prompt
    const ids = Array.isArray(body.propertyIds) ? body.propertyIds : [];
    const contextSummary = `Properties selected: ${ids.length > 0 ? ids.join(', ') : 'not specified'}\nDate range: ${dateRange.startDate} to ${dateRange.endDate}`;
    const historyText = mergedHistory
      .map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are an analytics assistant. Analyze Google Analytics 4 data at a strategic level. 
Context:\n${contextSummary}\n\nRecent conversation:\n${historyText || 'None'}\n\nUser question: ${body.query}\n\nRespond with a concise, actionable answer. If data specifics are missing, state assumptions and suggest follow-up filters or metrics.`;

    // Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const error: ApiError = {
        error: "Missing GEMINI_API_KEY",
        message: "GEMINI_API_KEY is not configured on the server",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(error, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Create user message for conversation history
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: body.query,
      timestamp: new Date(),
    } as any;

    // Create assistant message for conversation history
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content: answer,
      timestamp: new Date(),
    } as any;

    // Update conversation session
    const updatedHistory = [...mergedHistory, userMessage, assistantMessage];
    conversationSessions.set(sessionId, updatedHistory.slice(-20)); // Keep last 20 messages

    const response: ChatApiResponse = {
      success: true,
      response: { answer },
      sessionId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
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