// Optimized Analytics Service with smart filtering and performance improvements

import { googleAnalyticsService } from "~/lib/google-analytics";
import { logger } from "~/lib/logger";
import { propertyFilterService } from "./PropertyFilterService";
import type { AnalyticsProperty, AnalyticsData } from "~/types/analytics";
import type { DateRange } from "~/types/chat";
import type { FilterCriteria } from "./PropertyFilterService";

export interface OptimizedFetchOptions {
  // Filtering options
  filterCriteria?: FilterCriteria;
  maxProperties?: number;
  organicOnly?: boolean;
  
  // Performance options
  concurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  
  // Caching options
  useCache?: boolean;
  cacheTimeout?: number;
  
  // Data options
  customMetrics?: string[];
  minTrafficThreshold?: number;
}

export interface PropertyPerformanceData {
  propertyId: string;
  displayName: string;
  data: AnalyticsData;
  fetchTime: number;
  organicUsers: number;
  organicSessions: number;
  isHighPerformer: boolean;
}

export interface BatchFetchResult {
  successful: PropertyPerformanceData[];
  failed: Array<{ propertyId: string; error: string }>;
  totalFetchTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export class OptimizedAnalyticsService {
  private cache = new Map<string, { data: AnalyticsData; timestamp: number; organicUsers: number }>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_CONCURRENCY = 3;
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly HIGH_PERFORMER_THRESHOLD = 1000; // Minimum organic users for high performer

  /**
   * Fetch analytics data with smart filtering and optimization
   */
  async fetchOptimizedAnalyticsData(
    accessToken: string,
    dateRange: DateRange,
    options: OptimizedFetchOptions = {}
  ): Promise<BatchFetchResult> {
    const startTime = Date.now();
    
    // Get all properties first
    const allProperties = await googleAnalyticsService.getProperties(accessToken);
    
    // Apply smart filtering
    const filteredProperties = this.applySmartFiltering(allProperties, options);
    
  logger.debug(`Filtered from ${allProperties.length} to ${filteredProperties.length} properties`);
    
    // Batch fetch with concurrency control
    const result = await this.batchFetchWithOptimization(
      accessToken,
      filteredProperties,
      dateRange,
      options
    );
    
    result.totalFetchTime = Date.now() - startTime;
    
    // Update property access times
    result.successful.forEach(item => {
      propertyFilterService.markPropertyAccessed(item.propertyId);
    });
    
    return result;
  }

  /**
   * Apply smart filtering to reduce the number of properties to fetch
   */
  private applySmartFiltering(
    properties: AnalyticsProperty[],
    options: OptimizedFetchOptions
  ): AnalyticsProperty[] {
    // Start with filter criteria if provided
    let filtered = options.filterCriteria 
      ? propertyFilterService.filterProperties(properties, options.filterCriteria)
      : properties;

    // If still too many, apply intelligent defaults
    if (filtered.length > (options.maxProperties || 20)) {
      // Try favorites first
      const favorites = propertyFilterService.filterProperties(properties, {
        priorities: ['high'],
        activeOnly: true,
        limit: options.maxProperties || 20,
        sortBy: 'priority'
      });
      
      if (favorites.length > 0) {
        filtered = favorites;
      } else {
        // Fall back to recent + high traffic properties
        filtered = propertyFilterService.filterProperties(properties, {
          activeOnly: true,
          limit: options.maxProperties || 20,
          sortBy: 'lastAccessed'
        });
      }
    }

    return filtered;
  }

  /**
   * Batch fetch with concurrency control and optimization
   */
  private async batchFetchWithOptimization(
    accessToken: string,
    properties: AnalyticsProperty[],
    dateRange: DateRange,
    options: OptimizedFetchOptions
  ): Promise<BatchFetchResult> {
    const concurrency = options.concurrency || this.DEFAULT_CONCURRENCY;
    const successful: PropertyPerformanceData[] = [];
    const failed: Array<{ propertyId: string; error: string }> = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // Process in batches
    for (let i = 0; i < properties.length; i += concurrency) {
      const batch = properties.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (property) => {
        try {
          const result = await this.fetchSinglePropertyOptimized(
            accessToken,
            property,
            dateRange,
            options
          );
          
          if (result.fromCache) {
            cacheHits++;
          } else {
            cacheMisses++;
          }
          
          // Apply traffic threshold filter
          if (options.minTrafficThreshold && result.data.organicUsers < options.minTrafficThreshold) {
            return null; // Skip low-traffic properties
          }
          
          successful.push(result.data);
          return result.data;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failed.push({ propertyId: property.propertyId, error: errorMessage });
          return null;
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + concurrency < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort by performance
    successful.sort((a, b) => b.organicUsers - a.organicUsers);

    return {
      successful,
      failed,
      totalFetchTime: 0, // Will be set by caller
      cacheHits,
      cacheMisses
    };
  }

  /**
   * Fetch single property with caching and optimization
   */
  private async fetchSinglePropertyOptimized(
    accessToken: string,
    property: AnalyticsProperty,
    dateRange: DateRange,
    options: OptimizedFetchOptions
  ): Promise<{ data: PropertyPerformanceData; fromCache: boolean }> {
    const cacheKey = `${property.propertyId}_${dateRange.startDate}_${dateRange.endDate}`;
    const cacheTimeout = options.cacheTimeout || this.DEFAULT_CACHE_TTL;
    
    // Check cache first
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        return {
          data: {
            propertyId: property.propertyId,
            displayName: property.displayName,
            data: cached.data,
            fetchTime: 0,
            organicUsers: cached.organicUsers,
            organicSessions: this.extractOrganicSessions(cached.data),
            isHighPerformer: cached.organicUsers >= this.HIGH_PERFORMER_THRESHOLD
          },
          fromCache: true
        };
      }
    }

    // Fetch fresh data
    const fetchStart = Date.now();
    
    // Use optimized metrics for organic traffic
    const organicMetrics = options.customMetrics || [
      "activeUsers",
      "sessions", 
      "screenPageViews",
      "bounceRate",
      "averageSessionDuration"
    ];

    const data = await googleAnalyticsService.getAnalyticsData(
      accessToken,
      property.propertyId,
      dateRange.startDate,
      dateRange.endDate,
      organicMetrics
    );

    const fetchTime = Date.now() - fetchStart;
    const organicUsers = this.extractOrganicUsers(data);
    const organicSessions = this.extractOrganicSessions(data);

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      organicUsers
    });

    // Clean old cache entries
    this.cleanCache();

    const result: PropertyPerformanceData = {
      propertyId: property.propertyId,
      displayName: property.displayName,
      data,
      fetchTime,
      organicUsers,
      organicSessions,
      isHighPerformer: organicUsers >= this.HIGH_PERFORMER_THRESHOLD
    };

    return { data: result, fromCache: false };
  }

  /**
   * Extract organic users from analytics data
   */
  private extractOrganicUsers(data: AnalyticsData): number {
    if (!data.totals || data.totals.length === 0) return 0;
    
    const total = data.totals[0];
    if (!total?.metricValues || total.metricValues.length === 0) return 0;
    
    // First metric is usually activeUsers
    return parseInt(total.metricValues[0]?.value || "0");
  }

  /**
   * Extract organic sessions from analytics data
   */
  private extractOrganicSessions(data: AnalyticsData): number {
    if (!data.totals || data.totals.length === 0) return 0;
    
    const total = data.totals[0];
    if (!total?.metricValues || total.metricValues.length < 2) return 0;
    
    // Second metric is usually sessions
    return parseInt(total.metricValues[1]?.value || "0");
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const maxAge = this.DEFAULT_CACHE_TTL * 2; // Keep entries for 2x TTL
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    hitRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get quick filter suggestions based on current data
   */
  getQuickFilterSuggestions(): Record<string, FilterCriteria> {
    const stats = propertyFilterService.getFilterStats();
    
    return {
      topPerformers: {
        priorities: ['high'],
        activeOnly: true,
        limit: 10,
        sortBy: 'priority'
      },
      recentlyUsed: {
        activeOnly: true,
        limit: 15,
        sortBy: 'lastAccessed'
      },
      favorites: {
        priorities: ['high', 'medium'],
        activeOnly: true,
        limit: Math.min(20, Math.floor(stats.active * 0.3)),
        sortBy: 'priority'
      }
    };
  }
}

// Singleton instance
export const optimizedAnalyticsService = new OptimizedAnalyticsService();