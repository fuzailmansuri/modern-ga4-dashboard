import { NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { analyticsDataSync } from "~/lib/analytics/AnalyticsDataSync";
import type { AnalyticsData } from "~/types/analytics";
import type { DateRange } from "~/types/chat";

/**
 * GET /api/analytics/events
 * Server-Sent Events endpoint for real-time analytics data updates
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyIds = searchParams.get("propertyIds")?.split(",") || [];
    const startDate = searchParams.get("startDate") || "7daysAgo";
    const endDate = searchParams.get("endDate") || "today";

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent("connected", {
          message: "Connected to analytics data stream",
          timestamp: new Date().toISOString()
        });

        // Set up data update listener
        const dataUpdateListener = (propertyId: string, data: AnalyticsData, dateRange: DateRange) => {
          // Only send updates for requested properties
          if (propertyIds.length === 0 || propertyIds.includes(propertyId)) {
            sendEvent("dataUpdate", {
              propertyId,
              dateRange,
              timestamp: new Date().toISOString(),
              rowCount: data.rows?.length || 0,
              hasData: (data.rows?.length || 0) > 0
            });
          }
        };

        // Add listener to sync service
        analyticsDataSync.addUpdateListener(dataUpdateListener);

        // Send periodic heartbeat and sync status
        const heartbeatInterval = setInterval(() => {
          const syncStatus = analyticsDataSync.getSyncStatus(propertyIds.length > 0 ? propertyIds : undefined);
          const cacheStats = analyticsDataSync.getCacheStats();
          
          sendEvent("heartbeat", {
            timestamp: new Date().toISOString(),
            syncStatus,
            cacheStats
          });
        }, 30000); // Every 30 seconds

        // Cleanup function
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          analyticsDataSync.removeUpdateListener(dataUpdateListener);
          try {
            controller.close();
          } catch (error) {
            // Controller might already be closed
          }
        };

        // Handle client disconnect
        request.signal.addEventListener("abort", cleanup);

        // Store cleanup function for potential manual cleanup
        (controller as any).cleanup = cleanup;
      },

      cancel() {
        // Cleanup when stream is cancelled
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
      }
    });

  } catch (error) {
    console.error("Error in /api/analytics/events:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}