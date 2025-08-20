// Analytics Response Validation and Formatting
// Implements response parsing, data reference tracking, and confidence scoring

import type { 
  AnalyticsResponse, 
  DataReference, 
  AnalyticsContext,
  ChatError,
  ValidationSchema,
  RawAIResponse
} from "../../types/chat";

export interface ParsedResponseComponents {
  answer: string;
  insights: string[];
  recommendations: string[];
  dataReferences: DataReference[];
  confidence: number;
  errors: string[];
}

export class AnalyticsResponseValidator {
  private readonly CONFIDENCE_KEYWORDS = {
    high: ['definitely', 'clearly', 'significantly', 'strong', 'substantial', 'evident'],
    medium: ['likely', 'appears', 'suggests', 'indicates', 'seems', 'probably'],
    low: ['might', 'possibly', 'unclear', 'limited', 'insufficient', 'uncertain']
  };

  private readonly INSIGHT_MARKERS = [
    'insight:', 'key finding:', 'notable:', 'important:', 'trend:', 'pattern:'
  ];

  private readonly RECOMMENDATION_MARKERS = [
    'recommend:', 'recommendation:', 'suggestion:', 'consider:', 'should:', 'action:', 'next step:'
  ];

  /**
   * Validates and formats a raw AI response into a structured AnalyticsResponse
   */
  async validateAndFormatResponse(
    rawResponse: RawAIResponse,
    context: AnalyticsContext,
    _originalQuery: string
  ): Promise<AnalyticsResponse> {
    try {
      const parsed = this.parseResponseComponents(rawResponse.text);
      
      // Validate the parsed components
      const validationErrors = this.validateResponseComponents(parsed, context);
      
      if (validationErrors.length > 0) {
        console.warn('Response validation warnings:', validationErrors);
      }

      // Extract data references from the response
      const dataReferences = this.extractDataReferences(rawResponse.text, context);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(rawResponse.text, context, parsed);

      // Format the final response
      const formattedResponse: AnalyticsResponse = {
        answer: this.formatAnswer(parsed.answer),
        insights: this.formatInsights(parsed.insights),
        recommendations: this.formatRecommendations(parsed.recommendations),
        dataReferences: dataReferences,
        confidence: confidence
      };

      return formattedResponse;
    } catch (error) {
      throw this.createValidationError(
        'Failed to validate and format response',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Parses raw AI response text into structured components
   */
  private parseResponseComponents(responseText: string): ParsedResponseComponents {
    const lines = responseText.split('\n').map(line => line.trim()).filter(Boolean);
    
    const components: ParsedResponseComponents = {
      answer: '',
      insights: [],
      recommendations: [],
      dataReferences: [],
      confidence: 0,
      errors: []
    };

  let currentSection: 'answer' | 'insights' | 'recommendations' | null = 'answer';
  const answerLines: string[] = [];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check for explicit section markers first
      if (this.isInsightMarker(lowerLine)) {
        currentSection = 'insights';
        const insight = this.extractContentAfterMarker(line, this.INSIGHT_MARKERS);
        if (insight) components.insights.push(insight);
        continue;
      }

      if (this.isRecommendationMarker(lowerLine)) {
        currentSection = 'recommendations';
        const recommendation = this.extractContentAfterMarker(line, this.RECOMMENDATION_MARKERS);
        if (recommendation) components.recommendations.push(recommendation);
        continue;
      }

      // Add content to current section
      if (currentSection === 'answer') {
        answerLines.push(line);
      } else if (currentSection === 'insights') {
        // Don't add lines that start with recommendation markers
        if (!this.isRecommendationMarker(lowerLine)) {
          components.insights.push(line);
        } else {
          // Switch to recommendations section if we encounter a recommendation
          currentSection = 'recommendations';
          const recommendation = this.extractContentAfterMarker(line, this.RECOMMENDATION_MARKERS);
          if (recommendation) components.recommendations.push(recommendation);
        }
      } else if (currentSection === 'recommendations') {
        // Don't add lines that start with insight markers
        if (!this.isInsightMarker(lowerLine)) {
          components.recommendations.push(line);
        } else {
          // Switch to insights section if we encounter an insight
          currentSection = 'insights';
          const insight = this.extractContentAfterMarker(line, this.INSIGHT_MARKERS);
          if (insight) components.insights.push(insight);
        }
      }
    }

    components.answer = answerLines.join(' ').trim();

    // If no explicit insights/recommendations found, try to extract from answer
    if (components.insights.length === 0) {
      components.insights = this.extractImplicitInsights(components.answer);
    }

    if (components.recommendations.length === 0) {
      components.recommendations = this.extractImplicitRecommendations(components.answer);
    }

    return components;
  }

  /**
   * Validates parsed response components against context
   */
  private validateResponseComponents(
    parsed: ParsedResponseComponents,
    context: AnalyticsContext
  ): string[] {
    const errors: string[] = [];

    // Validate answer exists and is meaningful
    if (!parsed.answer || parsed.answer.length < 10) {
      errors.push('Response answer is too short or missing');
      // Throw error for critically short responses
      if (!parsed.answer || parsed.answer.length < 3) {
        // Throw a proper Error object to satisfy lint rule (@typescript-eslint/only-throw-error)
        throw new Error(JSON.stringify(this.createValidationError(
          'Response is too short or empty',
          `Answer length: ${parsed.answer?.length || 0} characters`
        )));
      }
    }

    // Validate insights are relevant
    if (parsed.insights.length === 0) {
      errors.push('No insights extracted from response');
    }

    // Check for data consistency (but be more lenient with common metric names)
    const mentionedMetrics = this.extractMentionedMetrics(parsed.answer);
    const availableMetrics = context.metrics.map(m => m.name.toLowerCase());
    const commonMetrics = ['users', 'sessions', 'pageviews', 'revenue', 'bounceRate'];
    
    const invalidMetrics = mentionedMetrics.filter(
      metric => !availableMetrics.includes(metric.toLowerCase()) && 
                !commonMetrics.includes(metric.toLowerCase())
    );

    if (invalidMetrics.length > 0) {
      errors.push(`Response mentions unavailable metrics: ${invalidMetrics.join(', ')}`);
    }

    return errors;
  }

  /**
   * Extracts data references from response text
   */
  private extractDataReferences(
    responseText: string,
    context: AnalyticsContext
  ): DataReference[] {
    const references: DataReference[] = [];

    // Extract numeric values and associate with properties/metrics
    const numberPattern = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|users|sessions|views|revenue|\$)/gi;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = numberPattern.exec(responseText)) !== null) {
      matches.push(match);
    }

    for (const match of matches) {
      if (!match[1] || !match[2]) continue;
      
      const value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2];
      
      // Try to find corresponding property and metric
      const propertyMatch = this.findReferencedProperty(responseText, context, match.index || 0);
      const metricName = this.inferMetricFromUnit(unit);

      if (propertyMatch && metricName) {
        references.push({
          propertyId: propertyMatch.propertyId,
          propertyName: propertyMatch.displayName,
          metric: metricName,
          value: value,
          dateRange: context.dateRange,
          source: 'google_analytics'
        });
      }
    }

    return references;
  }

  /**
   * Calculates confidence score based on response content and context
   */
  private calculateConfidenceScore(
    responseText: string,
    context: AnalyticsContext,
    parsed: ParsedResponseComponents
  ): number {
    let score = 0.5; // Base score
    const text = responseText.toLowerCase();

    // Adjust based on confidence keywords
    const highConfidenceCount = this.CONFIDENCE_KEYWORDS.high.reduce(
      (count, keyword) => count + (text.match(new RegExp(keyword, 'g'))?.length || 0), 0
    );
    const mediumConfidenceCount = this.CONFIDENCE_KEYWORDS.medium.reduce(
      (count, keyword) => count + (text.match(new RegExp(keyword, 'g'))?.length || 0), 0
    );
    const lowConfidenceCount = this.CONFIDENCE_KEYWORDS.low.reduce(
      (count, keyword) => count + (text.match(new RegExp(keyword, 'g'))?.length || 0), 0
    );

    score += (highConfidenceCount * 0.2) - (lowConfidenceCount * 0.2);
    score += (mediumConfidenceCount * 0.1);

    // Adjust based on data availability
    const dataRichness = context.properties.length / 10; // Normalize by expected max properties
    score += Math.min(dataRichness * 0.2, 0.2);

    // Adjust based on response completeness
    if (parsed.insights.length > 0) score += 0.1;
    if (parsed.recommendations.length > 0) score += 0.1;
    if (parsed.dataReferences.length > 0) score += 0.1;

    // Adjust based on response length (too short or too long reduces confidence)
    const responseLength = responseText.length;
    if (responseLength < 100) score -= 0.2;
    else if (responseLength > 2000) score -= 0.1;
    else if (responseLength >= 200 && responseLength <= 800) score += 0.1;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  // Helper methods

  private isInsightMarker(line: string): boolean {
    return this.INSIGHT_MARKERS.some(marker => line.includes(marker));
  }

  private isRecommendationMarker(line: string): boolean {
    return this.RECOMMENDATION_MARKERS.some(marker => line.includes(marker));
  }



  private extractContentAfterMarker(line: string, markers: string[]): string | null {
    for (const marker of markers) {
      const index = line.toLowerCase().indexOf(marker);
      if (index !== -1) {
        return line.substring(index + marker.length).trim();
      }
    }
    return null;
  }

  private extractImplicitInsights(text: string): string[] {
    const insights: string[] = [];
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    for (const sentence of sentences) {
      if (this.containsInsightIndicators(sentence)) {
        insights.push(sentence);
      }
    }

    return insights.slice(0, 3); // Limit to top 3 insights
  }

  private extractImplicitRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    for (const sentence of sentences) {
      if (this.containsRecommendationIndicators(sentence)) {
        recommendations.push(sentence);
      }
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }

  private containsInsightIndicators(sentence: string): boolean {
    const indicators = ['increase', 'decrease', 'trend', 'pattern', 'performance', 'growth', 'decline'];
    return indicators.some(indicator => sentence.toLowerCase().includes(indicator));
  }

  private containsRecommendationIndicators(sentence: string): boolean {
    const indicators = ['should', 'could', 'recommend', 'suggest', 'consider', 'improve', 'optimize'];
    return indicators.some(indicator => sentence.toLowerCase().includes(indicator));
  }

  private extractMentionedMetrics(text: string): string[] {
    const commonMetrics = ['users', 'sessions', 'pageviews', 'bounce rate', 'revenue', 'conversions'];
    const mentioned: string[] = [];

    for (const metric of commonMetrics) {
      if (text.toLowerCase().includes(metric.toLowerCase())) {
        mentioned.push(metric);
      }
    }

    return mentioned;
  }

  private findReferencedProperty(
    text: string,
    context: AnalyticsContext,
    position: number
  ): { propertyId: string; displayName: string } | null {
    // Look for property names near the numeric value
    const surroundingText = text.substring(Math.max(0, position - 100), position + 100);
    
    for (const property of context.properties) {
      if (surroundingText.toLowerCase().includes(property.displayName.toLowerCase())) {
        return property;
      }
    }

    // If no specific property found, return the first one (assuming single property context)
    return context.properties[0] || null;
  }

  private inferMetricFromUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'users': 'activeUsers',
      'sessions': 'sessions',
      'views': 'pageViews',
      'revenue': 'revenue',
      '$': 'revenue',
      '%': 'bounceRate'
    };

    return unitMap[unit.toLowerCase()] || 'unknown';
  }

  private formatAnswer(answer: string): string {
    // Clean up and format the main answer
    return answer
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(answer:|response:)/i, '')
      .trim();
  }

  private formatInsights(insights: string[]): string[] {
    return insights
      .map(insight => insight.replace(/^(insight:|key finding:|notable:)/i, '').trim())
      .filter(insight => insight.length > 10)
      .slice(0, 5); // Limit to 5 insights
  }

  private formatRecommendations(recommendations: string[]): string[] {
    return recommendations
      .map(rec => rec.replace(/^(recommend:|suggestion:|consider:)/i, '').trim())
      .filter(rec => rec.length > 10)
      .slice(0, 5); // Limit to 5 recommendations
  }

  private createValidationError(message: string, details: string): ChatError {
    return {
      type: 'validation',
      message,
      details,
      retryable: false
    };
  }
}

// Response validation schema for type safety
export class AnalyticsResponseSchema implements ValidationSchema<AnalyticsResponse> {
  parse(data: unknown): AnalyticsResponse {
    const result = this.safeParse(data);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data!;
  }

  safeParse(data: unknown): { success: boolean; data?: AnalyticsResponse; error?: string } {
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Data must be an object' };
      }

      const obj = data as Record<string, unknown>;

      // Validate required fields
      if (typeof obj.answer !== 'string') {
        return { success: false, error: 'answer must be a string' };
      }

      if (!Array.isArray(obj.insights)) {
        return { success: false, error: 'insights must be an array' };
      }

      if (!Array.isArray(obj.recommendations)) {
        return { success: false, error: 'recommendations must be an array' };
      }

      if (!Array.isArray(obj.dataReferences)) {
        return { success: false, error: 'dataReferences must be an array' };
      }

      if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
        return { success: false, error: 'confidence must be a number between 0 and 1' };
      }

      // Validate array contents
      if (!obj.insights.every(item => typeof item === 'string')) {
        return { success: false, error: 'all insights must be strings' };
      }

      if (!obj.recommendations.every(item => typeof item === 'string')) {
        return { success: false, error: 'all recommendations must be strings' };
      }

      // Validate data references structure
      for (const ref of obj.dataReferences as unknown[]) {
        if (!this.isValidDataReference(ref)) {
          return { success: false, error: 'invalid data reference structure' };
        }
      }

      return {
        success: true,
        data: {
          answer: obj.answer as string,
          insights: obj.insights as string[],
          recommendations: obj.recommendations as string[],
          dataReferences: obj.dataReferences as DataReference[],
          confidence: obj.confidence as number
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  private isValidDataReference(ref: unknown): ref is DataReference {
    if (!ref || typeof ref !== 'object') return false;
    
    const obj = ref as Record<string, unknown>;
    
    return (
      typeof obj.propertyId === 'string' &&
      typeof obj.propertyName === 'string' &&
      typeof obj.metric === 'string' &&
      typeof obj.value === 'number' &&
      typeof obj.dateRange === 'object' &&
      obj.dateRange !== null &&
      typeof (obj.dateRange as Record<string, unknown>).startDate === 'string' &&
      typeof (obj.dateRange as Record<string, unknown>).endDate === 'string' &&
      obj.source === 'google_analytics'
    );
  }
}