// Real-time Analytics Data Synchronization Service
// Handles data caching, synchronization, and real-time updates for the chat interface

import { googleAnalyticsService } from "~/lib/google-analytics";
import type { AnalyticsProperty, AnalyticsData } from "~/types/analytics";
import type { DateRange } from "~/types/chat";

// Cache entry interface
interface CacheEntry {
  data: AnalyticsData;
  timestamp: number;
  propertyId: string;
  dateRange: DateRange;
  hash: string;
}

// Sync status interface
interface SyncStatus {
  propertyId: string;
  lastSync: number;
  status: 'syncing' | 'success' | 'error';
  error?: string;
}

// Event listener interface for real-time updates
interface DataUpdateListener {
  (propertyId: string, data: AnalyticsData, dateRange: DateRange): void;
}

export class AnalyticsDataSync {
  private cache = new Map<string, CacheEntry>();
  private syncStatus = new Map<string, SyncStatus>();
  private listeners = new Set<DataUpdateListener>();
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  
  // Configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes for auto-sync
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly BATCH_SIZE = 5; // Max concurrent requests

  /**
   * Get analytics data with caching and real-time sync
   */
  async getAnalyticsData(
    accessToken: string,
    propertyId: string,
    dateRange: DateRange,
    forceRefresh = false
  ): Promise<AnalyticsData> {
    const cacheKey = this.generateCacheKey(propertyId, dateRange);
    const cached = this.cache.get(cacheKey);

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    // Update sync status
    this.updateSyncStatus(propertyId, 'syncing');

    try {
      // Fetch fresh data
      const data = await googleAnalyticsService.getAnalyticsData(
        accessToken,
        propertyId,
        dateRange.startDate,
        dateRange.endDate
      );

      // Cache the data
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
        propertyId,
        dateRange,
        hash: this.generateDataHash(data)
      };

      this.setCache(cacheKey, cacheEntry);
      this.updateSyncStatus(propertyId, 'success');

      // Notify listeners of data update
      this.notifyListeners(propertyId, data, dateRange);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateSyncStatus(propertyId, 'error', errorMessage);
      
      // Return cached data if available, even if stale
      if (cached) {
        console.warn(`Using stale cache for ${propertyId} due to fetch error:`, errorMessage);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Batch fetch analytics data for multiple properties
   */
  async batchGetAnalyticsData(
    accessToken: string,
    properties: AnalyticsProperty[],
    dateRange: DateRange,
    forceRefresh = false
  ): Promise<Record<string, AnalyticsData>> {
    const results: Record<string, AnalyticsData> = {};
    const batches = this.createBatches(properties, this.BATCH_SIZE);

    for (const batch of batches) {
      const promises = batch.map(async (property) => {
        try {
          const data = await this.getAnalyticsData(
            accessToken,
            property.propertyId,
            dateRange,
            forceRefresh
          );
          results[property.propertyId] = data;
        } catch (error) {
          console.warn(`Failed to fetch data for property ${property.propertyId}:`, error);
          // Continue with other properties
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Start automatic synchronization for properties
   */
  startAutoSync(
    accessToken: string,
    properties: AnalyticsProperty[],
    dateRange: DateRange
  ): void {
    // Clear existing intervals
    this.stopAutoSync();

    // Set up sync intervals for each property
    properties.forEach(property => {
      const interval = setInterval(async () => {
        try {
          await this.getAnalyticsData(accessToken, property.propertyId, dateRange, true);
        } catch (error) {
          console.warn(`Auto-sync failed for property ${property.propertyId}:`, error);
        }
      }, this.SYNC_INTERVAL);

      this.syncIntervals.set(property.propertyId, interval);
    });
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
  }

  /**
   * Add listener for data updates
   */
  addUpdateListener(listener: DataUpdateListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for data updates
   */
  removeUpdateListener(listener: DataUpdateListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get sync status for properties
   */
  getSyncStatus(propertyIds?: string[]): Record<string, SyncStatus> {
    const result: Record<string, SyncStatus> = {};
    
    if (propertyIds) {
      propertyIds.forEach(id => {
        const status = this.syncStatus.get(id);
        if (status) {
          result[id] = status;
        }
      });
    } else {
      this.syncStatus.forEach((status, id) => {
        result[id] = status;
      });
    }
    
    return result;
  }

  /**
   * Clear cache for specific properties or all
   */
  clearCache(propertyIds?: string[]): void {
    if (propertyIds) {
      propertyIds.forEach(propertyId => {
        const keysToDelete = Array.from(this.cache.keys()).filter(key => 
          key.includes(propertyId)
        );
        keysToDelete.forEach(key => this.cache.delete(key));
      });
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Check if data has changed since last fetch
   */
  async hasDataChanged(
    accessToken: string,
    propertyId: string,
    dateRange: DateRange
  ): Promise<boolean> {
    const cacheKey = this.generateCacheKey(propertyId, dateRange);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return true;

    try {
      const freshData = await googleAnalyticsService.getAnalyticsData(
        accessToken,
        propertyId,
        dateRange.startDate,
        dateRange.endDate
      );
      
      const freshHash = this.generateDataHash(freshData);
      return freshHash !== cached.hash;
    } catch (error) {
      console.warn(`Failed to check data changes for ${propertyId}:`, error);
      return false; // Assume no change if we can't fetch
    }
  }

  // Private helper methods

  private generateCacheKey(propertyId: string, dateRange: DateRange): string {
    return `${propertyId}_${dateRange.startDate}_${dateRange.endDate}`;
  }

  private generateDataHash(data: AnalyticsData): string {
    // Simple hash based on row count and first/last row values
    if (!data.rows || data.rows.length === 0) return 'empty';
    
    const firstRow = data.rows[0];
    const lastRow = data.rows[data.rows.length - 1];
    const rowCount = data.rows.length;
    
    const hashInput = `${rowCount}_${JSON.stringify(firstRow)}_${JSON.stringify(lastRow)}`;
    return Buffer.from(hashInput).toString('base64').slice(0, 16);
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  private setCache(key: string, entry: CacheEntry): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, entry);
  }

  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  private updateSyncStatus(propertyId: string, status: SyncStatus['status'], error?: string): void {
    this.syncStatus.set(propertyId, {
      propertyId,
      lastSync: Date.now(),
      status,
      error
    });
  }

  private notifyListeners(propertyId: string, data: AnalyticsData, dateRange: DateRange): void {
    this.listeners.forEach(listener => {
      try {
        listener(propertyId, data, dateRange);
      } catch (error) {
        console.warn('Error in data update listener:', error);
      }
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Cleanup method to be called when shutting down
   */
  cleanup(): void {
    this.stopAutoSync();
    this.listeners.clear();
    this.cache.clear();
    this.syncStatus.clear();
  }
}

// Singleton instance for global use
export const analyticsDataSync = new AnalyticsDataSync();