import {
  ErrorCodes,
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  BotDetectionError,
  PaymentError,
  ExternalAPIError,
  DatabaseError,
  CacheError,
  NotFoundError,
  RateLimitError,
  ErrorFactory,
  handleAsyncError,
  isOperationalError,
  formatErrorForLogging,
  createErrorResponse,
  retryWithBackoff
} from '../src/errors';

describe('Error Handling Utilities', () => {
  describe('AppError', () => {
    it('should create app error with all properties', () => {
      const error = new AppError(
        'Test error message',
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500,
        true,
        { additional: 'data' }
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ additional: 'data' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AppError');
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError('Test error', ErrorCodes.VALIDATION_FAILED, 400);
      const json = error.toJSON();

      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(json.statusCode).toBe(400);
      expect(json.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Specific Error Classes', () => {
    it('should create AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
      expect(error.isOperational).toBe(true);
    });

    it('should create AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS);
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    });

    it('should create BotDetectionError with correct defaults', () => {
      const error = new BotDetectionError('Bot detected');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe(ErrorCodes.BOT_DETECTED);
    });

    it('should create PaymentError with correct defaults', () => {
      const error = new PaymentError('Payment failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(402);
      expect(error.code).toBe(ErrorCodes.PAYMENT_PROCESSING_FAILED);
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    });

    it('should create RateLimitError with correct defaults', () => {
      const error = new RateLimitError('Rate limit exceeded');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('ErrorFactory', () => {
    it('should create invalidCredentials error', () => {
      const error = ErrorFactory.invalidCredentials();

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid email or password');
      expect(error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    });

    it('should create tokenExpired error', () => {
      const error = ErrorFactory.tokenExpired();

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Authentication token has expired');
      expect(error.code).toBe(ErrorCodes.AUTH_TOKEN_EXPIRED);
    });

    it('should create campaignNotFound error with details', () => {
      const campaignId = 'campaign-123';
      const error = ErrorFactory.campaignNotFound(campaignId);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe(`Campaign with ID ${campaignId} not found`);
      expect(error.code).toBe(ErrorCodes.CAMPAIGN_NOT_FOUND);
      expect(error.details).toEqual({ campaignId });
    });

    it('should create botDetected error with details', () => {
      const promoterId = 'promoter-123';
      const campaignId = 'campaign-456';
      const botScore = 95;
      const error = ErrorFactory.botDetected(promoterId, campaignId, botScore);

      expect(error).toBeInstanceOf(BotDetectionError);
      expect(error.message).toBe(`Bot activity detected with confidence ${botScore}%`);
      expect(error.code).toBe(ErrorCodes.BOT_DETECTED);
      expect(error.details).toEqual({ promoterId, campaignId, botScore });
    });

    it('should create socialAPIRateLimit error with details', () => {
      const platform = 'tiktok';
      const resetTime = new Date();
      const error = ErrorFactory.socialAPIRateLimit(platform, resetTime);

      expect(error).toBeInstanceOf(ExternalAPIError);
      expect(error.message).toBe(`${platform} API rate limit exceeded`);
      expect(error.code).toBe(ErrorCodes.SOCIAL_API_RATE_LIMIT);
      expect(error.details).toEqual({ platform, resetTime });
    });

    it('should create validationFailed error with errors array', () => {
      const errors = ['Field is required', 'Invalid format'];
      const error = ErrorFactory.validationFailed(errors);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed: Field is required, Invalid format');
      expect(error.details).toEqual({ errors });
    });
  });

  describe('handleAsyncError', () => {
    it('should pass through AppError instances', async () => {
      const originalError = new ValidationError('Validation failed');
      const wrappedFn = handleAsyncError(async () => {
        throw originalError;
      });

      await expect(wrappedFn()).rejects.toBe(originalError);
    });

    it('should wrap non-AppError instances', async () => {
      const originalError = new Error('Regular error');
      const wrappedFn = handleAsyncError(async () => {
        throw originalError;
      });

      await expect(wrappedFn()).rejects.toMatchObject({
        message: 'Regular error',
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        statusCode: 500,
        isOperational: false
      });
    });

    it('should handle successful execution', async () => {
      const wrappedFn = handleAsyncError(async (value: number) => {
        return value * 2;
      });

      const result = await wrappedFn(5);
      expect(result).toBe(10);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for AppError with isOperational=true', () => {
      const error = new AppError('Test', ErrorCodes.VALIDATION_FAILED, 400, true);
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for AppError with isOperational=false', () => {
      const error = new AppError('Test', ErrorCodes.INTERNAL_SERVER_ERROR, 500, false);
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format AppError correctly', () => {
      const error = new AppError('Test error', ErrorCodes.VALIDATION_FAILED, 400, true, { extra: 'data' });
      const formatted = formatErrorForLogging(error);

      expect(formatted.message).toBe('Test error');
      expect(formatted.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(formatted.isOperational).toBe(true);
      expect(formatted.details).toEqual({ extra: 'data' });
      expect(formatted.timestamp).toBeInstanceOf(Date);
      expect(formatted.stack).toBeDefined();
    });

    it('should format regular Error correctly', () => {
      const error = new Error('Regular error');
      const formatted = formatErrorForLogging(error);

      expect(formatted.message).toBe('Regular error');
      expect(formatted.code).toBeUndefined();
      expect(formatted.isOperational).toBe(false);
      expect(formatted.details).toBeUndefined();
      expect(formatted.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createErrorResponse', () => {
    it('should create response for AppError', () => {
      const error = new AppError('Test error', ErrorCodes.VALIDATION_FAILED, 400, true, { field: 'email' });
      const response = createErrorResponse(error);

      expect(response.statusCode).toBe(400);
      expect(response.error.message).toBe('Test error');
      expect(response.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(response.error.details).toEqual({ field: 'email' });
      expect(response.error.timestamp).toBeInstanceOf(Date);
    });

    it('should create generic response for regular Error', () => {
      const error = new Error('Regular error');
      const response = createErrorResponse(error);

      expect(response.statusCode).toBe(500);
      expect(response.error.message).toBe('Internal server error');
      expect(response.error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(response.error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new AppError('Rate limit', ErrorCodes.SOCIAL_API_RATE_LIMIT))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new ValidationError('Invalid input'));
      
      await expect(retryWithBackoff(operation, 3, 100)).rejects.toBeInstanceOf(ValidationError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const error = new AppError('Timeout', ErrorCodes.SOCIAL_API_TIMEOUT);
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryWithBackoff(operation, 2, 100)).rejects.toBe(error);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry regular errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});