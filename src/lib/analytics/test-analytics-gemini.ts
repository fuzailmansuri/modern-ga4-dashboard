import { AnalyticsGeminiService } from './AnalyticsGeminiService.js';
import type { AnalyticsContext, ChatMessage } from '../../types/chat.js';

// Mock analytics context for testing
const mockContext: AnalyticsContext = {
  properties: [
    {
      propertyId: 'test-property-1',
      displayName: 'Test Brand A',
      metrics: {
        users: 1500,
        sessions: 2000,
        pageViews: 5000
      },
      trends: {
        users: 'up',
        sessions: 'up',
        pageViews: 'stable'
      }
    },
    {
      propertyId: 'test-property-2',
      displayName: 'Test Brand B',
      metrics: {
        users: 1200,
        sessions: 1800,
        pageViews: 4200
      },
      trends: {
        users: 'down',
        sessions: 'stable',
        pageViews: 'down'
      }
    }
  ],
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  },
  metrics: [
    {
      name: 'users',
      total: 2700,
      average: 1350,
      trend: 'up',
      topPerformers: []
    },
    {
      name: 'sessions',
      total: 3800,
      average: 1900,
      trend: 'up',
      topPerformers: []
    }
  ],
  aggregatedData: {
    totalUsers: 2700,
    totalSessions: 3800,
    totalPageViews: 9200,
    averageBounceRate: 45.2,
    averageSessionDuration: 180,
    totalRevenue: 15000,
    conversionRate: 2.5
  },
  trends: [
    {
      metric: 'users',
      direction: 'up',
      changePercent: 15.5,
      significance: 'high',
      description: 'User growth is strong this month'
    },
    {
      metric: 'sessions',
      direction: 'up',
      changePercent: 12.3,
      significance: 'medium',
      description: 'Session count increased moderately'
    }
  ],
  comparisons: [
    {
      type: 'property',
      items: [
        { name: 'Test Brand A', value: 1500, change: 15.5, rank: 1 },
        { name: 'Test Brand B', value: 1200, change: -5.2, rank: 2 }
      ],
      winner: 'Test Brand A',
      insights: ['Brand A is outperforming Brand B in user acquisition']
    }
  ]
};

const mockConversationHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'How are my brands performing this month?',
    timestamp: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: '2',
    type: 'assistant',
    content: 'Your brands are showing positive growth overall...',
    timestamp: new Date('2024-01-15T10:00:30Z')
  }
];

/**
 * Test the AnalyticsGeminiService functionality
 */
async function testAnalyticsGeminiService() {
  console.log('Testing AnalyticsGeminiService...');
  
  try {
    const service = new AnalyticsGeminiService();
    
    // Test connection with a simple query
    console.log('Testing connection...');
    let isConnected = false;
    try {
      const testResponse = await service.generateAnalyticsResponse(
        "Test connection",
        mockContext,
        []
      );
      isConnected = testResponse.answer.length > 0;
      console.log('Connection test:', isConnected ? 'PASSED' : 'FAILED');
    } catch (error) {
      console.log('Connection test: FAILED -', error);
    }
    
    if (!isConnected) {
      console.log('Skipping further tests due to connection failure');
      return;
    }
    
    // Test analytics response generation
    console.log('Testing analytics response generation...');
    const response = await service.generateAnalyticsResponse(
      'Which brand is performing better and why?',
      mockContext,
      mockConversationHistory
    );
    
    console.log('Response received:');
    console.log('Answer:', response.answer);
    console.log('Insights:', response.insights);
    console.log('Recommendations:', response.recommendations);
    console.log('Data References:', response.dataReferences);
    console.log('Confidence:', response.confidence);
    
    // Validate response structure
    const isValidResponse = 
      typeof response.answer === 'string' &&
      Array.isArray(response.insights) &&
      Array.isArray(response.recommendations) &&
      Array.isArray(response.dataReferences) &&
      typeof response.confidence === 'number' &&
      response.confidence >= 0 && response.confidence <= 1;
    
    console.log('Response validation:', isValidResponse ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Export for potential use in other test files
export { testAnalyticsGeminiService, mockContext, mockConversationHistory };

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAnalyticsGeminiService();
}