// Simple validation script to verify AnalyticsQueryProcessor functionality

import { AnalyticsQueryProcessor } from './AnalyticsQueryProcessor';

// Simple test function to validate the implementation
export function validateQueryProcessor(): boolean {
  const processor = new AnalyticsQueryProcessor();
  
  console.log('🔍 Validating AnalyticsQueryProcessor...\n');

  // Test 1: Intent extraction
  console.log('Test 1: Intent Extraction');
  const testQueries = [
    { query: 'How many users do we have?', expectedIntent: 'metric_inquiry' },
    { query: 'Compare Brand A vs Brand B', expectedIntent: 'brand_comparison' },
    { query: 'Which brand is best?', expectedIntent: 'performance_ranking' },
    { query: 'Show me trends', expectedIntent: 'trend_analysis' },
    { query: 'Last month data', expectedIntent: 'time_period_analysis' },
    { query: 'Tell me about performance', expectedIntent: 'general_insight' }
  ];

  let intentTestsPassed = 0;
  testQueries.forEach(({ query, expectedIntent }) => {
    const intent = processor.extractIntent(query);
    const passed = intent === expectedIntent;
    console.log(`  ${passed ? '✅' : '❌'} "${query}" -> ${intent} (expected: ${expectedIntent})`);
    if (passed) intentTestsPassed++;
  });

  console.log(`Intent tests: ${intentTestsPassed}/${testQueries.length} passed\n`);

  // Test 2: Entity extraction
  console.log('Test 2: Entity Extraction');
  const entityTests = [
    { query: 'How many users and sessions?', expectedMetrics: ['users', 'sessions'] },
    { query: 'Show me bounce rate', expectedMetrics: ['bounceRate'] },
    { query: 'Revenue and conversions', expectedMetrics: ['revenue', 'conversions'] },
    { query: 'Last week data', expectedTimeRefs: ['last_week'] },
    { query: 'Brand A vs Brand B', expectedComparison: 'vs' }
  ];

  let entityTestsPassed = 0;
  entityTests.forEach(({ query, expectedMetrics, expectedTimeRefs, expectedComparison }) => {
    const entities = processor.extractEntities(query);
    let passed = true;
    
    if (expectedMetrics) {
      const hasAllMetrics = expectedMetrics.every(metric => entities.metrics.includes(metric));
      if (!hasAllMetrics) passed = false;
    }
    
    if (expectedTimeRefs) {
      const hasAllTimeRefs = expectedTimeRefs.every(timeRef => entities.timeReferences.includes(timeRef));
      if (!hasAllTimeRefs) passed = false;
    }
    
    if (expectedComparison) {
      if (entities.comparisonType !== expectedComparison) passed = false;
    }
    
    console.log(`  ${passed ? '✅' : '❌'} "${query}" -> metrics: [${entities.metrics.join(', ')}], time: [${entities.timeReferences.join(', ')}], comparison: ${entities.comparisonType || 'none'}`);
    if (passed) entityTestsPassed++;
  });

  console.log(`Entity tests: ${entityTestsPassed}/${entityTests.length} passed\n`);

  // Test 3: Context prompt building
  console.log('Test 3: Context Prompt Building');
  const mockContext = {
    properties: [
      {
        propertyId: 'prop1',
        displayName: 'Test Brand',
        metrics: { activeUsers: 1000, sessions: 1500 },
        trends: { activeUsers: 'up' as const }
      }
    ],
    dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
    metrics: [],
    aggregatedData: {
      totalUsers: 1000,
      totalSessions: 1500,
      totalPageViews: 3000,
      averageBounceRate: 45.0,
      averageSessionDuration: 180
    },
    trends: [],
    comparisons: []
  };

  const prompt = processor.buildContextPrompt('Test query', mockContext, []);
  const hasRequiredSections = [
    'USER QUERY:',
    'ANALYTICS DATA CONTEXT:',
    'PROPERTIES:',
    'OVERALL METRICS:',
    'INSTRUCTIONS:'
  ].every(section => prompt.includes(section));

  console.log(`  ${hasRequiredSections ? '✅' : '❌'} Context prompt contains all required sections`);
  console.log(`  Prompt length: ${prompt.length} characters\n`);

  const totalTests = testQueries.length + entityTests.length + 1;
  const totalPassed = intentTestsPassed + entityTestsPassed + (hasRequiredSections ? 1 : 0);
  
  console.log(`🎯 Overall Results: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! AnalyticsQueryProcessor is working correctly.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Export the processor for use in other files
export { AnalyticsQueryProcessor };