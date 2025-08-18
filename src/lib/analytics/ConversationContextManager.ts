import type { 
  ChatMessage, 
  AnalyticsContext, 
  ProcessedQuery,
  AnalyticsResponse 
} from "~/types/chat";

/**
 * Represents the context of an ongoing conversation
 */
export interface ConversationContext {
  id: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  currentTopic?: string;
  referencedMetrics: string[];
  referencedProperties: string[];
  referencedTimeRanges: string[];
  lastQuery?: ProcessedQuery;
  lastResponse?: AnalyticsResponse;
  conversationSummary?: string;
}

/**
 * Manages conversation memory and context tracking for analytics chat
 */
export class ConversationContextManager {
  private conversations: Map<string, ConversationContext> = new Map();
  private readonly maxConversationAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxMessages = 50; // Maximum messages to keep in context

  /**
   * Initialize or get existing conversation context
   */
  initializeConversation(conversationId: string): ConversationContext {
    const existing = this.conversations.get(conversationId);
    
    if (existing && this.isConversationActive(existing)) {
      return existing;
    }

    const newContext: ConversationContext = {
      id: conversationId,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      referencedMetrics: [],
      referencedProperties: [],
      referencedTimeRanges: []
    };

    this.conversations.set(conversationId, newContext);
    return newContext;
  }

  /**
   * Update conversation context with new message and query information
   */
  updateContext(
    conversationId: string,
    message: ChatMessage,
    query?: ProcessedQuery,
    response?: AnalyticsResponse,
    analyticsContext?: AnalyticsContext
  ): ConversationContext {
    const context = this.initializeConversation(conversationId);
    
    // Update basic conversation metadata
    context.lastActivity = new Date();
    context.messageCount++;

    // Track referenced entities from the query
    if (query) {
      context.lastQuery = query;
      
      // Add referenced metrics
      if (query.entities.metrics) {
        query.entities.metrics.forEach(metric => {
          if (!context.referencedMetrics.includes(metric)) {
            context.referencedMetrics.push(metric);
          }
        });
      }

      // Add referenced properties/brands
      if (query.entities.brands) {
        query.entities.brands.forEach(brand => {
          if (!context.referencedProperties.includes(brand)) {
            context.referencedProperties.push(brand);
          }
        });
      }

      // Add referenced time ranges
      if (query.entities.timeReferences && query.entities.timeReferences.length > 0) {
        query.entities.timeReferences.forEach(timeRef => {
          if (!context.referencedTimeRanges.includes(timeRef)) {
            context.referencedTimeRanges.push(timeRef);
          }
        });
      }

      // Update current topic based on query intent
      if (query.intent) {
        context.currentTopic = this.extractTopicFromIntent(query.intent);
      }
    }

    // Store the last response for context
    if (response) {
      context.lastResponse = response;
    }

    // Update conversation summary periodically
    if (context.messageCount % 10 === 0) {
      context.conversationSummary = this.generateConversationSummary(context);
    }

    this.conversations.set(conversationId, context);
    return context;
  }

  /**
   * Get conversation context for building AI prompts
   */
  getContextForPrompt(conversationId: string, messages: ChatMessage[]): string {
    const context = this.conversations.get(conversationId);
    
    if (!context || !this.isConversationActive(context)) {
      return "";
    }

    const contextParts: string[] = [];

    // Add conversation summary if available
    if (context.conversationSummary) {
      contextParts.push(`Conversation Summary: ${context.conversationSummary}`);
    }

    // Add current topic context
    if (context.currentTopic) {
      contextParts.push(`Current Topic: ${context.currentTopic}`);
    }

    // Add referenced entities for context
    if (context.referencedMetrics.length > 0) {
      contextParts.push(`Previously Discussed Metrics: ${context.referencedMetrics.join(', ')}`);
    }

    if (context.referencedProperties.length > 0) {
      contextParts.push(`Previously Discussed Properties: ${context.referencedProperties.join(', ')}`);
    }

    if (context.referencedTimeRanges.length > 0) {
      contextParts.push(`Previously Discussed Time Ranges: ${context.referencedTimeRanges.join(', ')}`);
    }

    // Add last query context for follow-up questions
    if (context.lastQuery) {
      contextParts.push(`Last Query Intent: ${context.lastQuery.intent}`);
      
      if (context.lastQuery.entities.metrics) {
        contextParts.push(`Last Query Metrics: ${context.lastQuery.entities.metrics.join(', ')}`);
      }
    }

    // Add recent message context (last 3 messages for immediate context)
    const recentMessages = messages.slice(-3);
    if (recentMessages.length > 0) {
      const messageContext = recentMessages
        .map(msg => `${msg.type}: ${msg.content}`)
        .join('\n');
      contextParts.push(`Recent Messages:\n${messageContext}`);
    }

    return contextParts.join('\n\n');
  }

  /**
   * Check if a follow-up question can be answered with previous context
   */
  canAnswerWithContext(conversationId: string, query: ProcessedQuery): boolean {
    const context = this.conversations.get(conversationId);
    
    if (!context || !this.isConversationActive(context)) {
      return false;
    }

    // Check if this is a follow-up question (pronouns, relative references)
    const followUpIndicators = [
      'it', 'that', 'this', 'them', 'those', 'these',
      'compared to', 'versus', 'vs', 'difference',
      'what about', 'how about', 'and', 'also'
    ];

    // Since ProcessedQuery doesn't have originalQuery, we'll use the contextPrompt or check entities
    const queryText = query.contextPrompt.toLowerCase();
    const hasFollowUpIndicators = followUpIndicators.some(indicator => 
      queryText.includes(indicator)
    );

    // Check if query lacks specific entities but context has them
    const lacksSpecificEntities = (
      (!query.entities.metrics || query.entities.metrics.length === 0) &&
      (!query.entities.brands || query.entities.brands.length === 0)
    );

    const hasContextEntities = (
      context.referencedMetrics.length > 0 ||
      context.referencedProperties.length > 0
    );

    return hasFollowUpIndicators || (lacksSpecificEntities && hasContextEntities);
  }

  /**
   * Enhance query with conversation context for follow-up questions
   */
  enhanceQueryWithContext(conversationId: string, query: ProcessedQuery): ProcessedQuery {
    const context = this.conversations.get(conversationId);
    
    if (!context || !this.canAnswerWithContext(conversationId, query)) {
      return query;
    }

    const enhancedQuery = { ...query };

    // Add missing metrics from context
    if (!enhancedQuery.entities.metrics || enhancedQuery.entities.metrics.length === 0) {
      if (context.referencedMetrics.length > 0) {
        enhancedQuery.entities.metrics = [...context.referencedMetrics.slice(-3)]; // Last 3 metrics
      }
    }

    // Add missing brands from context
    if (!enhancedQuery.entities.brands || enhancedQuery.entities.brands.length === 0) {
      if (context.referencedProperties.length > 0) {
        enhancedQuery.entities.brands = [...context.referencedProperties.slice(-2)]; // Last 2 properties
      }
    }

    // Add missing time references from context
    if ((!enhancedQuery.entities.timeReferences || enhancedQuery.entities.timeReferences.length === 0) && 
        context.lastQuery?.entities.timeReferences && context.lastQuery.entities.timeReferences.length > 0) {
      enhancedQuery.entities.timeReferences = [...context.lastQuery.entities.timeReferences];
    }

    // Update the context prompt to include conversation context
    enhancedQuery.contextPrompt = `${enhancedQuery.contextPrompt} [Context: ${this.getContextSummary(context)}]`;

    return enhancedQuery;
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations(): void {
    const now = new Date();
    
    for (const [id, context] of this.conversations.entries()) {
      if (now.getTime() - context.lastActivity.getTime() > this.maxConversationAge) {
        this.conversations.delete(id);
      }
    }
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId: string): {
    messageCount: number;
    duration: number;
    topicsDiscussed: string[];
    metricsDiscussed: string[];
  } | null {
    const context = this.conversations.get(conversationId);
    
    if (!context) {
      return null;
    }

    return {
      messageCount: context.messageCount,
      duration: context.lastActivity.getTime() - context.startTime.getTime(),
      topicsDiscussed: context.currentTopic ? [context.currentTopic] : [],
      metricsDiscussed: context.referencedMetrics
    };
  }

  private isConversationActive(context: ConversationContext): boolean {
    const now = new Date();
    return (now.getTime() - context.lastActivity.getTime()) < this.maxConversationAge;
  }

  private extractTopicFromIntent(intent: string): string {
    const topicMap: Record<string, string> = {
      'performance_comparison': 'Performance Comparison',
      'trend_analysis': 'Trend Analysis',
      'metric_inquiry': 'Metrics Analysis',
      'brand_performance': 'Brand Performance',
      'conversion_analysis': 'Conversion Analysis',
      'traffic_analysis': 'Traffic Analysis',
      'revenue_analysis': 'Revenue Analysis'
    };

    return topicMap[intent] || 'General Analytics';
  }

  private generateConversationSummary(context: ConversationContext): string {
    const parts: string[] = [];
    
    if (context.currentTopic) {
      parts.push(`Discussing ${context.currentTopic}`);
    }

    if (context.referencedMetrics.length > 0) {
      parts.push(`Analyzed metrics: ${context.referencedMetrics.slice(-3).join(', ')}`);
    }

    if (context.referencedProperties.length > 0) {
      parts.push(`Focused on properties: ${context.referencedProperties.slice(-2).join(', ')}`);
    }

    return parts.join('. ') || 'General analytics discussion';
  }

  private getContextSummary(context: ConversationContext): string {
    const parts: string[] = [];
    
    if (context.referencedMetrics.length > 0) {
      parts.push(`metrics: ${context.referencedMetrics.slice(-2).join(', ')}`);
    }

    if (context.referencedProperties.length > 0) {
      parts.push(`properties: ${context.referencedProperties.slice(-1).join(', ')}`);
    }

    return parts.join(', ');
  }
}

// Export singleton instance
export const conversationContextManager = new ConversationContextManager();