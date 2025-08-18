import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { googleAnalyticsService } from "~/lib/google-analytics";
import type { AnalyticsData, AnalyticsProperty } from "~/types/analytics";
import { generateSummary } from "~/lib/gemini";

// Simple cache for property data (5 minute TTL)
const propertyCache = new Map<string, { data: AnalyticsData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fast helper function for basic analytics
function quickAnalyze(data: AnalyticsData, propertyName: string) {
  if (!data?.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
    return { propertyName, hasData: false };
  }

  let totalUsers = 0;
  let totalSessions = 0;
  let totalPageviews = 0;
  let bounceRate = 0;

  // Only analyze first 10 rows for speed
  const sampleRows = data.rows.slice(0, 10);
  sampleRows.forEach((row) => {
    const values = row.metricValues ?? [];
    if (values.length >= 5) {
      totalUsers += parseInt(values[0]?.value ?? "0");
      totalSessions += parseInt(values[2]?.value ?? "0");
      totalPageviews += parseInt(values[3]?.value ?? "0");
      bounceRate = Math.max(bounceRate, parseFloat(values[4]?.value ?? "0"));
    }
  });

  return {
    propertyName,
    hasData: true,
    users: totalUsers,
    sessions: totalSessions,
    pageviews: totalPageviews,
    bounceRate: bounceRate.toFixed(1),
    engagement: totalSessions > 0 ? (totalPageviews / totalSessions).toFixed(1) : "0"
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      question: string;
      propertyId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      favouritesOnly?: boolean;
      favouritePropertyIds?: string[];
    };

    const question = body?.question ?? "";
    if (!question) {
      return NextResponse.json({ error: "Missing 'question'" }, { status: 400 });
    }

    const propertyId = body.propertyId;
    const startDate = body.startDate ?? "7daysAgo"; // Shorter default for speed
    const endDate = body.endDate ?? "today";

  let gaContext: Record<string, unknown> = {};
    
    if (propertyId) {
      // Single property - check cache first
      const cacheKey = `${propertyId}-${startDate}-${endDate}`;
      const cached = propertyCache.get(cacheKey);
      
      let data;
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        data = cached.data;
      } else {
        if (!session || !session.accessToken) {
          return NextResponse.json({ error: "Missing access token" }, { status: 401 });
        }
        data = await googleAnalyticsService.getAnalyticsData(
          session.accessToken,
          propertyId,
          startDate,
          endDate,
        );
        propertyCache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      const analysis = quickAnalyze(data, "Your Property");
      gaContext = {
        type: "single_property",
        propertyId,
        dateRange: { startDate, endDate },
        analysis,
      };
    } else {
      // Multi-property - support pagination and parallel fetch with concurrency limit
      const page = Number(body.page) || 1;
      const pageSize = Math.min(Number(body.pageSize) || 5, 20); // max 20 per page
      if (!session.accessToken) {
        return NextResponse.json({ error: "Missing access token" }, { status: 401 });
      }
      let properties = await googleAnalyticsService.getProperties(session.accessToken);
      // If favouritesOnly is enabled, filter properties to only those in favouritePropertyIds
      if (body.favouritesOnly && Array.isArray(body.favouritePropertyIds) && body.favouritePropertyIds.length > 0) {
        properties = properties.filter(p => body.favouritePropertyIds!.includes(p.propertyId));
      }
      const totalProperties = properties.length;
      const pagedProperties = properties.slice((page - 1) * pageSize, page * pageSize);

      // Parallel fetch with concurrency limit
      const concurrency = 3;
      const propertiesAnalysis: Array<Record<string, unknown>> = [];
      let idx = 0;
      async function fetchBatch(batch: typeof pagedProperties) {
        await Promise.all(batch.map(async (property) => {
          try {
            const cacheKey = `${property.propertyId}-${startDate}-${endDate}`;
            const cached = propertyCache.get(cacheKey);
            let data;
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
              data = cached.data;
            } else {
              if (!session || typeof session.accessToken !== 'string') {
                throw new Error('Access token is missing or invalid');
              }
              data = await googleAnalyticsService.getAnalyticsData(
                  session.accessToken,
                  property.propertyId,
                  startDate,
                  endDate,
                );
              propertyCache.set(cacheKey, { data, timestamp: Date.now() });
            }
            const analysis = quickAnalyze(data, property.displayName);
            if (analysis.hasData) {
              propertiesAnalysis.push({
                propertyId: property.propertyId,
                ...analysis
              });
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to fetch data for property ${property.propertyId}: ${msg}`);
          }
        }));
      }
      while (idx < pagedProperties.length) {
        await fetchBatch(pagedProperties.slice(idx, idx + concurrency));
        idx += concurrency;
      }

      // Simple ranking
      const topByUsers = [...propertiesAnalysis]
        .sort((a, b) => (Number(b.users) || 0) - (Number(a.users) || 0))
        .slice(0, 3);

      gaContext = {
        type: "multi_property_comparison",
        dateRange: { startDate, endDate },
        totalProperties,
        analyzedProperties: propertiesAnalysis.length,
        topPerformers: topByUsers,
        allProperties: propertiesAnalysis,
        page,
        pageSize,
        hasNextPage: page * pageSize < totalProperties,
        hasPrevPage: page > 1,
      };
    }

    const system = [
      "You are a friendly analytics teacher for kids! Keep responses short, fun, and easy to understand.",
      "Use simple language and emojis. Focus on the most important insights.",
      "When comparing properties:",
      "- Tell them which one is winning and why",
      "- Use simple comparisons like 'more users' or 'better engagement'",
      "- Give one simple tip for improvement",
      "Keep responses under 3 sentences for kids' attention spans!",
      "Use numbers but explain what they mean simply.",
    ].join("\n");

    const prompt = `System:\n${system}\n\nKid's question:\n${question}\n\nAnalytics Data:\n${JSON.stringify(
      gaContext,
      null,
      2,
    )}\n\nGive a short, fun answer a kid can understand!`;

    try {
      const answer = await generateSummary(prompt);
      return NextResponse.json({ ok: true, answer });
    } catch (error) {
      console.error("Gemini API error:", error);
      
      // Super simple fallback for kids
      let fallbackAnswer = "Hey there! ";
      
      if (gaContext.type === "multi_property_comparison") {
        const topPerformers = gaContext.topPerformers as any;
        
        if (topPerformers?.length > 0) {
          fallbackAnswer += `🏆 Your best brand is **${topPerformers[0].propertyName}** with ${topPerformers[0].users?.toLocaleString() || 0} users! `;
          fallbackAnswer += `That's like having ${Math.round((topPerformers[0].users || 0) / 100)} classrooms full of people visiting! 📚`;
        } else {
          fallbackAnswer += "I can see your brands but need more time to analyze them. Try again in a minute! ⏰";
        }
      } else if (gaContext.type === "single_property") {
        const analysis = gaContext.analysis as any;
        if (analysis.hasData) {
          fallbackAnswer += `Your brand has ${analysis.users?.toLocaleString() || 0} users and ${analysis.sessions?.toLocaleString() || 0} visits! `;
          fallbackAnswer += `That's pretty cool! 🎉`;
        } else {
          fallbackAnswer += "I can see your brand but there's no data yet. Check back later! 📊";
        }
      } else {
        fallbackAnswer += "Try asking again in a minute when I'm ready! 🚀";
      }
      
      return NextResponse.json({ 
        ok: true, 
        answer: fallbackAnswer,
        warning: "Quick mode - try again for full analysis!"
      });
    }
  } catch (error) {
    // Avoid logging sensitive data
    const msg = error instanceof Error ? error.message : String(error);
    console.error("/api/chat error:", msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}


