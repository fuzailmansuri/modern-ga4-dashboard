"use client";

/**
 * AnalyticsChatInterface
 * Renders the chat UI for asking questions about analytics data.
 * Props: `properties`, `currentDateRange`, `analyticsData`, `isVisible`, `onToggle`.
 * Keep presentation-only; delegate data fetching to API routes/services.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import type { AnalyticsProperty, AnalyticsData } from "~/types/analytics";
import type { AnalyticsResponse } from "~/types/chat";

// Chat message types
interface CacheStatusSummary {
  status: "fresh" | "stale" | "error" | "missing";
  lastSync?: string;
  message?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  structuredResponse?: AnalyticsResponse;
  warnings?: string[];
  cacheStatus?: Record<string, CacheStatusSummary>;
}

interface AnalyticsChatInterfaceProps {
  properties: AnalyticsProperty[];
  currentDateRange: { startDate: string; endDate: string };
  analyticsData: Record<string, AnalyticsData>;
  isVisible: boolean;
  onToggle: () => void;
}

export function AnalyticsChatInterface({
  properties,
  currentDateRange,
  analyticsData,
  isVisible,
  onToggle,
}: AnalyticsChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [lastError, setLastError] = useState<string | null>(null);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [cacheStatus, setCacheStatus] = useState<Record<string, CacheStatusSummary> | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastContextRef = useRef<string>("");
  const propertyNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    properties.forEach(property => {
      map.set(property.propertyId, property.displayName);
    });
    return map;
  }, [properties]);

  const cacheSummary = useMemo(() => {
    if (!cacheStatus) return null;
    const summary = { fresh: 0, stale: 0, error: 0, missing: 0 } as Record<CacheStatusSummary["status"], number>;
    Object.values(cacheStatus).forEach(status => {
      summary[status.status] += 1;
    });
    return summary;
  }, [cacheStatus]);

  const cacheSummaryText = useMemo(() => {
    if (!cacheSummary) return null;
    const parts = Object.entries(cacheSummary)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${count} ${status}`);
    return parts.length > 0 ? parts.join(', ') : 'no cached data';
  }, [cacheSummary]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Track context changes (simplified - no automatic messages to avoid loops)
  useEffect(() => {
    const contextKey = `${properties.length}-${currentDateRange.startDate}-${currentDateRange.endDate}-${Object.keys(analyticsData).length}`;
    lastContextRef.current = contextKey;
  }, [properties, currentDateRange, analyticsData]);

  // Handle escape key to close chat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onToggle();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onToggle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLastError(null);
    setIsLoading(true);
    setWarningMessages([]);
    setCacheStatus(null);

    try {
      // Call the analytics chat API with context
      const response = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          propertyIds: properties.map(p => p.propertyId),
          dateRange: currentDateRange,
          conversationHistory: messages.slice(-5).map(message => ({
            id: message.id,
            type: message.type,
            content: message.structuredResponse ? message.structuredResponse.answer : message.content,
            timestamp: message.timestamp,
            dataReferences: message.structuredResponse?.dataReferences,
          })),
          sessionId: sessionId,
          filterPreset: 'favorites', // Use optimized filtering
          maxProperties: 15,
          organicOnly: true,
          minTrafficThreshold: 100
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        // Handle API-level errors
        setLastError(data.error || 'Request failed');
        setWarningMessages(data.response?.warnings || []);
        setCacheStatus(data.response?.cacheStatus || null);

        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.error || "I couldn't process your request. Please try again.",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const structuredResponse: AnalyticsResponse | undefined = data.response
        ? {
            answer: data.response.answer,
            insights: data.response.insights || [],
            recommendations: data.response.recommendations || [],
            dataReferences: data.response.dataReferences || [],
            confidence: data.response.confidence ?? 0,
          }
        : undefined;

      setWarningMessages(data.response?.warnings || []);
      setCacheStatus(data.response?.cacheStatus || null);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response?.answer || "I couldn't process your request. Please try again.",
        timestamp: new Date(),
        structuredResponse,
        warnings: data.response?.warnings,
        cacheStatus: data.response?.cacheStatus,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      // Enhanced error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      // Log error for debugging (kept minimal to avoid leaking sensitive info)
      // eslint-disable-next-line no-console
      console.error('Error processing query:', error);

      setLastError(errorMessage);
      setWarningMessages([]);
      setCacheStatus(null);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Open analytics chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-96 bg-card rounded-lg shadow-2xl border border-border flex flex-col max-h-[80vh] sm:max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="font-semibold">Analytics Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1 rounded"
              aria-label="Clear chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={onToggle}
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1 rounded"
            aria-label="Close chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] sm:min-h-[300px] max-h-[50vh] sm:max-h-[400px]">
        {warningMessages.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div>
                <div className="font-semibold">Data Warnings</div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {warningMessages.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Ask me anything about your analytics data!</p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Try: "How are my top brands performing?" or "Show me conversion trends"
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {message.type === 'assistant' && message.structuredResponse ? (
                  <div className="space-y-3">
                    <div className="whitespace-pre-wrap text-foreground dark:text-foreground">
                      {message.structuredResponse.answer}
                    </div>

                    {typeof message.structuredResponse.confidence === 'number' && (
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(message.structuredResponse.confidence * 100)}%
                      </div>
                    )}

                    {message.structuredResponse.insights.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key insights</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {message.structuredResponse.insights.map((insight, index) => (
                            <li key={`insight-${index}`} className="leading-relaxed">
                              • {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.structuredResponse.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended actions</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {message.structuredResponse.recommendations.map((recommendation, index) => (
                            <li key={`rec-${index}`} className="leading-relaxed">
                              • {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.structuredResponse.dataReferences.length > 0 && (
                      <div className="rounded-md border border-border/60 bg-background/60 p-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data references</p>
                        <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                          {message.structuredResponse.dataReferences.map((reference, index) => (
                            <li key={`data-ref-${index}`}>
                              <div className="font-medium text-foreground">
                                {propertyNameLookup.get(reference.propertyId) || reference.propertyId}
                              </div>
                              <div className="text-muted-foreground">
                                {reference.metric ? `${reference.metric}: ` : ''}{reference.value}
                              </div>
                              <div className="text-muted-foreground/70 text-[11px]">
                                {reference.dateRange.startDate} → {reference.dateRange.endDate}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.warnings && message.warnings.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
                        <p className="font-semibold uppercase tracking-wide">Warnings</p>
                        <ul className="mt-1 space-y-1">
                          {message.warnings.map((warning, index) => (
                            <li key={`warning-${index}`}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.cacheStatus && Object.keys(message.cacheStatus).length > 0 && (
                      <div className="rounded-md border border-border/70 bg-background/80 p-2 text-xs text-muted-foreground">
                        <p className="font-semibold uppercase tracking-wide">Cache status</p>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(message.cacheStatus).map(([propertyId, status]) => {
                            const label = propertyNameLookup.get(propertyId) || propertyId;
                            const statusLabel =
                              status.status === 'fresh'
                                ? 'Fresh'
                                : status.status === 'stale'
                                  ? 'Stale'
                                  : status.status === 'error'
                                    ? 'Error'
                                    : 'Missing';
                            const lastSync = status.lastSync ? new Date(status.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                            return (
                              <li key={`cache-${propertyId}`} className="leading-relaxed">
                                <span className="font-medium text-foreground">{label}</span>: {statusLabel}
                                {lastSync && <span className="text-muted-foreground/70"> · {lastSync}</span>}
                                {status.message && (
                                  <div className="text-muted-foreground/70 text-[11px]">{status.message}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                <p className={`text-xs mt-3 ${
                  message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Simple Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-muted-foreground">Analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        {/* Simple Error Display */}
        {lastError && (
          <div className="flex justify-start">
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-destructive max-w-[80%]">
              <div className="flex items-start gap-2">
                <span>❌</span>
                <div>
                  <div className="font-medium">Error</div>
                  <div>{lastError}</div>
                  <button
                    onClick={() => setLastError(null)}
                    className="mt-2 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 rounded text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your analytics data..."
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </span>
            )}
          </button>
        </form>
        
        {/* Simple Context indicator */}
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Connected to {properties.length} properties</span>
            <span>{currentDateRange.startDate} to {currentDateRange.endDate}</span>
          </div>
          
          {/* Loading status */}
          {isLoading && (
            <div className="text-primary flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
              Processing your request...
            </div>
          )}
          
          {/* Data status */}
          {Object.keys(analyticsData).length > 0 && !isLoading && (
            <div className="text-green-600 dark:text-green-400">
              ✓ Analytics data loaded for {Object.keys(analyticsData).length} properties
            </div>
          )}

          {cacheSummaryText && (
            <div className="text-xs text-muted-foreground">
              Cache freshness: {cacheSummaryText}
            </div>
          )}

          {/* Conversation status */}
          {messages.length > 0 && (
            <div className="text-primary">
              💬 Conversation memory active ({messages.length} messages)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}