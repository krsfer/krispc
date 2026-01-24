// Comprehensive Error Handling Utilities
// Provides consistent error handling across the application

import { NextResponse } from 'next/server';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  PATTERN_LIMIT_REACHED = 'PATTERN_LIMIT_REACHED',
  COLLECTION_LIMIT_REACHED = 'COLLECTION_LIMIT_REACHED',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',

  // Cache & Sync
  CACHE_ERROR = 'CACHE_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  OFFLINE_ERROR = 'OFFLINE_ERROR',

  // Generic
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: any;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, any>;
  public readonly field?: string;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context: Record<string, any> = {},
    field?: string
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.field = field;
    this.timestamp = new Date();

    Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        field: this.field,
        context: this.context,
        timestamp: this.timestamp.toISOString()
      }
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      400,
      true,
      { value },
      field
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found${id ? ` with id: ${id}` : ''}`,
      404,
      true,
      { resource, id }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, resource?: string) {
    super(
      ErrorCode.RESOURCE_CONFLICT,
      message,
      409,
      true,
      { resource }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      500,
      true,
      { originalError: originalError?.message }
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode?: number) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service}: ${message}`,
      statusCode || 502,
      true,
      { service }
    );
  }
}

// Error response helpers
export function createErrorResponse(error: AppError | Error): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { 
      status: error.statusCode 
    });
  }

  // Handle unexpected errors
  console.error('Unexpected error:', error);
  
  const internalError = new AppError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    500,
    false
  );

  return NextResponse.json(internalError.toJSON(), { 
    status: 500 
  });
}

// Error handling middleware for API routes
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

// Database error parser
export function parseDatabaseError(error: any): AppError {
  // PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return new ConflictError('Resource already exists');
      
      case '23503': // foreign_key_violation
        return new ValidationError('Referenced resource does not exist');
      
      case '23502': // not_null_violation
        return new ValidationError('Required field is missing');
      
      case '23514': // check_violation
        return new ValidationError('Value violates constraint');
      
      case '42P01': // undefined_table
      case '42703': // undefined_column
        return new AppError(
          ErrorCode.DATABASE_ERROR,
          'Database schema error',
          500,
          false
        );
      
      default:
        return new DatabaseError(`Database error: ${error.message}`);
    }
  }

  // Kysely/connection errors
  if (error.message?.includes('connection')) {
    return new AppError(
      ErrorCode.CONNECTION_ERROR,
      'Database connection failed',
      503
    );
  }

  return new DatabaseError(error.message || 'Unknown database error');
}

// Validation error aggregator
export class ValidationErrorCollector {
  private errors: ErrorDetails[] = [];

  add(code: ErrorCode, message: string, field?: string, value?: any): void {
    this.errors.push({
      code,
      message,
      field,
      value
    });
  }

  addRequired(field: string): void {
    this.add(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `${field} is required`,
      field
    );
  }

  addFormat(field: string, expectedFormat: string, value?: any): void {
    this.add(
      ErrorCode.INVALID_FORMAT,
      `${field} must be ${expectedFormat}`,
      field,
      value
    );
  }

  addRange(field: string, min?: number, max?: number, value?: any): void {
    let message = `${field} must be`;
    if (min !== undefined && max !== undefined) {
      message += ` between ${min} and ${max}`;
    } else if (min !== undefined) {
      message += ` at least ${min}`;
    } else if (max !== undefined) {
      message += ` at most ${max}`;
    }

    this.add(
      ErrorCode.VALIDATION_ERROR,
      message,
      field,
      value
    );
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): ErrorDetails[] {
    return [...this.errors];
  }

  throwIfErrors(): void {
    if (this.hasErrors()) {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400,
        true,
        { errors: this.errors }
      );
      throw error;
    }
  }

  clear(): void {
    this.errors = [];
  }
}

// Error logging utility
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const logData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context: context || {}
  };

  if (error instanceof AppError) {
    logData.context = {
      ...logData.context,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      field: error.field,
      appContext: error.context
    };
  }

  // In production, this would send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (DataDog, LogRocket, etc.)
    console.error('[PRODUCTION ERROR]', JSON.stringify(logData));
  } else {
    console.error('[ERROR]', logData);
  }
}

// Retry utility for external services
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new ExternalServiceError(
          'Circuit Breaker',
          'Service temporarily unavailable'
        );
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private readonly maxRequests: number = 100,
    private readonly windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Export common error instances
export const commonErrors = {
  unauthorized: () => new UnauthorizedError(),
  forbidden: () => new ForbiddenError(),
  notFound: (resource: string, id?: string) => new NotFoundError(resource, id),
  validation: (message: string, field?: string) => new ValidationError(message, field),
  conflict: (message: string) => new ConflictError(message),
  database: (message: string) => new DatabaseError(message),
  externalService: (service: string, message: string) => new ExternalServiceError(service, message)
};