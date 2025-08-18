// Analytics Context Manager - Aggregates and formats analytics data for AI consumption

import type { 
  AnalyticsProperty, 
  AnalyticsData, 
  AnalyticsRow 
} from "~/types/analytics";
import type {
  AnalyticsContext,
  ContextManager,
  PropertySummary,
  MetricSummary,
  AggregatedMetrics,
  TrendAnalysis,
  ComparisonData,
  ComparisonItem,
  DateRange,
  TrendDirection
} from "~/types/chat";

export class AnalyticsContextManager implements ContextManager {
  
  /**
   * Builds comprehensive analytics context for AI consumption
   */
  buildContext(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>,
    dateRange: DateRange,
    userQuery: string
  ): AnalyticsContext {
    const propertySummaries = this.buildPropertySummaries(properties, analyticsData);
    const aggregatedData = this.aggregateMetrics(analyticsData);
    const metricSummaries = this.buildMetricSummaries(analyticsData, propertySummaries);
    const trends = this.calculateTrends(analyticsData);
    const comparisons = this.generateComparisons(properties, analyticsData);

    return {
      properties: propertySummaries,
      dateRange,
      metrics: metricSummaries,
      aggregatedData,
      trends,
      comparisons
    };
  }

  /**
   * Aggregates metrics across all properties
   */
  aggregateMetrics(analyticsData: Record<string, AnalyticsData>): AggregatedMetrics {
    let totalUsers = 0;
    let totalSessions = 0;
    let totalPageViews = 0;
    let totalBounceRate = 0;
    let totalSessionDuration = 0;
    let totalRevenue = 0;
    let propertyCount = 0;

    for (const [propertyId, data] of Object.entries(analyticsData)) {
      if (!data.totals || data.totals.length === 0) continue;
      
      propertyCount++;
      const totalsRow = data.totals[0];
      const metricHeaders = data.metricHeaders;

      // Extract metrics based on header names
      metricHeaders.forEach((header, index) => {
        const value = parseFloat(totalsRow?.metricValues[index]?.value || '0');
        
        switch (header.name) {
          case 'activeUsers':
          case 'totalUsers':
            totalUsers += value;
            break;
          case 'sessions':
            totalSessions += value;
            break;
          case 'screenPageViews':
          case 'pageViews':
            totalPageViews += value;
            break;
          case 'bounceRate':
            totalBounceRate += value;
            break;
          case 'averageSessionDuration':
            totalSessionDuration += value;
            break;
          case 'transactionRevenue':
          case 'totalRevenue':
            totalRevenue += value;
            break;
        }
      });
    }

    return {
      totalUsers,
      totalSessions,
      totalPageViews,
      averageBounceRate: propertyCount > 0 ? totalBounceRate / propertyCount : 0,
      averageSessionDuration: propertyCount > 0 ? totalSessionDuration / propertyCount : 0,
      totalRevenue: totalRevenue > 0 ? totalRevenue : undefined,
      conversionRate: totalSessions > 0 ? (totalRevenue / totalSessions) * 100 : undefined
    };
  }

  /**
   * Calculates trends for metrics (simplified version without historical data)
   */
  calculateTrends(
    currentData: Record<string, AnalyticsData>,
    previousData?: Record<string, AnalyticsData>
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    
    // If no previous data, analyze current data patterns
    if (!previousData) {
      return this.analyzePatternsFromCurrentData(currentData);
    }

    // Compare current vs previous data
    const currentMetrics = this.aggregateMetrics(currentData);
    const previousMetrics = this.aggregateMetrics(previousData);

    const metricComparisons = [
      { name: 'Users', current: currentMetrics.totalUsers, previous: previousMetrics.totalUsers },
      { name: 'Sessions', current: currentMetrics.totalSessions, previous: previousMetrics.totalSessions },
      { name: 'Page Views', current: currentMetrics.totalPageViews, previous: previousMetrics.totalPageViews },
      { name: 'Bounce Rate', current: currentMetrics.averageBounceRate, previous: previousMetrics.averageBounceRate },
      { name: 'Session Duration', current: currentMetrics.averageSessionDuration, previous: previousMetrics.averageSessionDuration }
    ];

    metricComparisons.forEach(({ name, current, previous }) => {
      if (previous === 0) return;
      
      const changePercent = ((current - previous) / previous) * 100;
      const direction: TrendDirection = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';
      const significance = Math.abs(changePercent) > 20 ? 'high' : Math.abs(changePercent) > 10 ? 'medium' : 'low';
      
      trends.push({
        metric: name,
        direction,
        changePercent: Math.abs(changePercent),
        significance,
        description: this.generateTrendDescription(name, direction, changePercent)
      });
    });

    return trends;
  }

  /**
   * Generates comparisons between properties
   */
  generateComparisons(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>
  ): ComparisonData[] {
    const comparisons: ComparisonData[] = [];

    // Property performance comparison
    const propertyComparison = this.compareProperties(properties, analyticsData);
    if (propertyComparison.items.length > 1) {
      comparisons.push(propertyComparison);
    }

    // Metric comparison across properties
    const metricComparison = this.compareMetricsAcrossProperties(analyticsData);
    if (metricComparison.items.length > 0) {
      comparisons.push(metricComparison);
    }

    return comparisons;
  }

  /**
   * Builds property summaries with key metrics and trends
   */
  private buildPropertySummaries(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>
  ): PropertySummary[] {
    return properties.map(property => {
      const data = analyticsData[property.propertyId];
      const metrics = this.extractPropertyMetrics(data);
      const trends = this.calculatePropertyTrends(data);

      return {
        propertyId: property.propertyId,
        displayName: property.displayName,
        metrics,
        trends
      };
    });
  }

  /**
   * Builds metric summaries across all properties
   */
  private buildMetricSummaries(
    analyticsData: Record<string, AnalyticsData>,
    propertySummaries: PropertySummary[]
  ): MetricSummary[] {
    const metricNames = new Set<string>();
    
    // Collect all unique metric names
    Object.values(analyticsData).forEach(data => {
      data.metricHeaders.forEach(header => {
        metricNames.add(header.name);
      });
    });

    return Array.from(metricNames).map(metricName => {
      const values: number[] = [];
      const propertyValues: { property: PropertySummary; value: number }[] = [];

      propertySummaries.forEach(property => {
        const value = property.metrics[metricName];
        if (value !== undefined) {
          values.push(value);
          propertyValues.push({ property, value });
        }
      });

      const total = values.reduce((sum, val) => sum + val, 0);
      const average = values.length > 0 ? total / values.length : 0;
      
      // Sort to find top performers
      propertyValues.sort((a, b) => b.value - a.value);
      const topPerformers = propertyValues.slice(0, 3).map(pv => pv.property);

      // Simple trend calculation based on variance
      const variance = this.calculateVariance(values);
      const trend: TrendDirection = variance > average * 0.2 ? 'up' : variance < average * 0.1 ? 'down' : 'stable';

      return {
        name: metricName,
        total,
        average,
        trend,
        topPerformers
      };
    });
  }

  /**
   * Extracts metrics from property data
   */
  private extractPropertyMetrics(data: AnalyticsData | undefined): Record<string, number> {
    if (!data || !data.totals || data.totals.length === 0) {
      return {};
    }

    const metrics: Record<string, number> = {};
    const totalsRow = data.totals[0];

    data.metricHeaders.forEach((header, index) => {
      const value = parseFloat(totalsRow?.metricValues[index]?.value || '0');
      metrics[header.name] = value;
    });

    return metrics;
  }

  /**
   * Calculates trends for a single property
   */
  private calculatePropertyTrends(data: AnalyticsData | undefined): Record<string, TrendDirection> {
    if (!data || !data.rows || data.rows.length < 2) {
      return {};
    }

    const trends: Record<string, TrendDirection> = {};
    
    data.metricHeaders.forEach((header, metricIndex) => {
      const values = data.rows.map(row => 
        parseFloat(row.metricValues[metricIndex]?.value || '0')
      );

      // Simple trend analysis: compare first half vs second half
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint);
      const secondHalf = values.slice(midPoint);

      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

      const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
      
      trends[header.name] = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';
    });

    return trends;
  }

  /**
   * Analyzes patterns from current data when no historical data is available
   */
  private analyzePatternsFromCurrentData(analyticsData: Record<string, AnalyticsData>): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const aggregated = this.aggregateMetrics(analyticsData);

    // Analyze based on typical benchmarks
    const benchmarks = {
      bounceRate: { good: 40, poor: 70 },
      sessionDuration: { good: 180, poor: 60 }, // seconds
      conversionRate: { good: 2, poor: 0.5 } // percentage
    };

    if (aggregated.averageBounceRate > 0) {
      const bounceRateStatus = aggregated.averageBounceRate < benchmarks.bounceRate.good ? 'up' : 
                              aggregated.averageBounceRate > benchmarks.bounceRate.poor ? 'down' : 'stable';
      trends.push({
        metric: 'Bounce Rate',
        direction: bounceRateStatus,
        changePercent: 0,
        significance: 'medium',
        description: `Bounce rate is ${aggregated.averageBounceRate.toFixed(1)}% - ${bounceRateStatus === 'up' ? 'performing well' : bounceRateStatus === 'down' ? 'needs improvement' : 'average performance'}`
      });
    }

    return trends;
  }

  /**
   * Compares properties by overall performance
   */
  private compareProperties(
    properties: AnalyticsProperty[],
    analyticsData: Record<string, AnalyticsData>
  ): ComparisonData {
    const items: ComparisonItem[] = [];

    properties.forEach(property => {
      const data = analyticsData[property.propertyId];
      if (!data || !data.totals || data.totals.length === 0) return;

      // Calculate a composite score based on key metrics
      const metrics = this.extractPropertyMetrics(data);
      const score = (metrics.activeUsers || 0) + 
                   (metrics.sessions || 0) * 0.8 + 
                   (metrics.screenPageViews || 0) * 0.3;

      items.push({
        name: property.displayName,
        value: score,
        rank: 0 // Will be set after sorting
      });
    });

    // Sort and assign ranks
    items.sort((a, b) => b.value - a.value);
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      type: 'property',
      items,
      winner: items.length > 0 ? items[0]?.name : undefined,
      insights: this.generatePropertyInsights(items)
    };
  }

  /**
   * Compares metrics across properties
   */
  private compareMetricsAcrossProperties(analyticsData: Record<string, AnalyticsData>): ComparisonData {
    const aggregated = this.aggregateMetrics(analyticsData);
    const items: ComparisonItem[] = [
      { name: 'Total Users', value: aggregated.totalUsers },
      { name: 'Total Sessions', value: aggregated.totalSessions },
      { name: 'Total Page Views', value: aggregated.totalPageViews },
      { name: 'Average Bounce Rate', value: aggregated.averageBounceRate },
      { name: 'Average Session Duration', value: aggregated.averageSessionDuration }
    ];

    return {
      type: 'metric',
      items,
      insights: this.generateMetricInsights(items)
    };
  }

  /**
   * Generates trend description
   */
  private generateTrendDescription(metric: string, direction: TrendDirection, changePercent: number): string {
    const change = Math.abs(changePercent).toFixed(1);
    const directionText = direction === 'up' ? 'increased' : direction === 'down' ? 'decreased' : 'remained stable';
    
    if (direction === 'stable') {
      return `${metric} has ${directionText} with minimal change`;
    }
    
    return `${metric} has ${directionText} by ${change}%`;
  }

  /**
   * Generates insights for property comparison
   */
  private generatePropertyInsights(items: ComparisonItem[]): string[] {
    const insights: string[] = [];
    
    if (items.length === 0) return insights;

    const topProperty = items[0];
    const bottomProperty = items[items.length - 1];
    
    if (topProperty) {
      insights.push(`${topProperty.name} is the top performing property`);
    }
    
    if (items.length > 1 && topProperty && bottomProperty) {
      const gap = topProperty.value - bottomProperty.value;
      const gapPercent = bottomProperty.value > 0 ? (gap / bottomProperty.value) * 100 : 0;
      
      if (gapPercent > 50) {
        insights.push(`There's a significant performance gap between top and bottom properties (${gapPercent.toFixed(0)}% difference)`);
      }
    }

    return insights;
  }

  /**
   * Generates insights for metric comparison
   */
  private generateMetricInsights(items: ComparisonItem[]): string[] {
    const insights: string[] = [];
    
    const users = items.find(item => item.name === 'Total Users')?.value || 0;
    const sessions = items.find(item => item.name === 'Total Sessions')?.value || 0;
    const pageViews = items.find(item => item.name === 'Total Page Views')?.value || 0;
    const bounceRate = items.find(item => item.name === 'Average Bounce Rate')?.value || 0;

    if (sessions > 0 && users > 0) {
      const sessionsPerUser = sessions / users;
      insights.push(`Average of ${sessionsPerUser.toFixed(1)} sessions per user`);
    }

    if (pageViews > 0 && sessions > 0) {
      const pageViewsPerSession = pageViews / sessions;
      insights.push(`Average of ${pageViewsPerSession.toFixed(1)} page views per session`);
    }

    if (bounceRate > 0) {
      if (bounceRate < 40) {
        insights.push('Bounce rate is excellent, indicating high user engagement');
      } else if (bounceRate > 70) {
        insights.push('Bounce rate is high, consider improving page content and user experience');
      }
    }

    return insights;
  }

  /**
   * Calculates variance for trend analysis
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
}