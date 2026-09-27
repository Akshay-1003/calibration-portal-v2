/**
 * Production-grade API Error class
 * 
 * Provides structured error handling for API responses
 * with proper typing and error categorization.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    status: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Create an ApiError from an HTTP response
   */
  static fromResponse(response: Response, data?: any): ApiError {
    const status = response.status;
    const message = data?.message || data?.error || response.statusText || 'API Error';
    const code = data?.code;
    const details = data?.details;

    return new ApiError(message, status, code, details);
  }

  /**
   * Create an ApiError from a network error
   */
  static fromNetworkError(error: Error): ApiError {
    return new ApiError(
      error.message || 'Network Error',
      0,
      'NETWORK_ERROR',
      { originalError: error }
    );
  }

  /**
   * Check if error is a validation error (400)
   */
  isValidationError(): boolean {
    return this.status === 400;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthenticationError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is an authorization error (403)
   */
  isAuthorizationError(): boolean {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a server error (500+)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.isValidationError()) {
      return this.details?.message || this.message || 'Validation failed';
    }
    
    if (this.isAuthenticationError()) {
      return 'Please log in to continue';
    }
    
    if (this.isAuthorizationError()) {
      return 'You do not have permission to perform this action';
    }
    
    if (this.isNotFoundError()) {
      return 'The requested resource was not found';
    }
    
    if (this.isServerError()) {
      return 'Server error occurred. Please try again later';
    }
    
    return this.message || 'An error occurred';
  }
}

export default ApiError;
