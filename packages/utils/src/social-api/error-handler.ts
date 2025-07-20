import { APIError, RetryConfig } from './types';
import { ERROR_CODES, HTTP_STATUS, RETRY_DEFAULTS } from './constants';

export class APIErrorHandler {
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...RETRY_DEFAULTS, ...retryConfig };
  }

  createError(
    code: string,
    message: string,
    statusCode?: number,
    retryAfter?: number,
    details?: any
  ): APIError {
    return {
      code,
      message,
      statusCode,
      retryAfter,
      details
    };
  }

  parseHTTPError(response: Response, responseBody?: any): APIError {
    const statusCode = response.status;
    
    switch (statusCode) {
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        const retryAfter = this.parseRetryAfter(response.headers.get('retry-after'));
        return this.createError(
          ERROR_CODES.RATE_LIMITED,
          'Rate limit exceeded',
          statusCode,
          retryAfter,
          responseBody
        );
        
      case HTTP_STATUS.UNAUTHORIZED:
        return this.createError(
          ERROR_CODES.TOKEN_EXPIRED,
          'Access token expired or invalid',
          statusCode,
          undefined,
          responseBody
        );
        
      case HTTP_STATUS.FORBIDDEN:
        return this.createError(
          ERROR_CODES.TOKEN_INVALID,
          'Access token does not have required permissions',
          statusCode,
          undefined,
          responseBody
        );
        
      case HTTP_STATUS.NOT_FOUND:
        return this.createError(
          ERROR_CODES.API_ERROR,
          'Resource not found',
          statusCode,
          undefined,
          responseBody
        );
        
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return this.createError(
          ERROR_CODES.API_ERROR,
          'Server error occurred',
          statusCode,
          undefined,
          responseBody
        );
        
      default:
        return this.createError(
          ERROR_CODES.API_ERROR,
          `HTTP ${statusCode}: ${response.statusText}`,
          statusCode,
          undefined,
          responseBody
        );
    }
  }

  parseNetworkError(error: Error): APIError {
    return this.createError(
      ERROR_CODES.NETWORK_ERROR,
      `Network error: ${error.message}`,
      undefined,
      undefined,
      { originalError: error.message }
    );
  }

  parseValidationError(message: string, details?: any): APIError {
    return this.createError(
      ERROR_CODES.VALIDATION_ERROR,
      message,
      undefined,
      undefined,
      details
    );
  }

  parseUnknownError(error: unknown): APIError {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return this.createError(
      ERROR_CODES.UNKNOWN_ERROR,
      message,
      undefined,
      undefined,
      { originalError: error }
    );
  }

  shouldRetry(error: APIError, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Don't retry client errors (4xx) except rate limiting
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return error.code === ERROR_CODES.RATE_LIMITED;
    }

    // Retry server errors (5xx) and network errors
    if (error.statusCode && error.statusCode >= 500) {
      return true;
    }

    if (error.code === ERROR_CODES.NETWORK_ERROR) {
      return true;
    }

    return false;
  }

  calculateRetryDelay(attempt: number, error?: APIError): number {
    // If error specifies retry-after, use that
    if (error?.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: APIError | undefined;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error 
          ? this.parseUnknownError(error)
          : error as APIError;

        if (attempt <= this.retryConfig.maxRetries && this.shouldRetry(lastError, attempt)) {
          const delay = this.calculateRetryDelay(attempt, lastError);
          
          console.warn(
            `${context || 'Operation'} failed (attempt ${attempt}/${this.retryConfig.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }

    throw lastError;
  }

  private parseRetryAfter(retryAfterHeader: string | null): number | undefined {
    if (!retryAfterHeader) return undefined;
    
    const retryAfter = parseInt(retryAfterHeader, 10);
    return isNaN(retryAfter) ? undefined : retryAfter;
  }

  isRetryableError(error: APIError): boolean {
    return this.shouldRetry(error, 0);
  }

  getErrorSeverity(error: APIError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case ERROR_CODES.RATE_LIMITED:
        return 'medium';
      case ERROR_CODES.TOKEN_EXPIRED:
      case ERROR_CODES.TOKEN_INVALID:
        return 'high';
      case ERROR_CODES.VALIDATION_ERROR:
        return 'low';
      case ERROR_CODES.NETWORK_ERROR:
        return 'medium';
      case ERROR_CODES.API_ERROR:
        if (error.statusCode && error.statusCode >= 500) {
          return 'high';
        }
        return 'medium';
      default:
        return 'critical';
    }
  }
}