"use client";

import React, { useState } from 'react';
import type { ErrorType, ErrorSeverity } from '~/lib/analytics/ErrorHandlingService';

interface ErrorDetails {
  type: string;
  severity: string;
  canRetry: boolean;
  retryAfter?: number;
  suggestions: string[];
  code?: string;
}

interface ChatErrorDisplayProps {
  error: string;
  errorDetails?: ErrorDetails;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ChatErrorDisplay({
  error,
  errorDetails,
  onRetry,
  onDismiss,
  className = ""
}: ChatErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Start countdown if retryAfter is specified
  React.useEffect(() => {
    if (errorDetails?.retryAfter && errorDetails.retryAfter > 0) {
      setRetryCountdown(errorDetails.retryAfter);
      
      const interval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [errorDetails?.retryAfter]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-400 text-red-800';
      case 'high':
        return 'bg-red-50 border-red-300 text-red-700';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      case 'low':
        return 'bg-blue-50 border-blue-300 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '❌';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'authentication':
        return '🔐';
      case 'network':
        return '🌐';
      case 'timeout':
        return '⏱️';
      case 'rate_limit':
        return '🚦';
      case 'data_unavailable':
        return '📊';
      case 'ai_service':
        return '🤖';
      case 'validation':
        return '✅';
      case 'permission':
        return '🚫';
      default:
        return '❓';
    }
  };

  const canRetryNow = errorDetails?.canRetry && (retryCountdown === null || retryCountdown <= 0);

  return (
    <div className={`chat-error-display ${className}`}>
      <div className={`p-4 rounded-lg border-2 ${getSeverityColor(errorDetails?.severity || 'medium')}`}>
        {/* Main Error Message */}
        <div className="flex items-start space-x-3">
          <span className="text-2xl flex-shrink-0">
            {errorDetails ? getSeverityIcon(errorDetails.severity) : '❌'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-2">{error}</div>
            
            {/* Error Type and Code */}
            {errorDetails && (
              <div className="flex items-center space-x-4 text-sm mb-3">
                <span className="flex items-center space-x-1">
                  <span>{getTypeIcon(errorDetails.type)}</span>
                  <span className="capitalize">{errorDetails.type.replace('_', ' ')}</span>
                </span>
                {errorDetails.code && (
                  <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-mono">
                    {errorDetails.code}
                  </span>
                )}
              </div>
            )}

            {/* Suggestions */}
            {errorDetails?.suggestions && errorDetails.suggestions.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium mb-1">Suggestions:</div>
                <ul className="text-sm space-y-1">
                  {errorDetails.suggestions.slice(0, 3).map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-xs mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {errorDetails?.canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  disabled={!canRetryNow}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    canRetryNow
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {retryCountdown !== null && retryCountdown > 0
                    ? `Retry in ${retryCountdown}s`
                    : 'Retry'
                  }
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              )}
              
              {errorDetails && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-3 py-2 rounded text-sm font-medium bg-white bg-opacity-50 hover:bg-opacity-75 transition-colors"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Error Information */}
        {showDetails && errorDetails && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Type:</span> {errorDetails.type}
              </div>
              <div>
                <span className="font-medium">Severity:</span> {errorDetails.severity}
              </div>
              <div>
                <span className="font-medium">Retryable:</span> {errorDetails.canRetry ? 'Yes' : 'No'}
              </div>
              {errorDetails.retryAfter && (
                <div>
                  <span className="font-medium">Retry After:</span> {errorDetails.retryAfter} seconds
                </div>
              )}
              {errorDetails.code && (
                <div>
                  <span className="font-medium">Error Code:</span> {errorDetails.code}
                </div>
              )}
              
              {/* All Suggestions */}
              {errorDetails.suggestions.length > 3 && (
                <div>
                  <div className="font-medium mb-1">All Suggestions:</div>
                  <ul className="space-y-1">
                    {errorDetails.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-xs mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick error display for inline use
export function InlineErrorDisplay({ 
  error, 
  onRetry, 
  className = "" 
}: { 
  error: string; 
  onRetry?: () => void; 
  className?: string; 
}) {
  return (
    <div className={`inline-error-display ${className}`}>
      <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <span>❌</span>
        <span className="flex-1">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}