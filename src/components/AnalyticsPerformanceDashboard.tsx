"use client";

/**
 * AnalyticsPerformanceDashboard
 * Shows an overview of property performance using `optimizedAnalyticsService`.
 * Props: `accessToken`, `dateRange`, optional `className`.
 */
import React, { useState, useEffect } from 'react';
import { optimizedAnalyticsService } from '~/lib/analytics/OptimizedAnalyticsService';
import { propertyFilterService } from '~/lib/analytics/PropertyFilterService';
import type { PropertyPerformanceData, BatchFetchResult } from '~/lib/analytics/OptimizedAnalyticsService';
import type { DateRange } from '~/types/chat';

interface PerformanceDashboardProps {
  accessToken: string;
  dateRange: DateRange;
  className?: string;
}

export function AnalyticsPerformanceDashboard({ 
  accessToken, 
  dateRange, 
  className = "" 
}: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<BatchFetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('favorites');
  const [maxProperties, setMaxProperties] = useState(15);
  const [minTrafficThreshold, setMinTrafficThreshold] = useState(100);

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange, selectedPreset, maxProperties, minTrafficThreshold]);

  const fetchPerformanceData = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const filterCriteria = propertyFilterService.getQuickFilters()[selectedPreset];
      
      const result = await optimizedAnalyticsService.fetchOptimizedAnalyticsData(
        accessToken,
        dateRange,
        {
          filterCriteria,
          maxProperties,
          organicOnly: true,
          minTrafficThreshold,
          concurrency: 3,
          useCache: true
        }
      );
      
      setPerformanceData(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (ms: number): string => {
    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
    return ms + 'ms';
  };

  const getPerformanceColor = (data: PropertyPerformanceData): string => {
    if (data.isHighPerformer) return 'bg-green-100 border-green-300';
    if (data.organicUsers >= 500) return 'bg-yellow-100 border-yellow-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getPerformanceIcon = (data: PropertyPerformanceData): string => {
    if (data.isHighPerformer) return '🚀';
    if (data.organicUsers >= 500) return '📈';
    return '📊';
  };

  if (loading) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${className}`}>
      {/* Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h2 className="text-lg font-semibold mb-4">Analytics Performance Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Filter Preset</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="favorites">Favorites</option>
              <option value="recent">Recently Used</option>
              <option value="highPriority">High Priority</option>
              <option value="all">All Properties</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max Properties</label>
            <input
              type="number"
              min="5"
              max="50"
              value={maxProperties}
              onChange={(e) => setMaxProperties(parseInt(e.target.value) || 15)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Min Traffic</label>
            <input
              type="number"
              min="0"
              value={minTrafficThreshold}
              onChange={(e) => setMinTrafficThreshold(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Minimum organic users"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchPerformanceData}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {performanceData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded border">
              <div className="text-2xl font-bold text-green-600">
                {performanceData.successful.length}
              </div>
              <div className="text-sm text-gray-600">Properties Loaded</div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(performanceData.totalFetchTime)}
              </div>
              <div className="text-sm text-gray-600">Total Fetch Time</div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="text-2xl font-bold text-purple-600">
                {performanceData.cacheHits}
              </div>
              <div className="text-sm text-gray-600">Cache Hits</div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="text-2xl font-bold text-orange-600">
                {performanceData.failed.length}
              </div>
              <div className="text-sm text-gray-600">Failed Requests</div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="text-2xl font-bold text-indigo-600">
                {formatNumber(
                  performanceData.successful.reduce((sum, item) => sum + item.organicUsers, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Total Organic Users</div>
            </div>
          </div>

          {/* Performance List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Property Performance</h3>
            
            {performanceData.successful.map((item, index) => (
              <div
                key={item.propertyId}
                className={`p-4 rounded border-2 ${getPerformanceColor(item)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getPerformanceIcon(item)}</span>
                    <div>
                      <div className="font-semibold">{item.displayName}</div>
                      <div className="text-sm text-gray-600">#{index + 1} • {item.propertyId}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-6 text-right">
                    <div>
                      <div className="font-bold text-lg">{formatNumber(item.organicUsers)}</div>
                      <div className="text-sm text-gray-600">Organic Users</div>
                    </div>
                    
                    <div>
                      <div className="font-bold text-lg">{formatNumber(item.organicSessions)}</div>
                      <div className="text-sm text-gray-600">Sessions</div>
                    </div>
                    
                    <div>
                      <div className="font-bold text-lg">{formatTime(item.fetchTime)}</div>
                      <div className="text-sm text-gray-600">Fetch Time</div>
                    </div>
                    
                    <div>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        item.isHighPerformer 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {item.isHighPerformer ? 'High Performer' : 'Standard'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Failed Requests */}
          {performanceData.failed.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-red-600 mb-3">Failed Requests</h3>
              <div className="space-y-2">
                {performanceData.failed.map((failure, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-medium">{failure.propertyId}</div>
                    <div className="text-sm text-red-600">{failure.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cache Stats */}
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Cache Performance</h3>
            <div className="text-sm text-gray-700">
              Cache hit rate: {performanceData.cacheHits + performanceData.cacheMisses > 0 
                ? Math.round((performanceData.cacheHits / (performanceData.cacheHits + performanceData.cacheMisses)) * 100)
                : 0}% 
              ({performanceData.cacheHits} hits, {performanceData.cacheMisses} misses)
            </div>
          </div>
        </>
      )}
    </div>
  );
}