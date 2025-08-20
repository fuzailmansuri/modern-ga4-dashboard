// Comprehensive error handling service for analytics chat interface

export enum ErrorType {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  DATA_UNAVAILABLE = 'data_unavailable',
  AI_SERVICE = 'ai_service',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AnalyticsError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number; // seconds
  context?: {
    propertyId?: string;
    query?: string;
    sessionId?: string;
    userId?: string;
  };
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export class ErrorHandlingService {
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.AI_SERVICE
    ]
  };

  private errorHistory: AnalyticsError[] = [];
  private readonly MAX_ERROR_HISTORY = 100;

  /**
   * Parse and classify an error
   */
  parseError(error: unknown, context?: AnalyticsError['context']): AnalyticsError {
    const timestamp = new Date();
    
    // Handle different error types
    if (error instanceof Error) {
      return this.parseJavaScriptError(error, timestamp, context);
    }
    
    if (typeof error === 'string') {
      return this.parseStringError(error, timestamp, context);
    }
    
    if (typeof error === 'object' && error !== null) {
      return this.parseObjectError(error as Record<string, any>, timestamp, context);
    }
    
    // Fallback for unknown error types
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: String(error),
      userMessage: "An unexpected error occurred. Please try again.",
      timestamp,
      retryable: true,
      context
    };
  }

  /**
   * Parse JavaScript Error objects
   */
  private parseJavaScriptError(
    error: Error,
    timestamp: Date,
    context?: AnalyticsError['context']
  ): AnalyticsError {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
      return {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        userMessage: "Authentication failed. Please sign in again to continue.",
        timestamp,
        retryable: false,
        context
      };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "Network connection issue. Please check your internet connection and try again.",
        timestamp,
        retryable: true,
        retryAfter: 5,
        context
      };
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: ErrorType.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "Request timed out. This might be due to high server load. Please try again.",
        timestamp,
        retryable: true,
        retryAfter: 10,
        context
      };
    }
    
    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        type: ErrorType.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "Too many requests. Please wait a moment before trying again.",
        timestamp,
        retryable: true,
        retryAfter: 60,
        context
      };
    }
    
    // Data availability errors
    if (message.includes('no data') || message.includes('not found') || message.includes('empty')) {
      return {
        type: ErrorType.DATA_UNAVAILABLE,
        severity: ErrorSeverity.LOW,
        message: error.message,
        userMessage: "No data available for your query. Try adjusting your date range or property selection.",
        timestamp,
        retryable: false,
        context
      };
    }
    
    // AI service errors
    if (message.includes('gemini') || message.includes('ai') || message.includes('model')) {
      return {
        type: ErrorType.AI_SERVICE,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "AI service is temporarily unavailable. Please try again in a moment.",
        timestamp,
        retryable: true,
        retryAfter: 30,
        context
      };
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return {
        type: ErrorType.PERMISSION,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        userMessage: "You don't have permission to access this data. Please contact your administrator.",
        timestamp,
        retryable: false,
        context
      };
    }
    
    // Default error
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: "An unexpected error occurred. Please try again.",
      timestamp,
      retryable: true,
      context
    };
  }

  /**
   * Parse string errors
   */
  private parseStringError(
    error: string,
    timestamp: Date,
    context?: AnalyticsError['context']
  ): AnalyticsError {
    return this.parseJavaScriptError(new Error(error), timestamp, context);
  }

  /**
   * Parse object errors (like API responses)
   */
  private parseObjectError(
    error: Record<string, any>,
    timestamp: Date,
    context?: AnalyticsError['context']
  ): AnalyticsError {
    const message = error.message || error.error || JSON.stringify(error);
    const statusCode = error.statusCode || error.status;
    
    // Handle HTTP status codes
    if (statusCode) {
      switch (statusCode) {
        case 401:
          return {
            type: ErrorType.AUTHENTICATION,
            severity: ErrorSeverity.HIGH,
            message,
            userMessage: "Authentication failed. Please sign in again.",
            code: String(statusCode),
            timestamp,
            retryable: false,
            context
          };
        
        case 403:
          return {
            type: ErrorType.PERMISSION,
            severity: ErrorSeverity.HIGH,
            message,
            userMessage: "Access denied. You don't have permission for this action.",
            code: String(statusCode),
            timestamp,
            retryable: false,
            context
          };
        
        case 404:
          return {
            type: ErrorType.DATA_UNAVAILABLE,
            severity: ErrorSeverity.LOW,
            message,
            userMessage: "Requested data not found. Please check your selection.",
            code: String(statusCode),
            timestamp,
            retryable: false,
            context
          };
        
        case 429:
          return {
            type: ErrorType.RATE_LIMIT,
            severity: ErrorSeverity.MEDIUM,
            message,
            userMessage: "Too many requests. Please wait before trying again.",
            code: String(statusCode),
            timestamp,
            retryable: true,
            retryAfter: 60,
            context
          };
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: ErrorType.NETWORK,
            severity: ErrorSeverity.HIGH,
            message,
            userMessage: "Server error. Please try again later.",
            code: String(statusCode),
            timestamp,
            retryable: true,
            retryAfter: 30,
            context
          };
      }
    }
    
    // Fallback to parsing the message
    return this.parseStringError(message, timestamp, context);
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context?: AnalyticsError['context'],
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: AnalyticsError | null = null;
    
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.parseError(error, context);
        this.logError(lastError);
        
        // Don't retry if error is not retryable
        if (!lastError.retryable || !retryConfig.retryableErrors.includes(lastError.type)) {
          throw lastError;
        }
        
        // Don't retry on last attempt
        if (attempt === retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        console.log(`Retrying operation in ${jitteredDelay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }
    
    // Ensure we throw an Error object (lint rule: only-throw-error)
    if (lastError) {
      throw new Error(JSON.stringify({ type: lastError.type, message: lastError.message }));
    }
    throw new Error("Unknown error during operation retry");
  }

  /**
   * Log error to history and console
   */
  private logError(error: AnalyticsError): void {
    // Add to error history
    this.errorHistory.unshift(error);
    
    // Maintain history size
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    }
    
    // Log to console based on severity
    const logMessage = `[${error.type}] ${error.message}`;
    const logContext = error.context ? ` Context: ${JSON.stringify(error.context)}` : '';
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage + logContext, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage + logContext);
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage + logContext);
        break;
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): AnalyticsError[] {
    return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number; // Last hour
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: 0
    };
    
    // Initialize counters
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    
    // Count errors
    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
      
      if (error.timestamp > oneHourAgo) {
        stats.recentErrors++;
      }
    });
    
    return stats;
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get user-friendly error message with suggestions
   */
  getUserErrorMessage(error: AnalyticsError): {
    message: string;
    suggestions: string[];
    canRetry: boolean;
    retryAfter?: number;
  } {
    const suggestions: string[] = [];
    
    switch (error.type) {
      case ErrorType.AUTHENTICATION:
        suggestions.push("Sign out and sign back in");
        suggestions.push("Check if your Google Analytics access is still valid");
        break;
      
      case ErrorType.NETWORK:
        suggestions.push("Check your internet connection");
        suggestions.push("Try refreshing the page");
        suggestions.push("Wait a moment and try again");
        break;
      
      case ErrorType.TIMEOUT:
        suggestions.push("Try a smaller date range");
        suggestions.push("Select fewer properties");
        suggestions.push("Wait for server load to decrease");
        break;
      
      case ErrorType.RATE_LIMIT:
        suggestions.push("Wait before making another request");
        suggestions.push("Reduce the frequency of your queries");
        break;
      
      case ErrorType.DATA_UNAVAILABLE:
        suggestions.push("Try a different date range");
        suggestions.push("Check if the property has data for this period");
        suggestions.push("Verify your property selection");
        break;
      
      case ErrorType.AI_SERVICE:
        suggestions.push("Wait a moment and try again");
        suggestions.push("Try rephrasing your question");
        break;
      
      case ErrorType.PERMISSION:
        suggestions.push("Contact your administrator");
        suggestions.push("Check your Google Analytics permissions");
        break;
      
      default:
        suggestions.push("Try refreshing the page");
        suggestions.push("Contact support if the problem persists");
    }
    
    return {
      message: error.userMessage,
      suggestions,
      canRetry: error.retryable,
      retryAfter: error.retryAfter
    };
  }
}

// Singleton instance
export const errorHandlingService = new ErrorHandlingService();