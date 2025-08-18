// Property filtering and management service for analytics data

import type { AnalyticsProperty } from "~/types/analytics";

export interface PropertyFilter {
  id: string;
  name: string;
  displayName: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  isActive: boolean;
  lastAccessed?: Date;
  organicTrafficThreshold?: number; // Minimum organic traffic to include
}

export interface FilterCriteria {
  priorities?: ('high' | 'medium' | 'low')[];
  tags?: string[];
  activeOnly?: boolean;
  limit?: number;
  sortBy?: 'priority' | 'name' | 'lastAccessed' | 'traffic';
  searchQuery?: string;
}

export class PropertyFilterService {
  private filters: Map<string, PropertyFilter> = new Map();
  private readonly STORAGE_KEY = 'analytics_property_filters';

  constructor() {
    this.loadFilters();
  }

  /**
   * Load filters from localStorage
   */
  private loadFilters(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.filters = new Map(Object.entries(data).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            lastAccessed: value.lastAccessed ? new Date(value.lastAccessed) : undefined
          }
        ]));
      }
    } catch (error) {
      console.warn('Failed to load property filters:', error);
    }
  }

  /**
   * Save filters to localStorage
   */
  private saveFilters(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Object.fromEntries(this.filters.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save property filters:', error);
    }
  }

  /**
   * Add or update a property filter
   */
  setPropertyFilter(propertyId: string, filter: Partial<PropertyFilter>): void {
    const existing = this.filters.get(propertyId);
    const updated: PropertyFilter = {
      id: propertyId,
      name: filter.name || existing?.name || propertyId,
      displayName: filter.displayName || existing?.displayName || propertyId,
      priority: filter.priority || existing?.priority || 'medium',
      tags: filter.tags || existing?.tags || [],
      isActive: filter.isActive !== undefined ? filter.isActive : existing?.isActive !== false,
      lastAccessed: filter.lastAccessed || existing?.lastAccessed,
      organicTrafficThreshold: filter.organicTrafficThreshold || existing?.organicTrafficThreshold
    };
    
    this.filters.set(propertyId, updated);
    this.saveFilters();
  }

  /**
   * Get property filter
   */
  getPropertyFilter(propertyId: string): PropertyFilter | undefined {
    return this.filters.get(propertyId);
  }

  /**
   * Filter properties based on criteria
   */
  filterProperties(properties: AnalyticsProperty[], criteria: FilterCriteria = {}): AnalyticsProperty[] {
    let filtered = properties.filter(property => {
      const filter = this.filters.get(property.propertyId);
      
      // If no filter exists, include only if not filtering by activeOnly
      if (!filter) {
        return !criteria.activeOnly;
      }

      // Check active status
      if (criteria.activeOnly && !filter.isActive) {
        return false;
      }

      // Check priorities
      if (criteria.priorities && criteria.priorities.length > 0) {
        if (!criteria.priorities.includes(filter.priority)) {
          return false;
        }
      }

      // Check tags
      if (criteria.tags && criteria.tags.length > 0) {
        const hasMatchingTag = criteria.tags.some(tag => filter.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Check search query
      if (criteria.searchQuery) {
        const query = criteria.searchQuery.toLowerCase();
        const matchesName = filter.name.toLowerCase().includes(query);
        const matchesDisplayName = filter.displayName.toLowerCase().includes(query);
        const matchesTags = filter.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesName && !matchesDisplayName && !matchesTags) {
          return false;
        }
      }

      return true;
    });

    // Sort results
    if (criteria.sortBy) {
      filtered.sort((a, b) => {
        const filterA = this.filters.get(a.propertyId);
        const filterB = this.filters.get(b.propertyId);

        switch (criteria.sortBy) {
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[filterB?.priority || 'medium'] || 0) - (priorityOrder[filterA?.priority || 'medium'] || 0);
          
          case 'name':
            return (filterA?.displayName || a.displayName).localeCompare(filterB?.displayName || b.displayName);
          
          case 'lastAccessed':
            const timeA = filterA?.lastAccessed?.getTime() || 0;
            const timeB = filterB?.lastAccessed?.getTime() || 0;
            return timeB - timeA;
          
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (criteria.limit && criteria.limit > 0) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  /**
   * Mark property as accessed (for sorting by last accessed)
   */
  markPropertyAccessed(propertyId: string): void {
    const filter = this.filters.get(propertyId);
    if (filter) {
      filter.lastAccessed = new Date();
      this.filters.set(propertyId, filter);
      this.saveFilters();
    }
  }

  /**
   * Bulk import properties with default settings
   */
  bulkImportProperties(properties: AnalyticsProperty[], defaultSettings: Partial<PropertyFilter> = {}): void {
    properties.forEach(property => {
      if (!this.filters.has(property.propertyId)) {
        this.setPropertyFilter(property.propertyId, {
          name: property.name,
          displayName: property.displayName,
          priority: 'medium',
          isActive: true,
          tags: [],
          ...defaultSettings
        });
      }
    });
  }

  /**
   * Get quick filter presets
   */
  getQuickFilters(): Record<string, FilterCriteria> {
    return {
      favorites: {
        priorities: ['high'],
        activeOnly: true,
        limit: 10,
        sortBy: 'priority'
      },
      recent: {
        activeOnly: true,
        limit: 15,
        sortBy: 'lastAccessed'
      },
      highPriority: {
        priorities: ['high', 'medium'],
        activeOnly: true,
        limit: 20,
        sortBy: 'priority'
      },
      all: {
        sortBy: 'name'
      }
    };
  }

  /**
   * Export filters for backup
   */
  exportFilters(): string {
    return JSON.stringify(Object.fromEntries(this.filters.entries()), null, 2);
  }

  /**
   * Import filters from backup
   */
  importFilters(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.filters = new Map(
        Object.entries(parsed).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            lastAccessed: value.lastAccessed ? new Date(value.lastAccessed) : undefined,
          },
        ])
      );
      this.saveFilters();
    } catch (error) {
      throw new Error('Invalid filter data format');
    }
  }

  /**
   * Get statistics about current filters
   */
  getFilterStats(): {
    total: number;
    active: number;
    byPriority: { high: number; medium: number; low: number };
    byTags: Record<string, number>;
  } {
    const stats: {
      total: number;
      active: number;
      byPriority: { high: number; medium: number; low: number };
      byTags: Record<string, number>;
    } = {
      total: this.filters.size,
      active: 0,
      byPriority: { high: 0, medium: 0, low: 0 },
      byTags: {},
    };

    this.filters.forEach((filter) => {
      if (filter.isActive) stats.active++;
      stats.byPriority[filter.priority]++;

      filter.tags.forEach((tag) => {
        stats.byTags[tag] = (stats.byTags[tag] || 0) + 1;
      });
    });

    return stats;
  }
}

// Singleton instance
export const propertyFilterService = new PropertyFilterService();