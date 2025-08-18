// Unit tests for AnalyticsContextManager

import { AnalyticsContextManager } from '../AnalyticsContextManager';
import type { AnalyticsProperty, AnalyticsData } from '~/types/analytics';

describe('AnalyticsContextManager', () => {
  let contextManager: AnalyticsContextManager;
  let mockProperties: AnalyticsProperty[];
  let mockAnalyticsData: Record<string, AnalyticsData>;

  beforeEach(() => {
    contextManager = new AnalyticsContextManager();
    
    mockProperties = [
      {
        propertyId: 'prop1',
        name: 'properties/prop1',
        displayName: 'Brand A',
        propertyType: 'GA4',
        createTime: '2023-01-01',
        updateTime: '2023-01-01',
        parent: 'accounts/123',
        timeZone: 'UTC',
        currencyCode: 'USD'
      }
    ];

    mockAnalyticsData = {
      prop1: {
        dimensionHeaders: [{ name: 'date' }],
        metricHeaders: [
          { name: 'activeUsers', type: 'TYPE_INTEGER' },
          { name: 'sessions', type: 'TYPE_INTEGER' }
        ],
        rows: [
          {
            dimensionValues: [{ value: '2023-01-01' }],
            metricValues: [{ value: '100' }, { value: '150' }]
          }
        ],
        totals: [
          {
            dimensionValues: [],
            metricValues: [{ value: '100' }, { value: '150' }]
          }
        ],
        maximums: [],
        minimums: [],
        rowCount: 1
      }
    };
  });

  describe('buildContext', () => {
    it('should build analytics context correctly', () => {
      const dateRange = { startDate: '7daysAgo', endDate: 'today' };
      const userQuery = 'How are my brands performing?';
      
      const context = contextManager.buildContext(
        mockProperties,
        mockAnalyticsData,
        dateRange,
        userQuery
      );
      
      expect(context.properties).toHaveLength(1);
      expect(context.properties[0].propertyId).toBe('prop1');
      expect(context.dateRange).toEqual(dateRange);
      expect(context.aggregatedData.totalUsers).toBe(100);
    });
  });
});