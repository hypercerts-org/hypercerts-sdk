/**
 * Base SDK error class
 */
export class ATProtoSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "ATProtoSDKError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, cause);
    this.name = "AuthenticationError";
  }
}

/**
 * Session expired error
 */
export class SessionExpiredError extends ATProtoSDKError {
  constructor(message: string = "Session expired", cause?: unknown) {
    super(message, "SESSION_EXPIRED", 401, cause);
    this.name = "SessionExpiredError";
  }
}

/**
 * Validation error
 */
export class ValidationError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", 400, cause);
    this.name = "ValidationError";
  }
}

/**
 * Network error
 */
export class NetworkError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", 503, cause);
    this.name = "NetworkError";
  }
}

/**
 * SDS required error - thrown when SDS-only operation is attempted on PDS
 */
export class SDSRequiredError extends ATProtoSDKError {
  constructor(message: string = "This operation requires a Shared Data Server (SDS)", cause?: unknown) {
    super(message, "SDS_REQUIRED", 400, cause);
    this.name = "SDSRequiredError";
  }
}
