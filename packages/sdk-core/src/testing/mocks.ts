/**
 * Mock factories for testing
 * @packageDocumentation
 */

import type { Session } from "../core/types.js";
import type { ATProtoSDKConfig } from "../core/config.js";

/**
 * Create a mock session for testing
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
 * Create a mock SDK configuration for testing
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
