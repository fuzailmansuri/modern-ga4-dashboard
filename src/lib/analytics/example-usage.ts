/**
 * Example usage of the AnalyticsGeminiService
 * This file demonstrates how to integrate the service with your analytics dashboard
 */

import { AnalyticsGeminiService } from './AnalyticsGeminiService.js';
import type { 
  AnalyticsContext, 
  ChatMessage, 
  AnalyticsResponse,
  ChatError 
} from '../../types/chat.js';

/**
 * Example: Basic usage of AnalyticsGeminiService
 */
export async function basicUsageExample(
  userQuery: string,
  analyticsContext: AnalyticsContext,
  conversationHistory: ChatMessage[] = []
): Promise<AnalyticsResponse | ChatError> {
  try {
    const geminiService = new AnalyticsGeminiService();
    
    // Generate response
    const response = await geminiService.generateAnalyticsResponse(
      userQuery,
      analyticsContext,
      conversationHistory
    );
    
    return response;
  } catch (error) {
    // Error is already formatted as ChatError by the service
    return error as ChatError;
  }
}

/**
 * Example: Using the service in a chat interface component
 */
export class ChatInterfaceExample {
  private geminiService: AnalyticsGeminiService;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.geminiService = new AnalyticsGeminiService();
  }

  async processUserQuery(
    query: string,
    context: AnalyticsContext
  ): Promise<{ success: boolean; response?: AnalyticsResponse; error?: ChatError }> {
    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: new Date(),
        context
      };
      this.conversationHistory.push(userMessage);

      // Generate AI response
      const aiResponse = await this.geminiService.generateAnalyticsResponse(
        query,
        context,
        this.conversationHistory
      );

      // Add AI response to history
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: aiResponse.answer,
        timestamp: new Date(),
        context,
        dataReferences: aiResponse.dataReferences
      };
      this.conversationHistory.push(assistantMessage);

      return { success: true, response: aiResponse };
    } catch (error) {
      return { success: false, error: error as ChatError };
    }
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

/**
 * Example: Error handling patterns
 */
export async function errorHandlingExample(
  userQuery: string,
  analyticsContext: AnalyticsContext
): Promise<void> {
  const geminiService = new AnalyticsGeminiService();

  try {
    const response = await geminiService.generateAnalyticsResponse(
      userQuery,
      analyticsContext
    );
    
    console.log('Success:', response);
  } catch (error) {
    const chatError = error as ChatError;
    
    switch (chatError.type) {
      case 'ai_service':
        console.error('AI Service Error:', chatError.message);
        if (chatError.retryable) {
          console.log('This error is retryable. Consider implementing retry logic.');
        }
        break;
        
      case 'network':
        console.error('Network Error:', chatError.message);
        console.log('Check internet connection and retry.');
        break;
        
      case 'data_unavailable':
        console.error('Data Error:', chatError.message);
        console.log('The requested data is not available.');
        break;
        
      default:
        console.error('Unknown Error:', chatError.message);
    }
  }
}

/**
 * Example: Testing service availability
 */
export async function serviceHealthCheck(): Promise<boolean> {
  try {
    const geminiService = new AnalyticsGeminiService();
    
    // Test with a simple query to verify the service is working
    const testContext: AnalyticsContext = {
      properties: [],
      dateRange: { startDate: '7daysAgo', endDate: 'today' },
      metrics: [],
      aggregatedData: {
        totalSessions: 0,
        totalUsers: 0,
        totalPageViews: 0,
        averageBounceRate: 0,
        averageSessionDuration: 0,
        totalRevenue: 0,
        conversionRate: 0
      },
      trends: [],
      comparisons: []
    };
    
    const response = await geminiService.generateAnalyticsResponse(
      "Test connection",
      testContext,
      []
    );
    
    const isHealthy = response.answer.length > 0;
    
    if (isHealthy) {
      console.log('✅ AnalyticsGeminiService is healthy and ready to use');
    } else {
      console.log('❌ AnalyticsGeminiService is not responding');
    }
    
    return isHealthy;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

/**
 * Example: Integration with React component (pseudo-code)
 */
export const ReactIntegrationExample = `
// In your React component:
import { AnalyticsGeminiService } from '../lib/analytics/AnalyticsGeminiService';
import { useState, useCallback } from 'react';

export function AnalyticsChatInterface({ analyticsContext }) {
  const [geminiService] = useState(() => new AnalyticsGeminiService());
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserQuery = useCallback(async (query) => {
    setIsLoading(true);
    
    try {
      const response = await geminiService.generateAnalyticsResponse(
        query,
        analyticsContext,
        messages
      );
      
      // Add both user and AI messages to state
      setMessages(prev => [
        ...prev,
        { type: 'user', content: query, timestamp: new Date() },
        { 
          type: 'assistant', 
          content: response.answer, 
          timestamp: new Date(),
          insights: response.insights,
          recommendations: response.recommendations
        }
      ]);
    } catch (error) {
      // Handle error appropriately
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [geminiService, analyticsContext, messages]);

  // ... rest of component
}
`;