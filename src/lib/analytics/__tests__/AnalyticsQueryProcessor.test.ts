// Unit tests for AnalyticsQueryProcessor

import { AnalyticsQueryProcessor } from '../AnalyticsQueryProcessor';
import type { AnalyticsContext, ProcessedQuery } from '~/types/chat';

describe('AnalyticsQueryProcessor', () => {
  let processor: AnalyticsQueryProcessor;
  let mockContext: AnalyticsContext;

  beforeEach(() => {
    processor = new AnalyticsQueryProcessor();
    mockContext = {
      properties: [
        {
          propertyId: 'test-property-1',
          displayName: 'Test Brand 1',
          metrics: { users: 1000, sessions: 1500 },
          trends: { users: 'up', sessions: 'stable' }
        }
      ],
      dateRange: { startDate: '7daysAgo', endDate: 'today' },
      metrics: [],
      aggregatedData: {
        totalUsers: 1000,
        totalSessions: 1500,
        totalPageViews: 3000,
        averageBounceRate: 0.4,
        averageSessionDuration: 120
      },
      trends: [],
      comparisons: []
    };
  });

  describe('processQuery', () => {
    it('should identify performance queries', async () => {
      const query = 'How are my brands performing?';
      const result = await processor.processQuery(query, mockContext, []);
      
      expect(result.intent).toBe('performance_overview');
      expect(result.entities.metrics).toContain('users');
      expect(result.entities.metrics).toContain('sessions');
    });

    it('should extract time references', async () => {
      const query = 'Show me data from last week';
      const result = await processor.processQuery(query, mockContext, []);
      
      expect(result.entities.timeReferences).toContain('last week');
    });

    it('should identify specific brands', async () => {
      const query = 'How is Test Brand 1 doing?';
      const result = await processor.processQuery(query, mockContext, []);
      
      expect(result.entities.brands).toContain('Test Brand 1');
    });
  });
});