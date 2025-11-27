/**
 * Errors entrypoint - All SDK error classes.
 *
 * This sub-entrypoint exports all error classes used by the SDK.
 * Import from here when you need to catch or check specific error types.
 *
 * @remarks
 * Import from `@hypercerts-org/sdk/errors`:
 *
 * ```typescript
 * import {
 *   ATProtoSDKError,
 *   AuthenticationError,
 *   ValidationError,
 * } from "@hypercerts-org/sdk/errors";
 * ```
 *
 * **Error Hierarchy**:
 * - {@link ATProtoSDKError} - Base class for all SDK errors
 *   - {@link AuthenticationError} - OAuth/authentication failures
 *   - {@link SessionExpiredError} - Session expired, needs re-auth
 *   - {@link ValidationError} - Input/schema validation failures
 *   - {@link NetworkError} - Network/server errors
 *   - {@link SDSRequiredError} - SDS-only operation on PDS
 *
 * @example Catching specific errors
 * ```typescript
 * import {
 *   ATProtoSDKError,
 *   AuthenticationError,
 *   ValidationError,
 * } from "@hypercerts-org/sdk/errors";
 *
 * try {
 *   await sdk.authorize(identifier);
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.error("Auth failed:", error.message);
 *   } else if (error instanceof ValidationError) {
 *     console.error("Invalid input:", error.message);
 *   } else if (error instanceof ATProtoSDKError) {
 *     console.error(`SDK error [${error.code}]:`, error.message);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

export {
  ATProtoSDKError,
  AuthenticationError,
  SessionExpiredError,
  ValidationError,
  NetworkError,
  SDSRequiredError,
} from "./core/errors.js";
