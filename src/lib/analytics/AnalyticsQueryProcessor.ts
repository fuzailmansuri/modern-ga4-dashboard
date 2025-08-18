// Analytics Query Processor - Processes natural language queries and prepares context for AI

import type {
  QueryProcessor,
  ProcessedQuery,
  QueryIntent,
  ExtractedEntities,
  AnalyticsContext,
  ChatMessage
} from "../../types/chat";
import type { AnalyticsData } from "../../types/analytics";

export class AnalyticsQueryProcessor implements QueryProcessor {
  
  // Common metric keywords and their variations
  private readonly metricKeywords = new Map<string, string[]>([
    ['users', ['users', 'user', 'visitors', 'visitor', 'people', 'audience']],
    ['sessions', ['sessions', 'session', 'visits', 'visit']],
    ['pageViews', ['pageviews', 'page views', 'views', 'page view', 'screens']],
    ['bounceRate', ['bounce rate', 'bounce', 'bounces', 'bounce %']],
    ['sessionDuration', ['session duration', 'time on site', 'session time', 'duration', 'time spent']],
    ['revenue', ['revenue', 'sales', 'money', 'earnings', 'income', 'transactions']],
    ['conversions', ['conversions', 'conversion', 'goals', 'goal', 'converts']],
    ['engagementRate', ['engagement', 'engagement rate', 'engaged users', 'engagement %']],
    ['newUsers', ['new users', 'new visitors', 'first time users', 'new people']],
    ['returningUsers', ['returning users', 'repeat users', 'return visitors', 'loyal users']]
  ]);

  // Time reference patterns
  private readonly timePatterns = [
    { pattern: /\b(today|now)\b/i, type: 'today' },
    { pattern: /\b(yesterday)\b/i, type: 'yesterday' },
    { pattern: /\b(this week|current week)\b/i, type: 'this_week' },
    { pattern: /\b(last week|previous week)\b/i, type: 'last_week' },
    { pattern: /\b(this month|current month)\b/i, type: 'this_month' },
    { pattern: /\b(last month|previous month)\b/i, type: 'last_month' },
    { pattern: /\b(this year|current year)\b/i, type: 'this_year' },
    { pattern: /\b(last year|previous year)\b/i, type: 'last_year' },
    { pattern: /\b(\d{1,2})\s*(days?|weeks?|months?)\s*(ago|back)\b/i, type: 'relative' },
    { pattern: /\b(past|last)\s*(\d+)\s*(days?|weeks?|months?|years?)\b/i, type: 'past_period' }
  ];

  // Comparison keywords
  private readonly comparisonKeywords = [
    { pattern: /\b(vs|versus|compared to|against|compare)\b/i, type: 'vs' as const },
    { pattern: /\b(best|top|highest|leading|winner|rank|ranking)\b/i, type: 'ranking' as const },
    { pattern: /\b(trend|trending|over time|change|growth|decline)\b/i, type: 'trend' as const }
  ];

  /**
   * Main method to process a user query
   */
  async processQuery(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[]
  ): Promise<ProcessedQuery> {
    // Extract intent and entities
    const intent = this.extractIntent(query);
    const entities = this.extractEntities(query);
    
    // Enhance entities with context from conversation history
    const enhancedEntities = this.enhanceEntitiesWithHistory(entities, conversationHistory);
    
    // Filter relevant data based on extracted entities
    const relevantData = this.filterRelevantData(context, enhancedEntities);
    
    // Build context prompt for AI
    const contextPrompt = this.buildContextPrompt(query, context, conversationHistory);

    return {
      intent,
      entities: enhancedEntities,
      relevantData,
      contextPrompt
    };
  }

  /**
   * Extracts the primary intent from a user query
   */
  extractIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    // Check for comparison patterns first (most specific)
    if (this.comparisonKeywords.some(comp => comp.pattern.test(query))) {
      if (/\b(vs|versus|compared to|against|compare)\b/i.test(query)) {
        return 'brand_comparison';
      }
      if (/\b(best|top|highest|leading|winner|rank|ranking)\b/i.test(query)) {
        return 'performance_ranking';
      }
      if (/\b(trend|trending|over time|change|growth|decline)\b/i.test(query)) {
        return 'trend_analysis';
      }
    }

    // Check for time period analysis
    if (this.timePatterns.some(time => time.pattern.test(query))) {
      return 'time_period_analysis';
    }

    // Check for specific metric inquiries
    const hasMetricKeywords = Array.from(this.metricKeywords.values()).some(variations =>
      variations.some(variation => lowerQuery.includes(variation))
    );

    if (hasMetricKeywords) {
      return 'metric_inquiry';
    }

    // Default to general insight for broader questions
    return 'general_insight';
  }

  /**
   * Extracts entities (brands, metrics, time references) from the query
   */
  extractEntities(query: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      brands: [],
      metrics: [],
      timeReferences: [],
      comparisonType: undefined
    };

    // Extract metrics
    entities.metrics = this.extractMetrics(query);

    // Extract time references
    entities.timeReferences = this.extractTimeReferences(query);

    // Extract comparison type
    entities.comparisonType = this.extractComparisonType(query);

    // Extract brand names (this would need to be enhanced with actual brand data)
    entities.brands = this.extractBrands(query);

    return entities;
  }

  /**
   * Builds a structured context prompt for the AI
   */
  buildContextPrompt(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[]
  ): string {
    const sections: string[] = [];

    // Add conversation context if available
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-3); // Last 3 messages for context
      sections.push("CONVERSATION CONTEXT:");
      recentHistory.forEach(msg => {
        sections.push(`${msg.type.toUpperCase()}: ${msg.content}`);
      });
      sections.push("");
    }

    // Add current query
    sections.push(`USER QUERY: ${query}`);
    sections.push("");

    // Add analytics context
    sections.push("ANALYTICS DATA CONTEXT:");
    sections.push(`Date Range: ${context.dateRange.startDate} to ${context.dateRange.endDate}`);
    sections.push("");

    // Add property summaries
    if (context.properties.length > 0) {
      sections.push("PROPERTIES:");
      context.properties.forEach(prop => {
        sections.push(`- ${prop.displayName} (ID: ${prop.propertyId})`);
        const keyMetrics = Object.entries(prop.metrics)
          .filter(([_, value]) => typeof value === 'number' && value > 0)
          .slice(0, 5) // Top 5 metrics
          .map(([metric, value]) => `${metric}: ${this.formatMetricValue(metric, value as number)}`)
          .join(', ');
        if (keyMetrics) {
          sections.push(`  Key metrics: ${keyMetrics}`);
        }
      });
      sections.push("");
    }

    // Add aggregated metrics
    sections.push("OVERALL METRICS:");
    const aggregated = context.aggregatedData;
    sections.push(`Total Users: ${aggregated.totalUsers.toLocaleString()}`);
    sections.push(`Total Sessions: ${aggregated.totalSessions.toLocaleString()}`);
    sections.push(`Total Page Views: ${aggregated.totalPageViews.toLocaleString()}`);
    sections.push(`Average Bounce Rate: ${aggregated.averageBounceRate.toFixed(1)}%`);
    sections.push(`Average Session Duration: ${this.formatDuration(aggregated.averageSessionDuration)}`);
    
    if (aggregated.totalRevenue) {
      sections.push(`Total Revenue: $${aggregated.totalRevenue.toLocaleString()}`);
    }
    if (aggregated.conversionRate) {
      sections.push(`Conversion Rate: ${aggregated.conversionRate.toFixed(2)}%`);
    }
    sections.push("");

    // Add trends if available
    if (context.trends.length > 0) {
      sections.push("TRENDS:");
      context.trends.forEach(trend => {
        sections.push(`- ${trend.description} (${trend.significance} significance)`);
      });
      sections.push("");
    }

    // Add comparisons if available
    if (context.comparisons.length > 0) {
      sections.push("COMPARISONS:");
      context.comparisons.forEach(comparison => {
        if (comparison.winner) {
          sections.push(`- Top performer: ${comparison.winner}`);
        }
        comparison.insights.forEach(insight => {
          sections.push(`- ${insight}`);
        });
      });
      sections.push("");
    }

    // Add instructions for the AI
    sections.push("INSTRUCTIONS:");
    sections.push("- Answer the user's query based on the provided analytics data");
    sections.push("- Be specific and include actual numbers when relevant");
    sections.push("- If comparing properties, highlight key differences");
    sections.push("- If discussing trends, explain what the data shows");
    sections.push("- If data is limited, acknowledge the limitations");
    sections.push("- Provide actionable insights when possible");

    return sections.join("\n");
  }

  /**
   * Extracts metric names from the query
   */
  private extractMetrics(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const foundMetrics: string[] = [];

    Array.from(this.metricKeywords.entries()).forEach(([metricName, variations]) => {
      if (variations.some(variation => lowerQuery.includes(variation))) {
        foundMetrics.push(metricName);
      }
    });

    return foundMetrics;
  }

  /**
   * Extracts time references from the query
   */
  private extractTimeReferences(query: string): string[] {
    const timeRefs: string[] = [];

    for (const timePattern of this.timePatterns) {
      const match = query.match(timePattern.pattern);
      if (match) {
        timeRefs.push(timePattern.type);
      }
    }

    return timeRefs;
  }

  /**
   * Extracts comparison type from the query
   */
  private extractComparisonType(query: string): 'vs' | 'ranking' | 'trend' | undefined {
    for (const comparison of this.comparisonKeywords) {
      if (comparison.pattern.test(query)) {
        return comparison.type;
      }
    }
    return undefined;
  }

  /**
   * Extracts brand names from the query (simplified implementation)
   */
  private extractBrands(query: string): string[] {
    // This is a simplified implementation
    // In a real scenario, this would match against known brand names from the context
    const brands: string[] = [];
    
    // Look for quoted brand names
    const quotedMatches = query.match(/"([^"]+)"/g);
    if (quotedMatches) {
      brands.push(...quotedMatches.map(match => match.replace(/"/g, '')));
    }

    // Look for capitalized words that might be brand names
    const capitalizedWords = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords) {
      // Filter out common words that aren't brands
      const commonWords = ['Google', 'Analytics', 'Users', 'Sessions', 'Revenue', 'Today', 'Yesterday', 'Week', 'Month', 'Year'];
      const potentialBrands = capitalizedWords.filter(word => !commonWords.includes(word));
      brands.push(...potentialBrands);
    }

    return Array.from(new Set(brands)); // Remove duplicates
  }

  /**
   * Enhances entities with context from conversation history
   */
  private enhanceEntitiesWithHistory(
    entities: ExtractedEntities,
    conversationHistory: ChatMessage[]
  ): ExtractedEntities {
    if (conversationHistory.length === 0) {
      return entities;
    }

    // Get the last few messages to understand context
    const recentMessages = conversationHistory.slice(-3);
    
    // If current query doesn't specify brands but previous messages did, inherit them
    if (entities.brands.length === 0) {
      for (const message of recentMessages.reverse()) {
        if (message.context?.properties) {
          entities.brands = message.context.properties.map(p => p.displayName);
          break;
        }
      }
    }

    // If current query doesn't specify metrics but is a follow-up, try to infer
    if (entities.metrics.length === 0) {
      const lastUserMessage = recentMessages
        .filter(msg => msg.type === 'user')
        .pop();
      
      if (lastUserMessage) {
        const previousEntities = this.extractEntities(lastUserMessage.content);
        if (previousEntities.metrics.length > 0) {
          entities.metrics = previousEntities.metrics;
        }
      }
    }

    return entities;
  }

  /**
   * Filters relevant data based on extracted entities
   */
  private filterRelevantData(
    context: AnalyticsContext,
    entities: ExtractedEntities
  ): AnalyticsData[] {
    // This is a simplified implementation
    // In a real scenario, this would filter the actual analytics data
    // based on the extracted entities (brands, metrics, time periods)
    
    // For now, return empty array as the actual filtering would depend
    // on having access to the raw AnalyticsData objects
    return [];
  }

  /**
   * Formats metric values for display
   */
  private formatMetricValue(metric: string, value: number): string {
    if (metric.toLowerCase().includes('rate') || metric.toLowerCase().includes('bounce')) {
      return `${value.toFixed(1)}%`;
    }
    
    if (metric.toLowerCase().includes('duration') || metric.toLowerCase().includes('time')) {
      return this.formatDuration(value);
    }
    
    if (metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('money')) {
      return `$${value.toLocaleString()}`;
    }
    
    return value.toLocaleString();
  }

  /**
   * Formats duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}