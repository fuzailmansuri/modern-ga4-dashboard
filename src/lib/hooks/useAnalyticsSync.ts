// React hook for real-time analytics data synchronization

import { useState, useEffect, useRef, useMemo } from "react";
import type { DateRange } from "~/types/chat";

// Event types from SSE
interface DataUpdateEvent {
  propertyId: string;
  dateRange: DateRange;
  timestamp: string;
  rowCount: number;
  hasData: boolean;
}

interface HeartbeatEvent {
  timestamp: string;
  syncStatus: Record<string, any>;
  cacheStats: {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  };
}

interface SyncState {
  connected: boolean;
  lastUpdate: string | null;
  syncStatus: Record<string, any>;
  cacheStats: any;
  error: string | null;
}

interface UseAnalyticsSyncOptions {
  propertyIds?: string[];
  dateRange?: DateRange;
  autoConnect?: boolean;
  onDataUpdate?: (event: DataUpdateEvent) => void;
  onError?: (error: string) => void;
}

export function useAnalyticsSync(options: UseAnalyticsSyncOptions = {}) {
  const {
    propertyIds = [],
    dateRange = { startDate: "7daysAgo", endDate: "today" },
    autoConnect = true,
    onDataUpdate,
    onError
  } = options;

  const [state, setState] = useState<SyncState>({
    connected: false,
    lastUpdate: null,
    syncStatus: {},
    cacheStats: null,
    error: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Store callbacks in refs to avoid recreating functions
  const onDataUpdateRef = useRef(onDataUpdate);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  onDataUpdateRef.current = onDataUpdate;
  onErrorRef.current = onError;

  // Memoize URL to avoid recreating connection
  const sseUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (propertyIds.length > 0) {
      params.set("propertyIds", propertyIds.join(","));
    }
    params.set("startDate", dateRange.startDate);
    params.set("endDate", dateRange.endDate);
    return `/api/analytics/events?${params.toString()}`;
  }, [propertyIds, dateRange]);

  // Cleanup function
  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Connection management effect
  useEffect(() => {
    if (!autoConnect) return;

    // Cleanup existing connection
    cleanup();
    reconnectAttempts.current = 0;

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState(prev => ({
        ...prev,
        connected: true,
        error: null
      }));
      reconnectAttempts.current = 0;
    };

    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        connected: true,
        lastUpdate: data.timestamp,
        error: null
      }));
    });

    eventSource.addEventListener("dataUpdate", (event) => {
      const data: DataUpdateEvent = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        lastUpdate: data.timestamp
      }));
      
      if (onDataUpdateRef.current) {
        onDataUpdateRef.current(data);
      }
    });

    eventSource.addEventListener("heartbeat", (event) => {
      const data: HeartbeatEvent = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        lastUpdate: data.timestamp,
        syncStatus: data.syncStatus,
        cacheStats: data.cacheStats
      }));
    });

    eventSource.onerror = () => {
      const errorMessage = "Connection to analytics sync service failed";
      setState(prev => ({
        ...prev,
        connected: false,
        error: errorMessage
      }));

      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }

      // Attempt reconnection with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          // Trigger re-render to restart connection
          setState(prev => ({ ...prev }));
        }, delay);
      }
    };

    return cleanup;
  }, [sseUrl, autoConnect]);

  // Manual connection functions
  const connect = () => {
    setState(prev => ({ ...prev })); // Trigger effect
  };

  const disconnect = () => {
    cleanup();
    setState(prev => ({
      ...prev,
      connected: false
    }));
  };

  // API functions with stable references
  const triggerSync = async (forceRefresh = false) => {
    try {
      const response = await fetch("/api/analytics/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyIds: propertyIds.length > 0 ? propertyIds : undefined,
          dateRange,
          forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }
      
      throw error;
    }
  };

  const getSyncStatus = async () => {
    try {
      const params = new URLSearchParams();
      if (propertyIds.length > 0) {
        params.set("propertyIds", propertyIds.join(","));
      }

      const response = await fetch(`/api/analytics/sync?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const result = await response.json();
      setState(prev => ({
        ...prev,
        syncStatus: result.syncStatus,
        cacheStats: result.cacheStats
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Status check failed";
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }
      
      throw error;
    }
  };

  const clearCache = async () => {
    try {
      const params = new URLSearchParams();
      if (propertyIds.length > 0) {
        params.set("propertyIds", propertyIds.join(","));
      }

      const response = await fetch(`/api/analytics/sync?${params.toString()}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Cache clear failed";
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }
      
      throw error;
    }
  };

  return {
    ...state,
    connect,
    disconnect,
    triggerSync,
    getSyncStatus,
    clearCache,
    isReconnecting: reconnectAttempts.current > 0 && reconnectAttempts.current < maxReconnectAttempts
  };
}