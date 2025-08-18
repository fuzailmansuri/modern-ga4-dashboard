// End-to-end integration tests for chat flow

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleChatInterface } from '~/components/SimpleChatInterface';
import type { AnalyticsProperty, AnalyticsData } from '~/types/analytics';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Chat Flow Integration', () => {
  const mockProperties: AnalyticsProperty[] = [
    {
      propertyId: 'prop1',
      name: 'properties/prop1',
      displayName: 'Test Brand',
      propertyType: 'GA4',
      createTime: '2023-01-01',
      updateTime: '2023-01-01',
      parent: 'accounts/123',
      timeZone: 'UTC',
      currencyCode: 'USD'
    }
  ];

  const mockAnalyticsData: Record<string, AnalyticsData> = {
    prop1: {
      dimensionHeaders: [{ name: 'date' }],
      metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }],
      rows: [
        {
          dimensionValues: [{ value: '2023-01-01' }],
          metricValues: [{ value: '100' }]
        }
      ],
      totals: [],
      maximums: [],
      minimums: [],
      rowCount: 1
    }
  };

  const defaultProps = {
    properties: mockProperties,
    currentDateRange: { startDate: '7daysAgo', endDate: 'today' },
    analyticsData: mockAnalyticsData,
    isVisible: true,
    onToggle: jest.fn()
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should render chat interface when visible', () => {
    render(<SimpleChatInterface {...defaultProps} />);
    
    expect(screen.getByText('Analytics Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask about your analytics data...')).toBeInTheDocument();
  });

  it('should render toggle button when not visible', () => {
    render(<SimpleChatInterface {...defaultProps} isVisible={false} />);
    
    expect(screen.getByLabelText('Open analytics chat')).toBeInTheDocument();
  });

  it('should handle user message submission', async () => {
    render(<SimpleChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    fireEvent.change(input, { target: { value: 'How are my brands performing?' } });
    fireEvent.click(submitButton);
    
    // Check that user message appears
    expect(screen.getByText('How are my brands performing?')).toBeInTheDocument();
    
    // Check that loading indicator appears
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    
    // Wait for simulated response
    await waitFor(() => {
      expect(screen.getByText(/I received your message/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should clear chat history', () => {
    render(<SimpleChatInterface {...defaultProps} />);
    
    // Add a message first
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    // Clear chat
    const clearButton = screen.getByLabelText('Clear chat');
    fireEvent.click(clearButton);
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should handle keyboard shortcuts', () => {
    render(<SimpleChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Test Enter key submission
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should display context information', () => {
    render(<SimpleChatInterface {...defaultProps} />);
    
    expect(screen.getByText('Connected to 1 properties')).toBeInTheDocument();
    expect(screen.getByText('7daysAgo to today')).toBeInTheDocument();
  });

  it('should focus input when chat becomes visible', () => {
    const { rerender } = render(<SimpleChatInterface {...defaultProps} isVisible={false} />);
    
    rerender(<SimpleChatInterface {...defaultProps} isVisible={true} />);
    
    const input = screen.getByPlaceholderText('Ask about your analytics data...');
    expect(input).toHaveFocus();
  });
});