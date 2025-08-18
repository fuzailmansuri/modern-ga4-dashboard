// Chat Interface Types for Analytics

import type { AnalyticsProperty, AnalyticsData } from "./analytics";

// Chat Message Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: AnalyticsContext;
  dataReferences?: DataReference[];
}

// Query Processing Types
export type QueryIntent =
  | 'metric_inquiry'
  | 'brand_comparison'
  | 'trend_analysis'
  | 'performance_ranking'
  | 'time_period_analysis'
  | 'general_insight';

export interface ExtractedEntities {
  brands: string[];
  metrics: string[];
  timeReferences: string[];
  comparisonType?: 'vs' | 'ranking' | 'trend';
}

export interface ProcessedQuery {
  intent: QueryIntent;
  entities: ExtractedEntities;
  relevantData: AnalyticsData[];
  contextPrompt: string;
}

// Analytics Context Types
export interface AnalyticsContext {
  properties: PropertySummary[];
  dateRange: DateRange;
  metrics: MetricSummary[];
  aggregatedData: AggregatedMetrics;
  trends: TrendAnalysis[];
  comparisons: ComparisonData[];
}

export interface PropertySummary {
  propertyId: string;
  displayName: string;
  metrics: Record<string, number>;
  trends: Record<string, TrendDirection>;
}

export interface MetricSummary {
  name: string;
  total: number;
  average: number;
  trend: TrendDirection;
  topPerformers: PropertySummary[];
}

export interface AggregatedMetrics {
  totalUsers: number;
  totalSessions: number;
  totalPageViews: number;
  averageBounceRate: number;
  averageSessionDuration: number;
  totalRevenue?: number;
  conversionRate?: number;
}

export interface TrendAnalysis {
  metric: string;
  direction: TrendDirection;
  changePercent: number;
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface ComparisonData {
  type: 'property' | 'time_period' | 'metric';
  items: ComparisonItem[];
  winner?: string;
  insights: string[];
}

export interface ComparisonItem {
  name: string;
  value: number;
  change?: number;
  rank?: number;
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface DateRange {
  startDate: string;
  endDate: string;
}

// AI Response Types
export interface RawAIResponse {
  text: string;
  metadata?: {
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export interface AnalyticsResponse {
  answer: string;
  insights: string[];
  recommendations: string[];
  dataReferences: DataReference[];
  confidence: number;
}

export interface DataReference {
  propertyId: string;
  propertyName: string;
  metric: string;
  value: number;
  dateRange: DateRange;
  source: 'google_analytics';
}

// Context Manager Interface
export interface ContextManager {
  buildContext(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>,
    dateRange: DateRange,
    userQuery: string
  ): AnalyticsContext;

  aggregateMetrics(
    analyticsData: Record<string, AnalyticsData>
  ): AggregatedMetrics;

  calculateTrends(
    currentData: Record<string, AnalyticsData>,
    previousData?: Record<string, AnalyticsData>
  ): TrendAnalysis[];

  generateComparisons(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>
  ): ComparisonData[];
}

// Query Processor Interface
export interface QueryProcessor {
  processQuery(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[]
  ): Promise<ProcessedQuery>;

  extractIntent(query: string): QueryIntent;
  extractEntities(query: string): ExtractedEntities;
  buildContextPrompt(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[]
  ): string;
}

// Analytics Gemini Service Interface
export interface AnalyticsGeminiService {
  generateAnalyticsResponse(
    query: string,
    context: AnalyticsContext,
    conversationHistory: ChatMessage[]
  ): Promise<AnalyticsResponse>;
}

// Validation Schemas (using Zod-like structure for type safety)
export interface ValidationSchema<T> {
  parse(data: unknown): T;
  safeParse(data: unknown): { success: boolean; data?: T; error?: string };
}

// Chat Interface Component Props
export interface AnalyticsChatInterfaceProps {
  properties: AnalyticsProperty[];
  currentDateRange: DateRange;
  analyticsData: Record<string, AnalyticsData>;
  isVisible: boolean;
  onToggle: () => void;
}

// Error Types
export interface ChatError {
  type: 'ai_service' | 'data_unavailable' | 'query_processing' | 'network' | 'validation';
  message: string;
  details?: string;
  retryable: boolean;
}