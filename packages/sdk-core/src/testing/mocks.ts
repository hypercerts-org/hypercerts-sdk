/**
 * Mock factories for testing.
 *
 * This module provides factory functions to create mock objects
 * for testing SDK functionality without real AT Protocol connections.
 *
 * @packageDocumentation
 */

import type { Session } from "../core/types.js";
import type { ATProtoSDKConfig } from "../core/config.js";

/**
 * Creates a mock OAuth session for testing.
 *
 * The mock session includes all required properties and a mock
 * `fetchHandler` that returns empty successful responses by default.
 *
 * @param overrides - Partial session object to override default values
 * @returns A mock Session object suitable for testing
 *
 * @remarks
 * The mock session is cast to `Session` type for compatibility.
 * In real usage, sessions come from the OAuth flow and contain
 * actual tokens and a real fetch handler.
 *
 * **Default Values**:
 * - `did`: `"did:plc:test123"`
 * - `handle`: `"test.bsky.social"`
 * - `fetchHandler`: Returns `Response` with `{}` body
 *
 * @example Basic mock session
 * ```typescript
 * import { createMockSession } from "@hypercerts-org/sdk/testing";
 *
 * const session = createMockSession();
 * const repo = sdk.repository(session);
 * ```
 *
 * @example With custom DID
 * ```typescript
 * const session = createMockSession({
 *   did: "did:plc:custom-test-user",
 *   handle: "custom.bsky.social",
 * });
 * ```
 *
 * @example With custom fetch handler
 * ```typescript
 * const session = createMockSession({
 *   fetchHandler: async (url, init) => {
 *     // Custom response logic
 *     return new Response(JSON.stringify({ success: true }));
 *   },
 * });
 * ```
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const mockSession = {
    did: "did:plc:test123",
    sub: "did:plc:test123",
    handle: "test.bsky.social",
    accessJwt: "mock-access-jwt",
    refreshJwt: "mock-refresh-jwt",
    active: true,
    fetchHandler: async (input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    ...overrides,
  } as unknown as Session;

  return mockSession;
}

/**
 * Creates a mock SDK configuration for testing.
 *
 * The configuration includes all required OAuth settings with
 * placeholder values suitable for testing (not real credentials).
 *
 * @param overrides - Partial configuration to override default values
 * @returns A complete ATProtoSDKConfig suitable for testing
 *
 * @remarks
 * The default configuration uses example.com domains and a minimal
 * JWK structure. This is sufficient for unit tests but won't work
 * for integration tests that require real OAuth flows.
 *
 * **Default Values**:
 * - `clientId`: `"https://test.example.com/client-metadata.json"`
 * - `pds`: `"https://bsky.social"`
 * - `sds`: `"https://sds.example.com"`
 *
 * @example Basic test config
 * ```typescript
 * import { createTestConfig } from "@hypercerts-org/sdk/testing";
 *
 * const config = createTestConfig();
 * const sdk = new ATProtoSDK(config);
 * ```
 *
 * @example With custom PDS
 * ```typescript
 * const config = createTestConfig({
 *   servers: {
 *     pds: "https://custom-pds.example.com",
 *   },
 * });
 * ```
 *
 * @example With logger for debugging tests
 * ```typescript
 * const config = createTestConfig({
 *   logger: console,
 * });
 * ```
 */
export function createTestConfig(overrides: Partial<ATProtoSDKConfig> = {}): ATProtoSDKConfig {
  return {
    oauth: {
      clientId: "https://test.example.com/client-metadata.json",
      redirectUri: "https://test.example.com/callback",
      scope: "atproto transition:generic",
      jwksUri: "https://test.example.com/jwks.json",
      jwkPrivate: JSON.stringify({
        kty: "EC",
        crv: "P-256",
        x: "test",
        y: "test",
        d: "test",
      }),
    },
    servers: {
      pds: "https://bsky.social",
      sds: "https://sds.example.com",
    },
    ...overrides,
  };
}
