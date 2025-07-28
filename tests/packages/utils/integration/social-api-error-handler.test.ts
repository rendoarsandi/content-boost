import { APIErrorHandler } from '../../src/social-api/error-handler';
import { ERROR_CODES, HTTP_STATUS } from '../../src/social-api/constants';

describe('APIErrorHandler', () => {
  let errorHandler: APIErrorHandler;

  beforeEach(() => {
    errorHandler = new APIErrorHandler();
  });

  describe('parseHTTPError', () => {
    it('should parse rate limit error correctly', () => {
      const mockResponse = {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        statusText: 'Too Many Requests',
        headers: {
          get: jest.fn().mockReturnValue('60') // retry-after: 60 seconds
        }
      } as any;

      const error = errorHandler.parseHTTPError(mockResponse);

      expect(error).toEqual({
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: 60,
        details: undefined
      });
    });

    it('should parse unauthorized error correctly', () => {
      const mockResponse = {
        status: HTTP_STATUS.UNAUTHORIZED,
        statusText: 'Unauthorized',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as any;

      const error = errorHandler.parseHTTPError(mockResponse);

      expect(error).toEqual({
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Access token expired or invalid',
        statusCode: 401,
        retryAfter: undefined,
        details: undefined
      });
    });

    it('should parse server error correctly', () => {
      const mockResponse = {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        statusText: 'Internal Server Error',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as any;

      const error = errorHandler.parseHTTPError(mockResponse);

      expect(error).toEqual({
        code: ERROR_CODES.API_ERROR,
        message: 'Server error occurred',
        statusCode: 500,
        retryAfter: undefined,
        details: undefined
      });
    });
  });

  describe('parseNetworkError', () => {
    it('should parse network error correctly', () => {
      const networkError = new Error('Network connection failed');
      
      const error = errorHandler.parseNetworkError(networkError);

      expect(error).toEqual({
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Network error: Network connection failed',
        statusCode: undefined,
        retryAfter: undefined,
        details: { originalError: 'Network connection failed' }
      });
    });
  });

  describe('shouldRetry', () => {
    it('should retry rate limited requests', () => {
      const error = {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Rate limit exceeded',
        statusCode: 429
      };

      expect(errorHandler.shouldRetry(error, 1)).toBe(true);
      expect(errorHandler.shouldRetry(error, 3)).toBe(false); // Exceeds max retries
    });

    it('should retry server errors', () => {
      const error = {
        code: ERROR_CODES.API_ERROR,
        message: 'Server error',
        statusCode: 500
      };

      expect(errorHandler.shouldRetry(error, 1)).toBe(true);
    });

    it('should not retry client errors (except rate limiting)', () => {
      const error = {
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Token expired',
        statusCode: 401
      };

      expect(errorHandler.shouldRetry(error, 1)).toBe(false);
    });

    it('should retry network errors', () => {
      const error = {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Network error'
      };

      expect(errorHandler.shouldRetry(error, 1)).toBe(true);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should use retry-after when specified', () => {
      const error = {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Rate limited',
        retryAfter: 60
      };

      const delay = errorHandler.calculateRetryDelay(1, error);
      expect(delay).toBe(60000); // 60 seconds in milliseconds
    });

    it('should use exponential backoff when no retry-after', () => {
      const delay1 = errorHandler.calculateRetryDelay(1);
      const delay2 = errorHandler.calculateRetryDelay(2);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay1).toBeGreaterThanOrEqual(1000); // Base delay
    });

    it('should not exceed max delay', () => {
      const delay = errorHandler.calculateRetryDelay(10);
      expect(delay).toBeLessThanOrEqual(30000); // Max delay
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await errorHandler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        callback();
        return {} as any;
      });

      const result = await errorHandler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      
      global.setTimeout = originalSetTimeout;
    });

    it('should throw error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        callback();
        return {} as any;
      });

      await expect(errorHandler.executeWithRetry(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('getErrorSeverity', () => {
    it('should return correct severity levels', () => {
      expect(errorHandler.getErrorSeverity({
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Rate limited'
      })).toBe('medium');

      expect(errorHandler.getErrorSeverity({
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Token expired'
      })).toBe('high');

      expect(errorHandler.getErrorSeverity({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed'
      })).toBe('low');

      expect(errorHandler.getErrorSeverity({
        code: 'UNKNOWN_CODE',
        message: 'Unknown error'
      })).toBe('critical');
    });
  });
});