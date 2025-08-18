// Test file to verify AnalyticsGeminiService implementation
import { AnalyticsGeminiService } from './AnalyticsGeminiService';
import type { AnalyticsContext, ChatMessage } from '../../types/chat';

// Mock analytics context for testing
const mockContext: AnalyticsContext = {
  properties: [
    {
      propertyId: 'test-property-1',
      displayName: 'Test Brand A',
      metrics: {
        activeUsers: 1500,
        sessions: 2000,
        pageViews: 5000
      },
      trends: {
        activeUsers: 'up',
        sessions: 'up',
        pageViews: 'stable'
      }
    }
  ],
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  },
  metrics: [
    {
      name: 'activeUsers',
      total: 1500,
      average: 50,
      trend: 'up',
      topPerformers: []
    }
  ],
  aggregatedData: {
    totalUsers: 1500,
    totalSessions: 2000,
    totalPageViews: 5000,
    averageBounceRate: 45.2,
    averageSessionDuration: 120
  },
  trends: [
    {
      metric: 'activeUsers',
      direction: 'up',
      changePercent: 15.5,
      significance: 'high',
      description: 'Strong growth in user acquisition'
    }
  ],
  comparisons: []
};

const mockConversationHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'How is my brand performing?',
    timestamp: new Date()
  }
];

// Test function
export async function testAnalyticsGeminiService() {
  console.log('Testing AnalyticsGeminiService...');
  
  const service = new AnalyticsGeminiService();
  
  try {
    // Test health check
    const health = await service.getHealthStatus();
    console.log('Health Status:', health);
    
    // Test configuration validation
    const isConfigured = await service.validateConfiguration();
    console.log('Configuration Valid:', isConfigured);
    
    if (isConfigured) {
      // Test analytics response generation
      const response = await service.generateAnalyticsResponse(
        'What are the key trends in my data?',
        mockContext,
        mockConversationHistory
      );
      
      console.log('Generated Response:');
      console.log('- Answer:', response.answer);
      console.log('- Insights:', response.insights);
      console.log('- Recommendations:', response.recommendations);
      console.log('- Confidence:', response.confidence);
      console.log('- Data References:', response.dataReferences.length);
      
      return true;
    } else {
      console.log('Service not properly configured - skipping response test');
      return false;
    }
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Export for potential use in other test files
export { mockContext, mockConversationHistory };