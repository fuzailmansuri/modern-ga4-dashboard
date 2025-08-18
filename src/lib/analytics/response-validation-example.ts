// Example usage of Analytics Response Validation and Formatting
// Demonstrates how to use the AnalyticsResponseValidator and AnalyticsGeminiService

import { AnalyticsGeminiService } from './AnalyticsGeminiService';
import { AnalyticsResponseValidator, AnalyticsResponseSchema } from './AnalyticsResponseValidator';
import type { AnalyticsContext, ChatMessage } from '../../types/chat';

// Example: Complete analytics response processing workflow
export async function demonstrateResponseValidation() {
  console.log('🔍 Analytics Response Validation and Formatting Demo\n');

  // 1. Set up the services
  const geminiService = new AnalyticsGeminiService();
  const validator = new AnalyticsResponseValidator();
  const schema = new AnalyticsResponseSchema();

  // 2. Create mock analytics context
  const mockContext: AnalyticsContext = {
    properties: [
      {
        propertyId: 'GA_PROPERTY_123',
        displayName: 'E-commerce Store',
        metrics: {
          activeUsers: 15420,
          sessions: 23150,
          pageViews: 89340,
          bounceRate: 42.3,
          revenue: 125000
        },
        trends: {
          activeUsers: 'up',
          sessions: 'up',
          revenue: 'up',
          bounceRate: 'down'
        }
      },
      {
        propertyId: 'GA_PROPERTY_456',
        displayName: 'Blog Site',
        metrics: {
          activeUsers: 8930,
          sessions: 12450,
          pageViews: 45670,
          bounceRate: 38.7
        },
        trends: {
          activeUsers: 'stable',
          sessions: 'up',
          bounceRate: 'stable'
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
        total: 24350,
        average: 12175,
        trend: 'up',
        topPerformers: []
      },
      {
        name: 'revenue',
        total: 125000,
        average: 62500,
        trend: 'up',
        topPerformers: []
      }
    ],
    aggregatedData: {
      totalUsers: 24350,
      totalSessions: 35600,
      totalPageViews: 135010,
      averageBounceRate: 40.5,
      averageSessionDuration: 195,
      totalRevenue: 125000,
      conversionRate: 3.51
    },
    trends: [
      {
        metric: 'activeUsers',
        direction: 'up',
        changePercent: 15.2,
        significance: 'high',
        description: 'Strong user growth across both properties'
      },
      {
        metric: 'revenue',
        direction: 'up',
        changePercent: 23.8,
        significance: 'high',
        description: 'Significant revenue increase driven by e-commerce performance'
      }
    ],
    comparisons: [
      {
        type: 'property',
        items: [
          { name: 'E-commerce Store', value: 15420, rank: 1 },
          { name: 'Blog Site', value: 8930, rank: 2 }
        ],
        winner: 'E-commerce Store',
        insights: ['E-commerce store drives 63% of total users']
      }
    ]
  };

  // 3. Example conversation history
  const conversationHistory: ChatMessage[] = [
    {
      id: '1',
      type: 'user',
      content: 'How is our overall performance this month?',
      timestamp: new Date('2024-01-31T10:00:00Z')
    },
    {
      id: '2',
      type: 'assistant',
      content: 'Your overall performance this month has been excellent with strong growth across key metrics.',
      timestamp: new Date('2024-01-31T10:00:30Z')
    }
  ];

  try {
    // 4. Demonstrate service health check
    console.log('1. Checking service health...');
    const healthStatus = await geminiService.getHealthStatus();
    console.log(`   Status: ${healthStatus.status}`);
    console.log(`   Details: ${healthStatus.details}\n`);

    // 5. Generate and validate analytics response
    console.log('2. Generating analytics response...');
    const query = 'Which property is performing better and what should we focus on?';
    
    try {
      const response = await geminiService.generateAnalyticsResponse(
        query,
        mockContext,
        conversationHistory
      );

      console.log('   ✅ Response generated successfully\n');

      // 6. Display formatted response
      console.log('3. Formatted Response:');
      console.log(`   Answer: ${response.answer}\n`);
      
      console.log(`   Insights (${response.insights.length}):`);
      response.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight}`);
      });
      console.log('');

      console.log(`   Recommendations (${response.recommendations.length}):`);
      response.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log('');

      console.log(`   Confidence Score: ${(response.confidence * 100).toFixed(1)}%\n`);

      console.log(`   Data References (${response.dataReferences.length}):`);
      response.dataReferences.forEach((ref, index) => {
        console.log(`   ${index + 1}. ${ref.propertyName}: ${ref.metric} = ${ref.value.toLocaleString()}`);
      });
      console.log('');

      // 7. Validate response schema
      console.log('4. Schema Validation:');
      const validationResult = schema.safeParse(response);
      if (validationResult.success) {
        console.log('   ✅ Response schema is valid\n');
      } else {
        console.log(`   ❌ Schema validation failed: ${validationResult.error}\n`);
      }

      // 8. Demonstrate direct validator usage
      console.log('5. Direct Validator Usage:');
      const rawResponse = {
        text: `The E-commerce Store is clearly outperforming the Blog Site with 15,420 users compared to 8,930 users.

Insight: E-commerce Store generates 63% of total traffic
Insight: Revenue growth of 23.8% indicates strong monetization
Insight: Blog Site shows stable engagement with room for growth

Recommendation: Invest more marketing budget in E-commerce Store expansion
Recommendation: Optimize Blog Site content to improve user acquisition
Recommendation: Consider cross-promotion between properties`
      };

      const directValidation = await validator.validateAndFormatResponse(
        rawResponse,
        mockContext,
        'Direct validation test'
      );

      console.log(`   ✅ Direct validation successful`);
      console.log(`   Confidence: ${(directValidation.confidence * 100).toFixed(1)}%`);
      console.log(`   Insights extracted: ${directValidation.insights.length}`);
      console.log(`   Recommendations extracted: ${directValidation.recommendations.length}`);
      console.log(`   Data references found: ${directValidation.dataReferences.length}\n`);

    } catch (error) {
      console.error('   ❌ Error generating response:', error);
    }

    // 9. Demonstrate error handling
    console.log('6. Error Handling Demo:');
    try {
      const invalidResponse = {
        text: '' // Empty response to trigger validation error
      };
      
      await validator.validateAndFormatResponse(invalidResponse, mockContext, 'error test');
    } catch (error) {
      console.log('   ✅ Error handling working correctly');
      console.log(`   Error type: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    }

    console.log('🎉 Analytics Response Validation Demo Complete!');
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Example: Testing different response formats
export function demonstrateResponseParsing() {
  console.log('📝 Response Parsing Examples\n');

  const validator = new AnalyticsResponseValidator();
  const mockContext: AnalyticsContext = {
    properties: [
      {
        propertyId: 'test',
        displayName: 'Test Property',
        metrics: { users: 1000 },
        trends: { users: 'up' }
      }
    ],
    dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
    metrics: [],
    aggregatedData: {
      totalUsers: 1000,
      totalSessions: 1500,
      totalPageViews: 3000,
      averageBounceRate: 45,
      averageSessionDuration: 180
    },
    trends: [],
    comparisons: []
  };

  const testCases = [
    {
      name: 'Structured Response with Markers',
      text: `Your website had 1,000 users this month, showing strong performance.

Insight: User growth is trending upward
Insight: Engagement metrics are above average

Recommendation: Continue current marketing strategy
Recommendation: Focus on user retention programs`
    },
    {
      name: 'Unstructured Response (Implicit Parsing)',
      text: 'The data shows a significant increase in user engagement. Performance trends are positive with substantial growth. You should consider expanding your marketing efforts and optimizing conversion rates.'
    },
    {
      name: 'Response with Confidence Keywords',
      text: 'The data clearly indicates strong performance. Users have definitely increased, and the trend is significantly positive. This suggests excellent growth potential.'
    },
    {
      name: 'Response with Low Confidence',
      text: 'The data might suggest some improvement. Users possibly increased, but this is uncertain. The trend is unclear and might need more analysis.'
    }
  ];

  testCases.forEach(async (testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}:`);
    try {
      const result = await validator.validateAndFormatResponse(
        { text: testCase.text },
        mockContext,
        'test query'
      );

      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Insights: ${result.insights.length}`);
      console.log(`   Recommendations: ${result.recommendations.length}`);
      console.log(`   Data References: ${result.dataReferences.length}\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    }
  });
}

// Export for use in other files
export { AnalyticsGeminiService, AnalyticsResponseValidator, AnalyticsResponseSchema };