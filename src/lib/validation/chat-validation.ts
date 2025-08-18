// Validation utilities for chat interface data integrity

import type { 
  ChatMessage, 
  AnalyticsContext, 
  DateRange, 
  PropertySummary, 
  MetricSummary, 
  AggregatedMetrics, 
  TrendAnalysis, 
  ComparisonData, 
  DataReference
} from "~/types/chat";

// Simple validation utility (Zod-like interface without external dependency)
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Date Range Validation
export function validateDateRange(dateRange: unknown): DateRange {
  if (!dateRange || typeof dateRange !== 'object') {
    throw new ValidationError('Date range must be an object');
  }
  
  const dr = dateRange as Record<string, unknown>;
  
  if (typeof dr.startDate !== 'string' || typeof dr.endDate !== 'string') {
    throw new ValidationError('Date range must have string startDate and endDate');
  }
  
  // Basic date format validation (YYYY-MM-DD or relative dates)
  const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d+daysAgo$|^today$|^yesterday$/;
  if (!datePattern.test(dr.startDate) || !datePattern.test(dr.endDate)) {
    throw new ValidationError('Invalid date format. Use YYYY-MM-DD or relative dates like "7daysAgo"');
  }
  
  return {
    startDate: dr.startDate,
    endDate: dr.endDate
  };
}

// Chat Message Validation
export function validateChatMessage(message: unknown): ChatMessage {
  if (!message || typeof message !== 'object') {
    throw new ValidationError('Chat message must be an object');
  }
  
  const msg = message as Record<string, unknown>;
  
  if (typeof msg.id !== 'string' || msg.id.length === 0) {
    throw new ValidationError('Chat message must have a non-empty string id');
  }
  
  if (msg.type !== 'user' && msg.type !== 'assistant') {
    throw new ValidationError('Chat message type must be "user" or "assistant"');
  }
  
  if (typeof msg.content !== 'string') {
    throw new ValidationError('Chat message content must be a string');
  }
  
  if (!(msg.timestamp instanceof Date)) {
    throw new ValidationError('Chat message timestamp must be a Date object');
  }
  
  return {
    id: msg.id,
    type: msg.type,
    content: msg.content,
    timestamp: msg.timestamp,
    context: msg.context as AnalyticsContext | undefined,
    dataReferences: msg.dataReferences as DataReference[] | undefined
  };
}

// Property Summary Validation
export function validatePropertySummary(summary: unknown): PropertySummary {
  if (!summary || typeof summary !== 'object') {
    throw new ValidationError('Property summary must be an object');
  }
  
  const ps = summary as Record<string, unknown>;
  
  if (typeof ps.propertyId !== 'string' || ps.propertyId.length === 0) {
    throw new ValidationError('Property summary must have a non-empty propertyId');
  }
  
  if (typeof ps.displayName !== 'string' || ps.displayName.length === 0) {
    throw new ValidationError('Property summary must have a non-empty displayName');
  }
  
  if (!ps.metrics || typeof ps.metrics !== 'object') {
    throw new ValidationError('Property summary must have a metrics object');
  }
  
  if (!ps.trends || typeof ps.trends !== 'object') {
    throw new ValidationError('Property summary must have a trends object');
  }
  
  return {
    propertyId: ps.propertyId,
    displayName: ps.displayName,
    metrics: ps.metrics as Record<string, number>,
    trends: ps.trends as Record<string, 'up' | 'down' | 'stable'>
  };
}

// Metric Summary Validation
export function validateMetricSummary(summary: unknown): MetricSummary {
  if (!summary || typeof summary !== 'object') {
    throw new ValidationError('Metric summary must be an object');
  }
  
  const ms = summary as Record<string, unknown>;
  
  if (typeof ms.name !== 'string' || ms.name.length === 0) {
    throw new ValidationError('Metric summary must have a non-empty name');
  }
  
  if (typeof ms.total !== 'number' || isNaN(ms.total)) {
    throw new ValidationError('Metric summary total must be a valid number');
  }
  
  if (typeof ms.average !== 'number' || isNaN(ms.average)) {
    throw new ValidationError('Metric summary average must be a valid number');
  }
  
  if (ms.trend !== 'up' && ms.trend !== 'down' && ms.trend !== 'stable') {
    throw new ValidationError('Metric summary trend must be "up", "down", or "stable"');
  }
  
  if (!Array.isArray(ms.topPerformers)) {
    throw new ValidationError('Metric summary topPerformers must be an array');
  }
  
  return {
    name: ms.name,
    total: ms.total,
    average: ms.average,
    trend: ms.trend,
    topPerformers: ms.topPerformers as PropertySummary[]
  };
}

// Aggregated Metrics Validation
export function validateAggregatedMetrics(metrics: unknown): AggregatedMetrics {
  if (!metrics || typeof metrics !== 'object') {
    throw new ValidationError('Aggregated metrics must be an object');
  }
  
  const am = metrics as Record<string, unknown>;
  
  const requiredNumbers = ['totalUsers', 'totalSessions', 'totalPageViews', 'averageBounceRate', 'averageSessionDuration'];
  
  for (const field of requiredNumbers) {
    if (typeof am[field] !== 'number' || isNaN(am[field] as number)) {
      throw new ValidationError(`Aggregated metrics ${field} must be a valid number`);
    }
  }
  
  // Optional fields
  if (am.totalRevenue !== undefined && (typeof am.totalRevenue !== 'number' || isNaN(am.totalRevenue))) {
    throw new ValidationError('Aggregated metrics totalRevenue must be a valid number if provided');
  }
  
  if (am.conversionRate !== undefined && (typeof am.conversionRate !== 'number' || isNaN(am.conversionRate))) {
    throw new ValidationError('Aggregated metrics conversionRate must be a valid number if provided');
  }
  
  return {
    totalUsers: am.totalUsers as number,
    totalSessions: am.totalSessions as number,
    totalPageViews: am.totalPageViews as number,
    averageBounceRate: am.averageBounceRate as number,
    averageSessionDuration: am.averageSessionDuration as number,
    totalRevenue: am.totalRevenue as number | undefined,
    conversionRate: am.conversionRate as number | undefined
  };
}

// Analytics Context Validation
export function validateAnalyticsContext(context: unknown): AnalyticsContext {
  if (!context || typeof context !== 'object') {
    throw new ValidationError('Analytics context must be an object');
  }
  
  const ac = context as Record<string, unknown>;
  
  if (!Array.isArray(ac.properties)) {
    throw new ValidationError('Analytics context properties must be an array');
  }
  
  if (!Array.isArray(ac.metrics)) {
    throw new ValidationError('Analytics context metrics must be an array');
  }
  
  if (!Array.isArray(ac.trends)) {
    throw new ValidationError('Analytics context trends must be an array');
  }
  
  if (!Array.isArray(ac.comparisons)) {
    throw new ValidationError('Analytics context comparisons must be an array');
  }
  
  const dateRange = validateDateRange(ac.dateRange);
  const aggregatedData = validateAggregatedMetrics(ac.aggregatedData);
  
  return {
    properties: ac.properties as PropertySummary[],
    dateRange,
    metrics: ac.metrics as MetricSummary[],
    aggregatedData,
    trends: ac.trends as TrendAnalysis[],
    comparisons: ac.comparisons as ComparisonData[]
  };
}

// Safe parsing functions
export function safeParseDateRange(data: unknown): { success: boolean; data?: DateRange; error?: string } {
  try {
    const result = validateDateRange(data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

export function safeParseChatMessage(data: unknown): { success: boolean; data?: ChatMessage; error?: string } {
  try {
    const result = validateChatMessage(data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

export function safeParseAnalyticsContext(data: unknown): { success: boolean; data?: AnalyticsContext; error?: string } {
  try {
    const result = validateAnalyticsContext(data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}