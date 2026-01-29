import { BlobRef, type LexiconDoc } from "@atproto/lexicon";
import type { Session } from "../../src/core/types.js";

/**
 * Create a mock OAuth session for testing
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  const defaultFetchHandler = async (_url: string, _options?: RequestInit): Promise<Response> => {
    // Mock fetch handler - tests will override this
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const mockSession = {
    sub: "did:plc:testdid123456789012345678901234567890",
    did: "did:plc:testdid123456789012345678901234567890",
    server: {
      request: async (url: string, options?: RequestInit) => defaultFetchHandler(url, options),
    },
    serverMetadata: {
      issuer: "https://pds.example.com",
      authorization_endpoint: "https://pds.example.com/oauth/authorize",
      token_endpoint: "https://pds.example.com/oauth/token",
      token_endpoint_auth_methods_supported: ["private_key_jwt"],
      code_challenge_methods_supported: ["S256"],
      dpop_signing_alg_values_supported: ["ES256"],
    },
    fetchHandler: overrides?.fetchHandler ?? defaultFetchHandler,
    getTokenInfo: async () => ({
      expiresAt: new Date(Date.now() + 3600 * 1000),
      expired: false,
      scope: "atproto",
      iss: "https://pds.example.com",
      aud: "https://example.com/atproto-client-metadata.json",
      sub: "did:plc:testdid123456789012345678901234567890",
    }),
    signOut: async () => {},
    sessionGetter: async () => null,
    dpopFetch: async (url: string, options?: RequestInit) => defaultFetchHandler(url, options),
    getTokenSet: async () => null,
    ...overrides,
  } as unknown as Session;

  return mockSession;
}

/**
 * Create a mock lexicon document for testing
 */
export function createMockLexicon(id: string): LexiconDoc {
  return {
    lexicon: 1,
    id,
    defs: {
      record: {
        type: "record" as const,
        record: {
          type: "object" as const,
          properties: {
            text: { type: "string" as const },
          },
        },
      },
    },
  } as LexiconDoc;
}

/**
 * Create a mock blob reference (JSON format)
 */
export function createMockBlobRef(): {
  $type: string;
  ref: { $link: string };
  mimeType: string;
  size: number;
} {
  return {
    $type: "blob",
    ref: { $link: "bafyrei..." },
    mimeType: "image/png",
    size: 1024,
  };
}

/**
 * Create a mock BlobRef instance (class instance with .ipld() method)
 */
export function createMockBlobRefInstance(
  cid: string = "bafyrei...",
  mimeType: string = "image/png",
  size: number = 1024,
): BlobRef {
  return new BlobRef(cid, mimeType, size);
}
