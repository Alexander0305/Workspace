/**
 * API Error Handling Utilities
 * Consistent error responses across all API endpoints
 */

import { NextResponse } from 'next/server'

export class APIError extends Error {
  public statusCode: number
  public code: string
  public details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

// Common error types
export class BadRequestError extends APIError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details)
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter })
  }
}

export class ValidationError extends APIError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, 'VALIDATION_ERROR', { errors })
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error instanceof Error) {
    const message = error.message

    // Prisma unique constraint violation
    if (message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'A record with these values already exists', code: 'CONFLICT' },
        { status: 409 }
      )
    }

    // Prisma record not found
    if (message.includes('Record to update not found') || message.includes('Record to delete not found')) {
      return NextResponse.json(
        { error: 'Record not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Foreign key constraint
    if (message.includes('Foreign key constraint failed')) {
      return NextResponse.json(
        { error: 'Related record not found', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }
  }

  // Generic error - don't expose internal details
  console.error('[API Error]', error)
  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch((error) => createErrorResponse(error))
}

/**
 * Validate request body against a schema
 */
export function validateBody<T>(
  body: unknown,
  requiredFields: string[]
): T {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Request body is required')
  }

  const errors: Array<{ field: string; message: string }> = []

  for (const field of requiredFields) {
    if (!(field in body) || (body as Record<string, unknown>)[field] === undefined) {
      errors.push({ field, message: `${field} is required` })
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }

  return body as T
}

/**
 * Validate and parse ID parameter
 */
export function validateId(id: string | undefined): string {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new BadRequestError('Valid ID is required')
  }
  return id.trim()
}
