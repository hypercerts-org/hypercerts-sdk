/**
 * Base error class for all SDK errors.
 *
 * All errors thrown by the Hypercerts SDK extend this class, making it easy
 * to catch and handle SDK-specific errors.
 *
 * @example Catching all SDK errors
 * ```typescript
 * try {
 *   await sdk.authorize("user.bsky.social");
 * } catch (error) {
 *   if (error instanceof ATProtoSDKError) {
 *     console.error(`SDK Error [${error.code}]: ${error.message}`);
 *     console.error(`HTTP Status: ${error.status}`);
 *   }
 * }
 * ```
 *
 * @example Checking error codes
 * ```typescript
 * try {
 *   await repo.records.get(collection, rkey);
 * } catch (error) {
 *   if (error instanceof ATProtoSDKError) {
 *     switch (error.code) {
 *       case "AUTHENTICATION_ERROR":
 *         // Redirect to login
 *         break;
 *       case "VALIDATION_ERROR":
 *         // Show form errors
 *         break;
 *       case "NETWORK_ERROR":
 *         // Retry or show offline message
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class ATProtoSDKError extends Error {
  /**
   * Creates a new SDK error.
   *
   * @param message - Human-readable error description
   * @param code - Machine-readable error code for programmatic handling
   * @param status - HTTP status code associated with this error type
   * @param cause - The underlying error that caused this error, if any
   */
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
 * Error thrown when authentication fails.
 *
 * This error indicates problems with the OAuth flow, invalid credentials,
 * or failed token exchanges. Common causes:
 * - Invalid authorization code
 * - Expired or invalid state parameter
 * - Revoked or invalid tokens
 * - User denied authorization
 *
 * @example
 * ```typescript
 * try {
 *   const session = await sdk.callback(params);
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     // Clear any stored state and redirect to login
 *     console.error("Authentication failed:", error.message);
 *   }
 * }
 * ```
 */
export class AuthenticationError extends ATProtoSDKError {
  /**
   * Creates an authentication error.
   *
   * @param message - Description of what went wrong during authentication
   * @param cause - The underlying error (e.g., from the OAuth client)
   */
  constructor(message: string, cause?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, cause);
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when a session has expired and cannot be refreshed.
 *
 * This typically occurs when:
 * - The refresh token has expired (usually after extended inactivity)
 * - The user has revoked access to your application
 * - The PDS has invalidated all sessions for the user
 *
 * When this error occurs, the user must re-authenticate.
 *
 * @example
 * ```typescript
 * try {
 *   const session = await sdk.restoreSession(did);
 * } catch (error) {
 *   if (error instanceof SessionExpiredError) {
 *     // Clear stored session and prompt user to log in again
 *     localStorage.removeItem("userDid");
 *     window.location.href = "/login";
 *   }
 * }
 * ```
 */
export class SessionExpiredError extends ATProtoSDKError {
  /**
   * Creates a session expired error.
   *
   * @param message - Description of why the session expired
   * @param cause - The underlying error from the token refresh attempt
   */
  constructor(message: string = "Session expired", cause?: unknown) {
    super(message, "SESSION_EXPIRED", 401, cause);
    this.name = "SessionExpiredError";
  }
}

/**
 * Error thrown when input validation fails.
 *
 * This error indicates that provided data doesn't meet the required format
 * or constraints. Common causes:
 * - Missing required fields
 * - Invalid URL formats
 * - Invalid DID format
 * - Schema validation failures for records
 * - Invalid configuration values
 *
 * @example
 * ```typescript
 * try {
 *   await sdk.authorize("");  // Empty identifier
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error("Invalid input:", error.message);
 *     // Show validation error to user
 *   }
 * }
 * ```
 *
 * @example With Zod validation cause
 * ```typescript
 * try {
 *   await repo.records.create(collection, record);
 * } catch (error) {
 *   if (error instanceof ValidationError && error.cause) {
 *     // error.cause may be a ZodError with detailed field errors
 *     const zodError = error.cause as ZodError;
 *     zodError.errors.forEach(e => {
 *       console.error(`Field ${e.path.join(".")}: ${e.message}`);
 *     });
 *   }
 * }
 * ```
 */
export class ValidationError extends ATProtoSDKError {
  /**
   * Creates a validation error.
   *
   * @param message - Description of what validation failed
   * @param cause - The underlying validation error (e.g., ZodError)
   */
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", 400, cause);
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when a network request fails.
 *
 * This error indicates connectivity issues or server unavailability.
 * Common causes:
 * - No internet connection
 * - DNS resolution failure
 * - Server timeout
 * - Server returned 5xx error
 * - TLS/SSL errors
 *
 * These errors are typically transient and may succeed on retry.
 *
 * @example
 * ```typescript
 * try {
 *   await repo.records.list(collection);
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     // Implement retry logic or show offline indicator
 *     console.error("Network error:", error.message);
 *     await retryWithBackoff(() => repo.records.list(collection));
 *   }
 * }
 * ```
 */
export class NetworkError extends ATProtoSDKError {
  /**
   * Creates a network error.
   *
   * @param message - Description of the network failure
   * @param cause - The underlying error (e.g., fetch error, timeout)
   */
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", 503, cause);
    this.name = "NetworkError";
  }
}

/**
 * Error thrown when an SDS-only operation is attempted on a PDS.
 *
 * Certain operations are only available on Shared Data Servers (SDS),
 * such as collaborator management and organization operations.
 * This error is thrown when these operations are attempted on a
 * Personal Data Server (PDS).
 *
 * @example
 * ```typescript
 * const pdsRepo = sdk.repository(session);  // Default is PDS
 *
 * try {
 *   // This will throw SDSRequiredError
 *   await pdsRepo.collaborators.list();
 * } catch (error) {
 *   if (error instanceof SDSRequiredError) {
 *     // Switch to SDS for this operation
 *     const sdsRepo = sdk.repository(session, { server: "sds" });
 *     const collaborators = await sdsRepo.collaborators.list();
 *   }
 * }
 * ```
 */
export class SDSRequiredError extends ATProtoSDKError {
  /**
   * Creates an SDS required error.
   *
   * @param message - Description of which operation requires SDS
   * @param cause - Any underlying error
   */
  constructor(message: string = "This operation requires a Shared Data Server (SDS)", cause?: unknown) {
    super(message, "SDS_REQUIRED", 400, cause);
    this.name = "SDSRequiredError";
  }
}
