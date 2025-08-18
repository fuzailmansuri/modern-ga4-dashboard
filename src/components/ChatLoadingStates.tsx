"use client";

import React, { useState, useEffect } from 'react';

interface LoadingStateProps {
  className?: string;
}

// Typing indicator for when AI is processing
export function TypingIndicator({ className = "" }: LoadingStateProps) {
  return (
    <div className={`typing-indicator ${className}`}>
      <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg max-w-xs">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-sm text-gray-600">AI is thinking...</span>
      </div>
    </div>
  );
}

// Progress indicator for data fetching
interface DataFetchingProgressProps extends LoadingStateProps {
  stage: 'authenticating' | 'fetching_properties' | 'loading_data' | 'processing_query' | 'generating_response';
  progress?: number; // 0-100
  details?: string;
}

export function DataFetchingProgress({ 
  stage, 
  progress, 
  details, 
  className = "" 
}: DataFetchingProgressProps) {
  const getStageInfo = (currentStage: string) => {
    const stages = {
      authenticating: { icon: '🔐', label: 'Authenticating...', color: 'bg-blue-500' },
      fetching_properties: { icon: '📊', label: 'Loading properties...', color: 'bg-green-500' },
      loading_data: { icon: '📈', label: 'Fetching analytics data...', color: 'bg-yellow-500' },
      processing_query: { icon: '🔍', label: 'Processing your query...', color: 'bg-purple-500' },
      generating_response: { icon: '🤖', label: 'Generating response...', color: 'bg-indigo-500' }
    };
    return stages[currentStage as keyof typeof stages] || stages.authenticating;
  };

  const stageInfo = getStageInfo(stage);

  return (
    <div className={`data-fetching-progress ${className}`}>
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-2xl">{stageInfo.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{stageInfo.label}</div>
            {details && (
              <div className="text-sm text-gray-600">{details}</div>
            )}
          </div>
        </div>
        
        {progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${stageInfo.color}`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton loader for chat messages
export function MessageSkeleton({ className = "" }: LoadingStateProps) {
  return (
    <div className={`message-skeleton ${className}`}>
      <div className="animate-pulse">
        <div className="flex space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading overlay for the entire chat interface
interface LoadingOverlayProps extends LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
}

export function LoadingOverlay({ 
  message = "Loading...", 
  showSpinner = true, 
  className = "" 
}: LoadingOverlayProps) {
  return (
    <div className={`loading-overlay ${className}`}>
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {showSpinner && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          )}
          <div className="text-lg font-medium text-gray-900">{message}</div>
        </div>
      </div>
    </div>
  );
}

// Progressive loading indicator with stages
interface ProgressiveLoadingProps extends LoadingStateProps {
  stages: Array<{
    id: string;
    label: string;
    icon?: string;
    completed?: boolean;
    active?: boolean;
    error?: boolean;
  }>;
  currentStage?: string;
}

export function ProgressiveLoading({ 
  stages, 
  currentStage, 
  className = "" 
}: ProgressiveLoadingProps) {
  return (
    <div className={`progressive-loading ${className}`}>
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isActive = stage.active || stage.id === currentStage;
          const isCompleted = stage.completed;
          const hasError = stage.error;
          
          return (
            <div 
              key={stage.id}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                hasError 
                  ? 'bg-red-50 border border-red-200' 
                  : isActive 
                    ? 'bg-blue-50 border border-blue-200' 
                    : isCompleted 
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex-shrink-0">
                {hasError ? (
                  <span className="text-red-500">❌</span>
                ) : isCompleted ? (
                  <span className="text-green-500">✅</span>
                ) : isActive ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <span className="text-gray-400">{stage.icon || '⏳'}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className={`font-medium ${
                  hasError 
                    ? 'text-red-700' 
                    : isActive 
                      ? 'text-blue-700' 
                      : isCompleted 
                        ? 'text-green-700'
                        : 'text-gray-700'
                }`}>
                  {stage.label}
                </div>
              </div>
              
              {isActive && !hasError && (
                <div className="text-sm text-blue-600 font-medium">
                  Processing...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Success feedback component
interface SuccessFeedbackProps extends LoadingStateProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SuccessFeedback({ 
  message, 
  details, 
  onDismiss, 
  autoHide = true, 
  autoHideDelay = 3000,
  className = "" 
}: SuccessFeedbackProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`success-feedback ${className}`}>
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <span className="text-green-500 text-xl">✅</span>
          <div className="flex-1">
            <div className="font-medium text-green-800">{message}</div>
            {details && (
              <div className="text-sm text-green-600 mt-1">{details}</div>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="text-green-500 hover:text-green-700 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Animated counter for metrics
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  formatter = (v) => v.toLocaleString(),
  className = "" 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(value * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className={`animated-counter ${className}`}>
      {formatter(displayValue)}
    </span>
  );
}