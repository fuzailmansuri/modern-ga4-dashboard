// Integration tests for chat API endpoints

import { createMocks } from 'node-mocks-http';
import { POST, GET, DELETE } from '~/app/api/analytics/chat/route';

// Mock the auth function
jest.mock('~/server/auth', () => ({
  auth: jest.fn()
}));

// Mock the analytics services
jest.mock('~/lib/analytics/OptimizedAnalyticsService');
jest.mock('~/lib/analytics/ErrorHandlingService');

describe('/api/analytics/chat', () => {
  const mockSession = {
    user: { id: 'test-user', email: 'test@example.com' },
    accessToken: 'test-token'
  };

  beforeEach(() => {
    const { auth } = require('~/server/auth');
    auth.mockResolvedValue(mockSession);
  });

  describe('POST /api/analytics/chat', () => {
    it('should process chat queries successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          query: 'How are my brands performing?',
          propertyIds: ['prop1', 'prop2'],
          dateRange: { startDate: '7daysAgo', endDate: 'today' },
          sessionId: 'test-session'
        }
      });

      await POST(req);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should handle missing query parameter', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          propertyIds: ['prop1']
        }
      });

      await POST(req);
      
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing Query');
    });

    it('should handle authentication errors', async () => {
      const { auth } = require('~/server/auth');
      auth.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          query: 'test query'
        }
      });

      await POST(req);
      
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET /api/analytics/chat', () => {
    it('should retrieve conversation history', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { sessionId: 'test-session' }
      });

      await GET(req);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('messages');
    });

    it('should require sessionId parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await GET(req);
      
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('DELETE /api/analytics/chat', () => {
    it('should clear conversation history', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { sessionId: 'test-session' }
      });

      await DELETE(req);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });
  });
});