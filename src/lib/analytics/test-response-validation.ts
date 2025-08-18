// Manual test script for AnalyticsResponseValidator
// Run with: npx tsx src/lib/analytics/test-response-validation.ts

import { AnalyticsResponseValidator, AnalyticsResponseSchema } from './AnalyticsResponseValidator';
import type { AnalyticsContext, RawAIResponse } from '../../types/chat';

async function runValidationTests() {
  console.log('🧪 Testing Analytics Response Validation\n');

  const validator = new AnalyticsResponseValidator();
  const schema = new AnalyticsResponseSchema();

  // Mock context for testing
  const mockContext: AnalyticsContext = {
    properties: [
      {
        propertyId: 'prop1',
        displayName: 'Brand A',
        metrics: { activeUsers: 1000, sessions: 1500 },
        trends: { activeUsers: 'up' }
      },
      {
        propertyId: 'prop2',
        displayName: 'Brand B',
        metrics: { activeUsers: 800, sessions: 1200 },
        trends: { activeUsers: 'down' }
      }
    ],
    dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
    metrics: [
      {
        name: 'activeUsers',
        total: 1800,
        average: 900,
        trend: 'up',
        topPerformers: []
      }
    ],
    aggregatedData: {
      totalUsers: 1800,
      totalSessions: 2700,
      totalPageViews: 5400,
      averageBounceRate: 45.0,
      averageSessionDuration: 180
    },
    trends: [],
    comparisons: []
  };

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Well-structured response
  console.log('Test 1: Well-structured response parsing');
  totalTests++;
  try {
    const rawResponse: RawAIResponse = {
      text: `Brand A is performing significantly better with 1,000 users and 1,500 sessions.

Insight: Brand A shows strong growth in user engagement
Insight: Sessions are trending upward by 15%

Recommendation: Focus marketing efforts on Brand A's successful strategies
Recommendation: Consider expanding Brand A's reach to new markets`
    };

    const result = await validator.validateAndFormatResponse(rawResponse, mockContext, 'test query');

    const checks = [
      result.answer.includes('Brand A is performing significantly better'),
      result.insights.length === 2,
      result.recommendations.length === 2,
      result.confidence > 0.5,
      result.dataReferences.length >= 1
    ];

    const passed = checks.every(check => check);
    console.log(`   ${passed ? '✅' : '❌'} Structured parsing: ${checks.filter(Boolean).length}/${checks.length} checks passed`);
    if (passed) testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 2: Implicit insights extraction
  console.log('\nTest 2: Implicit insights extraction');
  totalTests++;
  try {
    const rawResponse: RawAIResponse = {
      text: 'Brand A shows a 20% increase in users. The performance trend is positive. Revenue has grown substantially this month.'
    };

    const result = await validator.validateAndFormatResponse(rawResponse, mockContext, 'test query');

    const hasImplicitInsights = result.insights.length > 0;
    const hasIncreaseInsight = result.insights.some(insight => insight.includes('increase') || insight.includes('growth'));

    console.log(`   ${hasImplicitInsights && hasIncreaseInsight ? '✅' : '❌'} Implicit insights: ${result.insights.length} insights found`);
    if (hasImplicitInsights && hasIncreaseInsight) testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 3: Confidence scoring
  console.log('\nTest 3: Confidence scoring');
  totalTests++;
  try {
    const highConfidenceResponse: RawAIResponse = {
      text: 'The data clearly shows significant growth. Brand A definitely outperforms Brand B with strong user engagement.'
    };

    const lowConfidenceResponse: RawAIResponse = {
      text: 'The data might suggest possible growth. Brand A possibly performs better, but this is uncertain.'
    };

    const highResult = await validator.validateAndFormatResponse(highConfidenceResponse, mockContext, 'test');
    const lowResult = await validator.validateAndFormatResponse(lowConfidenceResponse, mockContext, 'test');

    const confidenceWorking = highResult.confidence > lowResult.confidence;
    console.log(`   ${confidenceWorking ? '✅' : '❌'} Confidence scoring: High (${(highResult.confidence * 100).toFixed(1)}%) > Low (${(lowResult.confidence * 100).toFixed(1)}%)`);
    if (confidenceWorking) testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 4: Data reference extraction
  console.log('\nTest 4: Data reference extraction');
  totalTests++;
  try {
    const rawResponse: RawAIResponse = {
      text: 'Brand A has 1,000 users and Brand B has 800 users. Total revenue is $50,000.'
    };

    const result = await validator.validateAndFormatResponse(rawResponse, mockContext, 'test query');

    const hasDataRefs = result.dataReferences.length >= 2;
    const hasBrandARef = result.dataReferences.some(ref => ref.propertyName === 'Brand A' && ref.value === 1000);
    const hasRevenueRef = result.dataReferences.some(ref => ref.value === 50000);

    console.log(`   ${hasDataRefs && hasBrandARef ? '✅' : '❌'} Data references: ${result.dataReferences.length} references found`);
    if (hasDataRefs && hasBrandARef) testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 5: Schema validation
  console.log('\nTest 5: Schema validation');
  totalTests++;
  try {
    const validResponse = {
      answer: 'Test answer',
      insights: ['Insight 1', 'Insight 2'],
      recommendations: ['Rec 1', 'Rec 2'],
      dataReferences: [
        {
          propertyId: 'prop1',
          propertyName: 'Brand A',
          metric: 'users',
          value: 1000,
          dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
          source: 'google_analytics'
        }
      ],
      confidence: 0.8
    };

    const result = schema.safeParse(validResponse);
    console.log(`   ${result.success ? '✅' : '❌'} Schema validation: ${result.success ? 'Valid' : result.error}`);
    if (result.success) testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 6: Error handling
  console.log('\nTest 6: Error handling');
  totalTests++;
  try {
    const emptyResponse: RawAIResponse = { text: '' };
    
    try {
      await validator.validateAndFormatResponse(emptyResponse, mockContext, 'test query');
      console.log('   ❌ Error handling: Should have thrown error for empty response');
    } catch (error) {
      console.log('   ✅ Error handling: Correctly caught validation error');
      testsPassed++;
    }
  } catch (error) {
    console.log(`   ❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Summary
  console.log(`\n📊 Test Results: ${testsPassed}/${totalTests} tests passed`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! Response validation is working correctly.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run the tests
runValidationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });