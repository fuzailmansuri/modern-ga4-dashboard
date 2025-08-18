// Integration tests for error handling scenarios

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleChatInterface } from '~/components/SimpleChatInterface';
import { ErrorHandlingService } from '~/lib/analytics/ErrorHandlingService';

describe('Error Handling Integration', () => {
  const mockProps = {
    properties: [],
    currentDateRange: { startDate: '7daysAgo', endDate: 'today' },
    analyticsData: {},
    isVisible: true,
    onToggle: jest.fn()
  };

  let errorService: ErrorHandlingService;

  beforeEach(() => {
    errorService = new ErrorHandlingService();
    global.fetch = jest.fn();
  });

  it('should handle network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<SimpleChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/error processing your request/)).toBeInTheDocument();
    });
  });

  it('should handle API errors with proper user messages', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Authentication failed' })
    });
    
    render(<SimpleChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    });
  });

  it('should parse different error types correctly', () => {
    const authError = new Error('Unauthorized access');
    const networkError = new Error('Network connection failed');
    const timeoutError = new Error('Request timed out');
    
    const parsedAuth = errorService.parseError(authError);
    const parsedNetwork = errorService.parseError(networkError);
    const parsedTimeout = errorService.parseError(timeoutError);
    
    expect(parsedAuth.type).toBe('authentication');
    expect(parsedAuth.retryable).toBe(false);
    
    expect(parsedNetwork.type).toBe('network');
    expect(parsedNetwork.retryable).toBe(true);
    
    expect(parsedTimeout.type).toBe('timeout');
    expect(parsedTimeout.retryable).toBe(true);
  });

  it('should provide user-friendly error messages', () => {
    const error = new Error('Network connection failed');
    const parsed = errorService.parseError(error);
    const userError = errorService.getUserErrorMessage(parsed);
    
    expect(userError.message).toContain('Network connection issue');
    expect(userError.suggestions).toContain('Check your internet connection');
    expect(userError.canRetry).toBe(true);
  });

  it('should handle retry logic correctly', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network connection failed');
      }
      return 'success';
    });

    const result = await errorService.withRetry(operation, undefined, {
      maxAttempts: 3,
      baseDelay: 10
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should not retry non-retryable errors', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Unauthorized'));
    
    await expect(
      errorService.withRetry(operation, undefined, { maxAttempts: 3 })
    ).rejects.toMatchObject({
      type: 'authentication'
    });
    
    expect(operation).toHaveBeenCalledTimes(1);
  });
});