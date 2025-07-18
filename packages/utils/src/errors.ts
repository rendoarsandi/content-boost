// Error handling utilities with proper error codes

/**
 * Standard error codes for the platform
 * Based on design document error handling requirements
 */
export enum ErrorCodes {
  // Authentication errors (AUTH_xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  AUTH_ACCOUNT_LOCKED = 'AUTH_004',
  AUTH_INVALID_TOKEN = 'AUTH_005',
  AUTH_SESSION_EXPIRED = 'AUTH_006',

  // Campaign errors (CAMP_xxx)
  CAMPAIGN_NOT_FOUND = 'CAMP_001',
  CAMPAIGN_BUDGET_EXCEEDED = 'CAMP_002',
  CAMPAIGN_EXPIRED = 'CAMP_003',
  CAMPAIGN_INACTIVE = 'CAMP_004',
  CAMPAIGN_ALREADY_APPLIED = 'CAMP_005',
  CAMPAIGN_REQUIREMENTS_NOT_MET = 'CAMP_006',

  // Bot Detection errors (BOT_xxx)
  BOT_DETECTED = 'BOT_001',
  SUSPICIOUS_ACTIVITY = 'BOT_002',
  BOT_ANALYSIS_FAILED = 'BOT_003',
  BOT_THRESHOLD_EXCEEDED = 'BOT_004',

  // Payment errors (PAY_xxx)
  PAYMENT_INSUFFICIENT_BALANCE = 'PAY_001',
  PAYMENT_PROCESSING_FAILED = 'PAY_002',
  PAYMENT_INVALID_AMOUNT = 'PAY_003',
  PAYMENT_RETRY_EXCEEDED = 'PAY_004',
  PAYMENT_GATEWAY_ERROR = 'PAY_005',
  PAYMENT_CANCELLED = 'PAY_006',

  // External API errors (EXT_xxx)
  SOCIAL_API_RATE_LIMIT = 'EXT_001',
  SOCIAL_API_UNAUTHORIZED = 'EXT_002',
  SOCIAL_API_NOT_FOUND = 'EXT_003',
  SOCIAL_API_SERVER_ERROR = 'EXT_004',
  SOCIAL_API_TIMEOUT = 'EXT_005',

  // Database errors (DB_xxx)
  DATABASE_CONNECTION_FAILED = 'DB_001',
  DATABASE_QUERY_FAILED = 'DB_002',
  DATABASE_CONSTRAINT_VIOLATION = 'DB_003',
  DATABASE_TRANSACTION_FAILED = 'DB_004',

  // Cache errors (CACHE_xxx)
  CACHE_CONNECTION_FAILED = 'CACHE_001',
  CACHE_OPERATION_FAILED = 'CACHE_002',
  CACHE_KEY_NOT_FOUND = 'CACHE_003',

  // Validation errors (VAL_xxx)
  VALIDATION_FAILED = 'VAL_001',
  VALIDATION_REQUIRED_FIELD = 'VAL_002',
  VALIDATION_INVALID_FORMAT = 'VAL_003',
  VALIDATION_OUT_OF_RANGE = 'VAL_004',

  // User errors (USER_xxx)
  USER_NOT_FOUND = 'USER_001',
  USER_ALREADY_EXISTS = 'USER_002',
  USER_BANNED = 'USER_003',
  USER_INACTIVE = 'USER_004',

  // General errors (GEN_xxx)
  INTERNAL_SERVER_ERROR = 'GEN_001',
  SERVICE_UNAVAILABLE = 'GEN_002',
  RATE_LIMIT_EXCEEDED = 'GEN_003',
  INVALID_REQUEST = 'GEN_004',
  RESOURCE_NOT_FOUND = 'GEN_005'
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: string = ErrorCodes.AUTH_INVALID_CREDENTIALS, details?: any) {
    super(message, code, 401, true, details);
  }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string, code: string = ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, details?: any) {
    super(message, code, 403, true, details);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = ErrorCodes.VALIDATION_FAILED, details?: any) {
    super(message, code, 400, true, details);
  }
}

/**
 * Bot detection related errors
 */
export class BotDetectionError extends AppError {
  constructor(message: string, code: string = ErrorCodes.BOT_DETECTED, details?: any) {
    super(message, code, 422, true, details);
  }
}

/**
 * Payment related errors
 */
export class PaymentError extends AppError {
  constructor(message: string, code: string = ErrorCodes.PAYMENT_PROCESSING_FAILED, details?: any) {
    super(message, code, 402, true, details);
  }
}

/**
 * External API related errors
 */
export class ExternalAPIError extends AppError {
  constructor(message: string, code: string = ErrorCodes.SOCIAL_API_SERVER_ERROR, details?: any) {
    super(message, code, 502, true, details);
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: string = ErrorCodes.DATABASE_QUERY_FAILED, details?: any) {
    super(message, code, 500, true, details);
  }
}

/**
 * Cache related errors
 */
export class CacheError extends AppError {
  constructor(message: string, code: string = ErrorCodes.CACHE_OPERATION_FAILED, details?: any) {
    super(message, code, 500, true, details);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: string = ErrorCodes.RESOURCE_NOT_FOUND, details?: any) {
    super(message, code, 404, true, details);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(message: string, code: string = ErrorCodes.RATE_LIMIT_EXCEEDED, details?: any) {
    super(message, code, 429, true, details);
  }
}

/**
 * Error factory functions for common scenarios
 */
export const ErrorFactory = {
  // Authentication errors
  invalidCredentials: (details?: any) => 
    new AuthenticationError('Invalid email or password', ErrorCodes.AUTH_INVALID_CREDENTIALS, details),
  
  tokenExpired: (details?: any) => 
    new AuthenticationError('Authentication token has expired', ErrorCodes.AUTH_TOKEN_EXPIRED, details),
  
  insufficientPermissions: (details?: any) => 
    new AuthorizationError('Insufficient permissions to access this resource', ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, details),

  // Campaign errors
  campaignNotFound: (campaignId: string) => 
    new NotFoundError(`Campaign with ID ${campaignId} not found`, ErrorCodes.CAMPAIGN_NOT_FOUND, { campaignId }),
  
  campaignBudgetExceeded: (campaignId: string, budget: number) => 
    new ValidationError(`Campaign budget of ${budget} exceeded`, ErrorCodes.CAMPAIGN_BUDGET_EXCEEDED, { campaignId, budget }),
  
  campaignExpired: (campaignId: string, endDate: Date) => 
    new ValidationError(`Campaign expired on ${endDate.toISOString()}`, ErrorCodes.CAMPAIGN_EXPIRED, { campaignId, endDate }),

  // Bot detection errors
  botDetected: (promoterId: string, campaignId: string, botScore: number) => 
    new BotDetectionError(`Bot activity detected with confidence ${botScore}%`, ErrorCodes.BOT_DETECTED, { promoterId, campaignId, botScore }),
  
  suspiciousActivity: (promoterId: string, reason: string) => 
    new BotDetectionError(`Suspicious activity detected: ${reason}`, ErrorCodes.SUSPICIOUS_ACTIVITY, { promoterId, reason }),

  // Payment errors
  insufficientBalance: (required: number, available: number) => 
    new PaymentError(`Insufficient balance. Required: ${required}, Available: ${available}`, ErrorCodes.PAYMENT_INSUFFICIENT_BALANCE, { required, available }),
  
  paymentProcessingFailed: (payoutId: string, reason: string) => 
    new PaymentError(`Payment processing failed: ${reason}`, ErrorCodes.PAYMENT_PROCESSING_FAILED, { payoutId, reason }),

  // External API errors
  socialAPIRateLimit: (platform: string, resetTime?: Date) => 
    new ExternalAPIError(`${platform} API rate limit exceeded`, ErrorCodes.SOCIAL_API_RATE_LIMIT, { platform, resetTime }),
  
  socialAPIUnauthorized: (platform: string) => 
    new ExternalAPIError(`${platform} API authentication failed`, ErrorCodes.SOCIAL_API_UNAUTHORIZED, { platform }),

  // Validation errors
  validationFailed: (errors: string[]) => 
    new ValidationError(`Validation failed: ${errors.join(', ')}`, ErrorCodes.VALIDATION_FAILED, { errors }),
  
  requiredField: (fieldName: string) => 
    new ValidationError(`Required field missing: ${fieldName}`, ErrorCodes.VALIDATION_REQUIRED_FIELD, { fieldName }),

  // User errors
  userNotFound: (userId: string) => 
    new NotFoundError(`User with ID ${userId} not found`, ErrorCodes.USER_NOT_FOUND, { userId }),
  
  userBanned: (userId: string, reason?: string) => 
    new AuthorizationError(`User account is banned${reason ? `: ${reason}` : ''}`, ErrorCodes.USER_BANNED, { userId, reason })
};

/**
 * Error handler utility for async functions
 */
export function handleAsyncError<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Convert unknown errors to AppError
      throw new AppError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500,
        false,
        { originalError: error }
      );
    }
  };
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error): {
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  isOperational: boolean;
  details?: any;
} {
  const baseInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
    isOperational: isOperationalError(error)
  };

  if (error instanceof AppError) {
    return {
      ...baseInfo,
      code: error.code,
      details: error.details
    };
  }

  return baseInfo;
}

/**
 * Create error response for API endpoints
 */
export function createErrorResponse(error: Error): {
  error: {
    message: string;
    code: string;
    timestamp: Date;
    details?: any;
  };
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        details: error.details
      },
      statusCode: error.statusCode
    };
  }

  // For non-AppError instances, return generic error
  return {
    error: {
      message: 'Internal server error',
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      timestamp: new Date()
    },
    statusCode: 500
  };
}

/**
 * Retry mechanism with exponential backoff for handling transient errors
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry for operational errors that shouldn't be retried
      if (error instanceof AppError && error.isOperational) {
        // Only retry for specific error codes
        const retryableErrors: string[] = [
          ErrorCodes.SOCIAL_API_RATE_LIMIT,
          ErrorCodes.SOCIAL_API_TIMEOUT,
          ErrorCodes.DATABASE_CONNECTION_FAILED,
          ErrorCodes.CACHE_CONNECTION_FAILED,
          ErrorCodes.PAYMENT_PROCESSING_FAILED
        ];
        
        if (!retryableErrors.includes(error.code)) {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError!;
}