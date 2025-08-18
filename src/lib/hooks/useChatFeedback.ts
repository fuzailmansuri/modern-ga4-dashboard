// React hook for managing chat feedback states and user notifications

import { useState, useRef } from 'react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';
export type LoadingStage = 'idle' | 'authenticating' | 'fetching_properties' | 'loading_data' | 'processing_query' | 'generating_response';

interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  message: string;
  details?: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

interface LoadingState {
  isLoading: boolean;
  stage: LoadingStage;
  progress?: number;
  details?: string;
  startTime?: Date;
}

interface ChatFeedbackState {
  loading: LoadingState;
  messages: FeedbackMessage[];
  isTyping: boolean;
  lastActivity: Date | null;
}

export function useChatFeedback() {
  const [state, setState] = useState<ChatFeedbackState>({
    loading: {
      isLoading: false,
      stage: 'idle'
    },
    messages: [],
    isTyping: false,
    lastActivity: null
  });

  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Start loading with a specific stage
  const startLoading = (stage: LoadingStage, details?: string) => {
    setState(prev => ({
      ...prev,
      loading: {
        isLoading: true,
        stage,
        details,
        startTime: new Date(),
        progress: 0
      },
      lastActivity: new Date()
    }));
  };

  // Update loading progress
  const updateLoadingProgress = (progress: number, details?: string) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        progress: Math.max(0, Math.min(100, progress)),
        details: details || prev.loading.details
      },
      lastActivity: new Date()
    }));
  };

  // Move to next loading stage
  const nextLoadingStage = (stage: LoadingStage, details?: string) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        stage,
        details,
        progress: 0
      },
      lastActivity: new Date()
    }));
  };

  // Stop loading
  const stopLoading = () => {
    setState(prev => ({
      ...prev,
      loading: {
        isLoading: false,
        stage: 'idle'
      },
      lastActivity: new Date()
    }));
  };

  // Start typing indicator
  const startTyping = () => {
    setState(prev => ({
      ...prev,
      isTyping: true,
      lastActivity: new Date()
    }));
  };

  // Stop typing indicator
  const stopTyping = () => {
    setState(prev => ({
      ...prev,
      isTyping: false,
      lastActivity: new Date()
    }));
  };

  // Remove feedback message
  const removeMessage = (id: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== id)
    }));

    // Clear timeout if exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  };

  // Add feedback message
  const addMessage = (
    type: FeedbackType,
    message: string,
    options?: {
      details?: string;
      autoHide?: boolean;
      duration?: number;
    }
  ) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: FeedbackMessage = {
      id,
      type,
      message,
      details: options?.details,
      timestamp: new Date(),
      autoHide: options?.autoHide ?? (type === 'success' || type === 'info'),
      duration: options?.duration ?? 5000
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      lastActivity: new Date()
    }));

    // Auto-hide message if specified
    if (newMessage.autoHide) {
      const timeout = setTimeout(() => {
        removeMessage(id);
      }, newMessage.duration);
      
      timeoutRefs.current.set(id, timeout);
    }

    return id;
  };

  // Clear all messages
  const clearMessages = () => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();

    setState(prev => ({
      ...prev,
      messages: []
    }));
  };

  // Convenience methods for different message types
  const showSuccess = (message: string, details?: string) => {
    return addMessage('success', message, { details, autoHide: true, duration: 3000 });
  };

  const showError = (message: string, details?: string) => {
    return addMessage('error', message, { details, autoHide: false });
  };

  const showWarning = (message: string, details?: string) => {
    return addMessage('warning', message, { details, autoHide: true, duration: 5000 });
  };

  const showInfo = (message: string, details?: string) => {
    return addMessage('info', message, { details, autoHide: true, duration: 4000 });
  };

  // Get loading duration
  const getLoadingDuration = () => {
    if (!state.loading.isLoading || !state.loading.startTime) return 0;
    return Date.now() - state.loading.startTime.getTime();
  };

  // Check if loading is taking too long
  const isLoadingTooLong = (threshold = 30000) => { // 30 seconds
    return getLoadingDuration() > threshold;
  };

  // Get stage progress for multi-stage operations
  const getStageProgress = () => {
    const stages: LoadingStage[] = ['authenticating', 'fetching_properties', 'loading_data', 'processing_query', 'generating_response'];
    const currentIndex = stages.indexOf(state.loading.stage);
    const totalStages = stages.length;
    
    if (currentIndex === -1) return 0;
    
    const stageProgress = (state.loading.progress || 0) / 100;
    const overallProgress = (currentIndex + stageProgress) / totalStages * 100;
    
    return Math.round(overallProgress);
  };

  // Reset all feedback state
  const reset = () => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();

    setState({
      loading: {
        isLoading: false,
        stage: 'idle'
      },
      messages: [],
      isTyping: false,
      lastActivity: null
    });
  };

  // Batch operations for complex workflows
  const withLoadingStages = async <T>(
    operation: (updateStage: (stage: LoadingStage, details?: string, progress?: number) => void) => Promise<T>,
    onError?: (error: any) => void
  ): Promise<T | null> => {
    try {
      startLoading('authenticating', 'Starting operation...');
      
      const updateStage = (stage: LoadingStage, details?: string, progress?: number) => {
        nextLoadingStage(stage, details);
        if (progress !== undefined) {
          updateLoadingProgress(progress);
        }
      };

      const result = await operation(updateStage);
      
      stopLoading();
      showSuccess('Operation completed successfully');
      
      return result;
    } catch (error) {
      stopLoading();
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      showError('Operation failed', errorMessage);
      onError?.(error);
      return null;
    }
  };

  return {
    // State
    ...state,
    
    // Loading controls
    startLoading,
    stopLoading,
    updateLoadingProgress,
    nextLoadingStage,
    
    // Typing controls
    startTyping,
    stopTyping,
    
    // Message controls
    addMessage,
    removeMessage,
    clearMessages,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Utilities
    getLoadingDuration,
    isLoadingTooLong,
    getStageProgress,
    reset,
    withLoadingStages
  };
}