// Unit tests for OptimizedAnalyticsService

import { OptimizedAnalyticsService } from '../OptimizedAnalyticsService';
import { propertyFilterService } from '../PropertyFilterService';
import type { AnalyticsProperty } from '~/types/analytics';

// Mock the dependencies
jest.mock('../PropertyFilterService');
jest.mock('~/lib/google-analytics');

describe('OptimizedAnalyticsService', () => {
  let service: OptimizedAnalyticsService;
  let mockProperties: AnalyticsProperty[];

  beforeEach(() => {
    service = new OptimizedAnalyticsService();
    
    mockProperties = [
      {
        propertyId: 'prop1',
        name: 'properties/prop1',
        displayName: 'High Priority Brand',
        propertyType: 'GA4',
        createTime: '2023-01-01',
        updateTime: '2023-01-01',
        parent: 'accounts/123',
        timeZone: 'UTC',
        currencyCode: 'USD'
      },
      {
        propertyId: 'prop2',
        name: 'properties/prop2',
        displayName: 'Low Priority Brand',
        propertyType: 'GA4',
        createTime: '2023-01-01',
        updateTime: '2023-01-01',
        parent: 'accounts/123',
        timeZone: 'UTC',
        currencyCode: 'USD'
      }
    ];

    // Mock property filter service
    (propertyFilterService.filterProperties as jest.Mock).mockReturnValue(mockProperties.slice(0, 1));
    (propertyFilterService.getQuickFilters as jest.Mock).mockReturnValue({
      favorites: { priorities: ['high'], limit: 10 }
    });
  });

  describe('fetchOptimizedAnalyticsData', () => {
    it('should apply smart filtering', async () => {
      const mockAccessToken = 'test-token';
      const dateRange = { startDate: '7daysAgo', endDate: 'today' };
      
      // Mock the batch fetch to avoid actual API calls
      const mockBatchFetch = jest.spyOn(service as any, 'batchFetchWithOptimization')
        .mockResolvedValue({
          successful: [],
          failed: [],
          totalFetchTime: 0,
          cacheHits: 0,
          cacheMisses: 0
        });

      await service.fetchOptimizedAnalyticsData(mockAccessToken, dateRange, {
        filterCriteria: { priorities: ['high'] },
        maxProperties: 10
      });

      expect(propertyFilterService.filterProperties).toHaveBeenCalled();
      expect(mockBatchFetch).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
      expect(stats).toHaveProperty('hitRate');
    });
  });
});