// Unit tests for ErrorHandlingService

import { ErrorHandlingService, ErrorType, ErrorSeverity } from '../ErrorHandlingService';

describe('ErrorHandlingService', () => {
  let errorService: ErrorHandlingService;

  beforeEach(() => {
    errorService = new ErrorHandlingService();
  });

  describe('parseError', () => {
    it('should parse authentication errors correctly', () => {
      const error = new Error('Unauthorized access');
      const parsed = errorService.parseError(error);
      
      expect(parsed.type).toBe(ErrorType.AUTHENTICATION);
      expect(parsed.severity).toBe(ErrorSeverity.HIGH);
      expect(parsed.retryable).toBe(false);
    });

    it('should parse network errors correctly', () => {
      const error = new Error('Network connection failed');
      const parsed = errorService.parseError(error);
      
      expect(parsed.type).toBe(ErrorType.NETWORK);
      expect(parsed.severity).toBe(ErrorSeverity.MEDIUM);
      expect(parsed.retryable).toBe(true);
    });

    it('should parse timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const parsed = errorService.parseError(error);
      
      expect(parsed.type).toBe(ErrorType.TIMEOUT);
      expect(parsed.retryable).toBe(true);
      expect(parsed.retryAfter).toBe(10);
    });

    it('should handle HTTP status codes', () => {
      const error = { statusCode: 429, message: 'Too many requests' };
      const parsed = errorService.parseError(error);
      
      expect(parsed.type).toBe(ErrorType.RATE_LIMIT);
      expect(parsed.code).toBe('429');
      expect(parsed.retryAfter).toBe(60);
    });
  });

  describe('withRetry', () => {
    it('should retry retryable errors', async () => {
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
        type: ErrorType.AUTHENTICATION
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});