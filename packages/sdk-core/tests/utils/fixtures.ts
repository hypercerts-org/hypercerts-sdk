import { generateKeyPair, exportJWK } from "jose";
import { randomUUID } from "crypto";
import type { ATProtoSDKConfig } from "../../src/core/config.js";

/**
 * Generate a valid test JWK private key using jose
 * Creates a real ES256 keypair for testing
 */
let cachedTestJWK: string | null = null;

export async function createTestJWK(): Promise<string> {
  if (cachedTestJWK) {
    return cachedTestJWK;
  }

  // Generate ES256 keypair
  const { privateKey } = await generateKeyPair("ES256", {
    extractable: true,
  });

  // Generate a unique key ID
  const kid = randomUUID();

  // Export private key to JWK format
  const privateJWK = await exportJWK(privateKey);
  privateJWK.kid = kid;
  privateJWK.alg = "ES256";
  // Use key_ops instead of 'use' (deprecated)
  privateJWK.key_ops = ["sign"];

  // Create keyset
  const privateKeyset = {
    keys: [privateJWK],
  };

  cachedTestJWK = JSON.stringify(privateKeyset);
  return cachedTestJWK;
}

/**
 * Synchronous version that uses a pre-generated JWK
 * For tests that don't need async setup
 */
export function createTestJWKSync(): string {
  // Return a minimal valid structure - tests will need to handle async JWK generation
  // For most tests, we can use a cached version
  if (cachedTestJWK) {
    return cachedTestJWK;
  }
  // Fallback - will fail in actual OAuth client but allows SDK construction tests
  return JSON.stringify({
    keys: [
      {
        kid: "test-key-1",
        kty: "EC",
        crv: "P-256",
        x: "test-x",
        y: "test-y",
        d: "test-d",
      },
    ],
  });
}

/**
 * Create a minimal valid SDK configuration for testing
 * Note: Storage is now optional - will use in-memory defaults if not provided
 */
export function createTestConfig(overrides?: Partial<ATProtoSDKConfig>): ATProtoSDKConfig {
  return {
    oauth: {
      clientId: "https://example.com/atproto-client-metadata.json",
      redirectUri: "https://example.com/api/auth/atproto/callback",
      scope: "atproto",
      jwksUri: "https://example.com/jwks.json",
      jwkPrivate: createTestJWKSync(),
      ...overrides?.oauth,
    },
    handleResolver: overrides?.handleResolver ?? "https://pds-eu-west4.test.certified.app",
    servers: {
      ...overrides?.servers,
    },
    storage: overrides?.storage,
    cache: overrides?.cache,
    logger: overrides?.logger,
    fetch: overrides?.fetch,
    timeouts: overrides?.timeouts,
  };
}

/**
 * Create a test config with a real JWK (async)
 * Use this for tests that need actual OAuth client functionality
 */
export async function createTestConfigAsync(overrides?: Partial<ATProtoSDKConfig>): Promise<ATProtoSDKConfig> {
  const jwkPrivate = await createTestJWK();

  return {
    oauth: {
      clientId: "https://example.com/atproto-client-metadata.json",
      redirectUri: "https://example.com/api/auth/atproto/callback",
      scope: "atproto",
      jwksUri: "https://example.com/jwks.json",
      jwkPrivate,
      ...overrides?.oauth,
    },
    handleResolver: overrides?.handleResolver ?? "https://pds-eu-west4.test.certified.app",
    servers: {
      ...overrides?.servers,
    },
    storage: overrides?.storage,
    cache: overrides?.cache,
    logger: overrides?.logger,
    fetch: overrides?.fetch,
    timeouts: overrides?.timeouts,
  };
}
