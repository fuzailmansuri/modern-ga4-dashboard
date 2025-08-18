import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../env.js";
import type {
  AnalyticsContext,
  AnalyticsResponse,
  ChatMessage,
  DataReference,
  RawAIResponse,
  ChatError
} from "../../types/chat.js";

/**
 * Analytics-specific Gemini AI service that extends the base Gemini functionality
 * with specialized prompting and response formatting for analytics queries.
 */
export class AnalyticsGeminiService {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Generate an analytics-specific response using structured prompting
   */
  async generateAnalyticsResponse(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[] = [],
    conversationContext?: string
  ): Promise<AnalyticsResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const contextPrompt = this.buildContextPrompt(context);
      const conversationPrompt = this.buildConversationPrompt(conversationHistory);
      const conversationContextPrompt = conversationContext ? `\n\nCONVERSATION CONTEXT:\n${conversationContext}` : '';
      const userPrompt = this.buildUserPrompt(query);

      const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n${conversationPrompt}${conversationContextPrompt}\n\n${userPrompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const rawResponse: RawAIResponse = {
        text: result.response.text(),
        metadata: {
          finishReason: result.response.candidates?.[0]?.finishReason,
          safetyRatings: result.response.candidates?.[0]?.safetyRatings
        }
      };

      return this.parseAndValidateResponse(rawResponse, context);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Build the system prompt that defines the AI's role and capabilities
   */
  private buildSystemPrompt(): string {
    return `You are an expert Google Analytics data analyst assistant. Your role is to help users understand their website and brand performance data by providing clear, actionable insights.

CORE CAPABILITIES:
- Analyze Google Analytics 4 (GA4) data including metrics like users, sessions, pageviews, bounce rate, conversion rate, and revenue
- Compare performance across different properties, brands, and time periods
- Identify trends, patterns, and anomalies in the data
- Provide actionable recommendations based on data insights
- Explain complex analytics concepts in simple terms

RESPONSE REQUIREMENTS:
- Always base your responses on the provided analytics data
- Be specific with numbers, percentages, and metrics when available
- Highlight significant trends and changes
- Provide context for what the data means for business performance
- Suggest actionable next steps when appropriate
- If data is insufficient or unavailable, clearly state limitations

RESPONSE FORMAT:
Your response must be structured as a JSON object with the following format:
{
  "answer": "Main response to the user's question",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "dataReferences": [
    {
      "propertyId": "property_id",
      "propertyName": "Property Name",
      "metric": "metric_name",
      "value": numeric_value,
      "dateRange": {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"},
      "source": "google_analytics"
    }
  ],
  "confidence": 0.85
}

IMPORTANT: Always respond with valid JSON only. Do not include any text outside the JSON structure.`;
  } 
 /**
   * Build context prompt with current analytics data
   */
  private buildContextPrompt(context: AnalyticsContext): string {
    const propertiesInfo = context.properties.map(prop => 
      `- ${prop.displayName} (ID: ${prop.propertyId}): ${Object.entries(prop.metrics)
        .map(([metric, value]) => `${metric}: ${value}`)
        .join(', ')}`
    ).join('\n');

    const metricsInfo = context.metrics.map(metric =>
      `- ${metric.name}: Total ${metric.total}, Average ${metric.average}, Trend: ${metric.trend}`
    ).join('\n');

    const trendsInfo = context.trends.map(trend =>
      `- ${trend.metric}: ${trend.direction} ${trend.changePercent}% (${trend.significance} significance) - ${trend.description}`
    ).join('\n');

    const comparisonsInfo = context.comparisons.map(comp => {
      const itemsInfo = comp.items.map(item => 
        `${item.name}: ${item.value}${item.change ? ` (${item.change > 0 ? '+' : ''}${item.change}%)` : ''}`
      ).join(', ');
      return `- ${comp.type}: ${itemsInfo}${comp.winner ? ` | Winner: ${comp.winner}` : ''}`;
    }).join('\n');

    return `CURRENT ANALYTICS CONTEXT:

Date Range: ${context.dateRange.startDate} to ${context.dateRange.endDate}

PROPERTIES:
${propertiesInfo}

AGGREGATED METRICS:
- Total Users: ${context.aggregatedData.totalUsers}
- Total Sessions: ${context.aggregatedData.totalSessions}
- Total Page Views: ${context.aggregatedData.totalPageViews}
- Average Bounce Rate: ${context.aggregatedData.averageBounceRate}%
- Average Session Duration: ${context.aggregatedData.averageSessionDuration}s
${context.aggregatedData.totalRevenue ? `- Total Revenue: $${context.aggregatedData.totalRevenue}` : ''}
${context.aggregatedData.conversionRate ? `- Conversion Rate: ${context.aggregatedData.conversionRate}%` : ''}

METRIC SUMMARIES:
${metricsInfo}

TREND ANALYSIS:
${trendsInfo}

COMPARISONS:
${comparisonsInfo}`;
  }

  /**
   * Build conversation history prompt for context retention
   */
  private buildConversationPrompt(conversationHistory: ChatMessage[]): string {
    if (conversationHistory.length === 0) {
      return "CONVERSATION HISTORY: This is the start of a new conversation.";
    }

    const recentHistory = conversationHistory.slice(-6); // Keep last 6 messages for context
    const historyText = recentHistory.map(msg => 
      `${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\n');

    return `CONVERSATION HISTORY:
${historyText}

Remember to maintain context from this conversation when answering the current question.`;
  }

  /**
   * Build the user prompt with the current query
   */
  private buildUserPrompt(query: string): string {
    return `USER QUERY: ${query}

Please analyze the provided analytics data and respond with insights that directly address this query. Remember to format your response as valid JSON according to the specified structure.`;
  }

  /**
   * Parse and validate the AI response, ensuring it matches expected structure
   */
  private parseAndValidateResponse(rawResponse: RawAIResponse, context: AnalyticsContext): AnalyticsResponse {
    try {
      // Clean the response text to extract JSON
      let jsonText = rawResponse.text.trim();
      
      // Remove any markdown code block formatting
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (!parsed.answer || typeof parsed.answer !== 'string') {
        throw new Error('Invalid response: missing or invalid answer field');
      }

      // Ensure arrays exist and are valid
      const insights = Array.isArray(parsed.insights) ? parsed.insights : [];
      const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      const dataReferences = Array.isArray(parsed.dataReferences) 
        ? this.validateDataReferences(parsed.dataReferences, context)
        : [];

      // Validate confidence score
      const confidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
        ? parsed.confidence
        : 0.7; // Default confidence

      return {
        answer: parsed.answer,
        insights,
        recommendations,
        dataReferences,
        confidence
      };
    } catch (error) {
      // Fallback: create a basic response if JSON parsing fails
      return {
        answer: rawResponse.text,
        insights: [],
        recommendations: [],
        dataReferences: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Validate and clean data references
   */
  private validateDataReferences(references: any[], context: AnalyticsContext): DataReference[] {
    return references
      .filter(ref => ref && typeof ref === 'object')
      .map(ref => ({
        propertyId: ref.propertyId || '',
        propertyName: ref.propertyName || '',
        metric: ref.metric || '',
        value: typeof ref.value === 'number' ? ref.value : 0,
        dateRange: ref.dateRange || context.dateRange,
        source: 'google_analytics' as const
      }))
      .filter(ref => ref.propertyId && ref.metric); // Only keep valid references
  }

  /**
   * Handle errors and convert them to ChatError format
   */
  private handleError(error: any): ChatError {
    if (error.message?.includes('API key')) {
      return {
        type: 'ai_service',
        message: 'AI service configuration error',
        details: 'Please check your API key configuration',
        retryable: false
      };
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
        type: 'ai_service',
        message: 'AI service rate limit exceeded',
        details: 'Please try again in a few moments',
        retryable: true
      };
    }

    if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
      return {
        type: 'network',
        message: 'Network connection error',
        details: 'Please check your internet connection and try again',
        retryable: true
      };
    }

    return {
      type: 'ai_service',
      message: 'AI service error',
      details: error.message || 'An unexpected error occurred',
      retryable: true
    };
  }

  /**
   * Test the service connection and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = "Test connection. Respond with: {'status': 'connected'}";
      const result = await this.model.generateContent(testPrompt);
      return !!result.response.text();
    } catch (error) {
      return false;
    }
  }
}