"use client";

/**
 * PropertyFilterManager
 * UI to manage property filters, priorities and tags. Uses `propertyFilterService`.
 */
import React, { useState, useEffect } from 'react';
import { propertyFilterService } from '~/lib/analytics/PropertyFilterService';
import type { PropertyFilter, FilterCriteria } from '~/lib/analytics/PropertyFilterService';
import type { AnalyticsProperty } from '~/types/analytics';

interface PropertyFilterManagerProps {
  properties: AnalyticsProperty[];
  onFilterChange?: (filteredProperties: AnalyticsProperty[]) => void;
  className?: string;
}

export function PropertyFilterManager({ 
  properties, 
  onFilterChange, 
  className = "" 
}: PropertyFilterManagerProps) {
  const [filters, setFilters] = useState<Map<string, PropertyFilter>>(new Map());
  const [activeFilter, setActiveFilter] = useState<FilterCriteria>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, byPriority: { high: 0, medium: 0, low: 0 }, byTags: {} });

  // Load filters on mount
  useEffect(() => {
    loadFilters();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [activeFilter, searchQuery, properties]);

  const loadFilters = () => {
    // Bulk import properties if they don't exist
    propertyFilterService.bulkImportProperties(properties);
    
    // Load current filters
    const currentFilters = new Map();
    properties.forEach(prop => {
      const filter = propertyFilterService.getPropertyFilter(prop.propertyId);
      if (filter) {
        currentFilters.set(prop.propertyId, filter);
      }
    });
    
    setFilters(currentFilters);
    setStats(propertyFilterService.getFilterStats());
  };

  const applyFilters = () => {
    const criteria = { ...activeFilter, searchQuery: searchQuery || undefined };
    const filtered = propertyFilterService.filterProperties(properties, criteria);
    onFilterChange?.(filtered);
  };

  const updatePropertyFilter = (propertyId: string, updates: Partial<PropertyFilter>) => {
    propertyFilterService.setPropertyFilter(propertyId, updates);
    loadFilters();
  };

  const applyQuickFilter = (preset: string) => {
    const quickFilters = propertyFilterService.getQuickFilters();
    setActiveFilter(quickFilters[preset] || {});
  };

  const togglePropertyActive = (propertyId: string) => {
    const current = filters.get(propertyId);
    updatePropertyFilter(propertyId, { isActive: !current?.isActive });
  };

  const setPriority = (propertyId: string, priority: 'high' | 'medium' | 'low') => {
    updatePropertyFilter(propertyId, { priority });
  };

  const addTag = (propertyId: string, tag: string) => {
    const current = filters.get(propertyId);
    const currentTags = current?.tags || [];
    if (!currentTags.includes(tag)) {
      updatePropertyFilter(propertyId, { tags: [...currentTags, tag] });
    }
  };

  const removeTag = (propertyId: string, tag: string) => {
    const current = filters.get(propertyId);
    const currentTags = current?.tags || [];
    updatePropertyFilter(propertyId, { tags: currentTags.filter(t => t !== tag) });
  };

  const exportFilters = () => {
    const data = propertyFilterService.exportFilters();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property-filters.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFilters = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        propertyFilterService.importFilters(data);
        loadFilters();
        alert('Filters imported successfully!');
      } catch (error) {
        alert('Failed to import filters: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    reader.readAsText(file);
  };

  const filteredProperties = propertyFilterService.filterProperties(properties, {
    ...activeFilter,
    searchQuery: searchQuery || undefined
  });

  return (
    <div className={`property-filter-manager ${className}`}>
      {/* Quick Filters */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => applyQuickFilter('favorites')}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Favorites ({stats.byPriority.high})
          </button>
          <button
            onClick={() => applyQuickFilter('recent')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Recent
          </button>
          <button
            onClick={() => applyQuickFilter('highPriority')}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            High Priority ({stats.byPriority.high + stats.byPriority.medium})
          </button>
          <button
            onClick={() => setActiveFilter({})}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            All ({stats.total})
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-3">Filter Settings</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority Filter</label>
              <select
                onChange={(e) => {
                  const priorities = e.target.value ? [e.target.value as any] : undefined;
                  setActiveFilter(prev => ({ ...prev, priorities }));
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Max Properties</label>
              <input
                type="number"
                min="1"
                max="100"
                onChange={(e) => {
                  const limit = e.target.value ? parseInt(e.target.value) : undefined;
                  setActiveFilter(prev => ({ ...prev, limit }));
                }}
                className="w-full px-3 py-2 border rounded"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilter.activeOnly || false}
                onChange={(e) => setActiveFilter(prev => ({ ...prev, activeOnly: e.target.checked }))}
                className="mr-2"
              />
              Active Only
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={exportFilters} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              Export
            </button>
            <label className="px-3 py-1 bg-green-500 text-white rounded text-sm cursor-pointer">
              Import
              <input type="file" accept=".json" onChange={importFilters} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredProperties.length} of {properties.length} properties
        {activeFilter.limit && filteredProperties.length >= activeFilter.limit && (
          <span className="text-orange-600"> (limited to {activeFilter.limit})</span>
        )}
      </div>

      {/* Properties List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredProperties.map(property => {
          const filter = filters.get(property.propertyId);
          return (
            <div key={property.propertyId} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium">{property.displayName}</div>
                <div className="text-sm text-gray-500">{property.propertyId}</div>
                {filter?.tags && filter.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {filter.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded cursor-pointer"
                        onClick={() => removeTag(property.propertyId, tag)}
                        title="Click to remove"
                      >
                        {tag} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Priority Selector */}
                <select
                  value={filter?.priority || 'medium'}
                  onChange={(e) => setPriority(property.propertyId, e.target.value as any)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Active Toggle */}
                <button
                  onClick={() => togglePropertyActive(property.propertyId)}
                  className={`px-3 py-1 rounded text-sm ${
                    filter?.isActive !== false
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {filter?.isActive !== false ? 'Active' : 'Inactive'}
                </button>

                {/* Add Tag */}
                <button
                  onClick={() => {
                    const tag = prompt('Enter tag name:');
                    if (tag) addTag(property.propertyId, tag.trim());
                  }}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                  title="Add tag"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}