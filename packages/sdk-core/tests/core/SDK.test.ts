import { beforeEach, describe, expect, it } from "vitest";
import { ATProtoSDK, createATProtoSDK } from "../../src/core/SDK.js";
import { ValidationError } from "../../src/core/errors.js";
import { createTestConfigAsync } from "../utils/fixtures.js";
import { InMemorySessionStore, InMemoryStateStore } from "../utils/mocks.js";
import { createMockSession } from "../utils/repository-fixtures.js";

describe("ATProtoSDK", () => {
  let config: Awaited<ReturnType<typeof createTestConfigAsync>>;

  beforeEach(async () => {
    config = await createTestConfigAsync();
  });

  describe("constructor", () => {
    it("should create SDK instance with valid config", () => {
      const sdk = new ATProtoSDK(config);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });

    it("should validate config with Zod schema", () => {
      const invalidConfig = {
        ...config,
        oauth: {
          ...config.oauth,
          clientId: "not-a-url", // Invalid URL
        },
      };

      expect(() => new ATProtoSDK(invalidConfig)).toThrow(ValidationError);
      expect(() => new ATProtoSDK(invalidConfig)).toThrow("Invalid SDK configuration");
    });

    it("should accept optional cache", async () => {
      const { InMemoryCache } = await import("../utils/mocks.js");
      const cache = new InMemoryCache();
      const configWithCache = await createTestConfigAsync({ cache });
      expect(() => new ATProtoSDK(configWithCache)).not.toThrow();
    });

    it("should accept optional logger", async () => {
      const { MockLogger } = await import("../utils/mocks.js");
      const logger = new MockLogger();
      const configWithLogger = await createTestConfigAsync({ logger });
      expect(() => new ATProtoSDK(configWithLogger)).not.toThrow();
    });

    it("should work without storage (uses in-memory defaults)", async () => {
      const config = await createTestConfigAsync();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { storage, ...configWithoutStorage } = config;
      // Storage is optional - SDK will use in-memory defaults
      const sdk = new ATProtoSDK(configWithoutStorage);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });
  });

  describe("createATProtoSDK factory", () => {
    it("should create SDK instance", () => {
      const sdk = createATProtoSDK(config);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });

    it("should be equivalent to constructor", () => {
      const sdk1 = new ATProtoSDK(config);
      const sdk2 = createATProtoSDK(config);
      expect(sdk1).toBeInstanceOf(ATProtoSDK);
      expect(sdk2).toBeInstanceOf(ATProtoSDK);
    });
  });

  describe("authorize", () => {
    it("should throw ValidationError for empty identifier", async () => {
      const sdk = new ATProtoSDK(config);
      await expect(sdk.authorize("")).rejects.toThrow(ValidationError);
      await expect(sdk.authorize("   ")).rejects.toThrow(ValidationError);
    });

    it("should trim identifier", async () => {
      const sdk = new ATProtoSDK(config);
      // Will fail due to network, but should not throw ValidationError
      await expect(sdk.authorize("  test.bsky.social  ")).rejects.not.toThrow(ValidationError);
    });
  });

  describe("restoreSession", () => {
    it("should throw ValidationError for empty DID", async () => {
      const sdk = new ATProtoSDK(config);
      await expect(sdk.restoreSession("")).rejects.toThrow(ValidationError);
      await expect(sdk.restoreSession("   ")).rejects.toThrow(ValidationError);
    });

    it("should handle non-existent session", async () => {
      const sdk = new ATProtoSDK(config);
      // Use valid DID format - will fail due to network but tests error handling
      const validDid = "did:plc:abcdefghijklmnopqrstuvwxyz123456";
      // This will fail due to network/DID validation
      await expect(sdk.restoreSession(validDid)).rejects.toThrow();
    });
  });

  describe("revokeSession", () => {
    it("should throw ValidationError for empty DID", async () => {
      const sdk = new ATProtoSDK(config);
      await expect(sdk.revokeSession("")).rejects.toThrow(ValidationError);
      await expect(sdk.revokeSession("   ")).rejects.toThrow(ValidationError);
    });
  });

  describe("getAccountEmail", () => {
    it("should throw ValidationError for null session", async () => {
      const sdk = new ATProtoSDK(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(sdk.getAccountEmail(null as any)).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when PDS not configured", async () => {
      const configWithoutPds = await createTestConfigAsync();
      delete configWithoutPds.servers;
      const sdk = new ATProtoSDK(configWithoutPds);
      const mockSession = createMockSession();
      await expect(sdk.getAccountEmail(mockSession)).rejects.toThrow(ValidationError);
      await expect(sdk.getAccountEmail(mockSession)).rejects.toThrow("PDS server URL not configured");
    });

    it("should return email info when permission granted", async () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession({
        fetchHandler: async () =>
          new Response(
            JSON.stringify({
              did: "did:plc:testdid123456789012345678901234567890",
              handle: "test.bsky.social",
              email: "test@example.com",
              emailConfirmed: true,
            }),
            { status: 200 },
          ),
      });

      const result = await sdk.getAccountEmail(mockSession);
      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.emailConfirmed).toBe(true);
    });

    it("should return null when permission not granted", async () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession({
        fetchHandler: async () =>
          new Response(
            JSON.stringify({
              did: "did:plc:testdid123456789012345678901234567890",
              handle: "test.bsky.social",
              // No email field - permission not granted
            }),
            { status: 200 },
          ),
      });

      const result = await sdk.getAccountEmail(mockSession);
      expect(result).toBeNull();
    });

    it("should default emailConfirmed to false when not provided", async () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession({
        fetchHandler: async () =>
          new Response(
            JSON.stringify({
              did: "did:plc:testdid123456789012345678901234567890",
              handle: "test.bsky.social",
              email: "test@example.com",
              // emailConfirmed not provided
            }),
            { status: 200 },
          ),
      });

      const result = await sdk.getAccountEmail(mockSession);
      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.emailConfirmed).toBe(false);
    });

    it("should throw NetworkError on API failure", async () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession({
        fetchHandler: async () =>
          new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            statusText: "Internal Server Error",
          }),
      });

      await expect(sdk.getAccountEmail(mockSession)).rejects.toThrow("Failed to get session info");
    });

    it("should throw NetworkError on network failure", async () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession({
        fetchHandler: async () => {
          throw new Error("Network error");
        },
      });

      await expect(sdk.getAccountEmail(mockSession)).rejects.toThrow("Failed to get account email");
    });
  });

  describe("repository", () => {
    it("should throw ValidationError when session is null", () => {
      const sdk = new ATProtoSDK(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => sdk.repository(null as any)).toThrow(ValidationError);
    });

    it("should throw ValidationError when PDS not configured and no server specified", async () => {
      const configWithoutServers = await createTestConfigAsync();
      delete configWithoutServers.servers;
      const sdk = new ATProtoSDK(configWithoutServers);
      const mockSession = createMockSession();
      expect(() => sdk.repository(mockSession)).toThrow(ValidationError);
    });

    it("should throw ValidationError when SDS not configured and server=sds", async () => {
      const configWithOnlyPds = await createTestConfigAsync();
      configWithOnlyPds.servers = { pds: "https://pds.example.com" };
      const sdk = new ATProtoSDK(configWithOnlyPds);
      const mockSession = createMockSession();
      expect(() => sdk.repository(mockSession, { server: "sds" })).toThrow(ValidationError);
    });

    it("should create repository with custom serverUrl", () => {
      const sdk = new ATProtoSDK(config);
      const mockSession = createMockSession();
      const repo = sdk.repository(mockSession, { serverUrl: "https://custom.server.com" });
      expect(repo).toBeDefined();
      expect(repo.getServerUrl()).toBe("https://custom.server.com");
    });
  });

  describe("setup examples", () => {
    it("should work with minimal config (no storage provided)", async () => {
      const minimalConfig = await createTestConfigAsync();
      // Remove storage to test default in-memory implementation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { storage, ...configWithoutStorage } = minimalConfig;
      // Storage is optional - SDK will use in-memory defaults
      const sdk = createATProtoSDK(configWithoutStorage);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });

    it("should work with all optional fields", async () => {
      const { InMemoryCache, MockLogger } = await import("../utils/mocks.js");
      const fullConfig = await createTestConfigAsync({
        cache: new InMemoryCache(),
        logger: new MockLogger(),
        timeouts: {
          pdsMetadata: 60000,
          apiRequests: 45000,
        },
      });
      const sdk = createATProtoSDK(fullConfig);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });

    it("should work with custom storage implementations", async () => {
      const customConfig = await createTestConfigAsync({
        storage: {
          sessionStore: new InMemorySessionStore(),
          stateStore: new InMemoryStateStore(),
        },
      });
      const sdk = createATProtoSDK(customConfig);
      expect(sdk).toBeInstanceOf(ATProtoSDK);
    });
  });

  describe("getLexiconRegistry", () => {
    it("should return LexiconRegistry instance", () => {
      const sdk = new ATProtoSDK(config);
      const registry = sdk.getLexiconRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.isRegistered).toBe("function");
      expect(typeof registry.validate).toBe("function");
    });

    it("should return registry initialized with hypercert lexicons", () => {
      const sdk = new ATProtoSDK(config);
      const registry = sdk.getLexiconRegistry();

      // Verify at least some hypercert lexicons are registered
      // (Some lexicons may not be exported from the lexicon package yet)
      const registeredLexicons = registry.getAll();
      expect(registeredLexicons.length).toBeGreaterThan(0);

      // Check for known lexicons that should be available
      expect(registry.isRegistered("org.hypercerts.claim.activity")).toBe(true);
    });

    it("should allow registering custom lexicons", () => {
      const sdk = new ATProtoSDK(config);
      const registry = sdk.getLexiconRegistry();

      const customLexicon = {
        lexicon: 1,
        id: "org.test.custom",
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type", "title"],
              properties: {
                $type: { type: "string", const: "org.test.custom" },
                title: { type: "string" },
              },
            },
          },
        },
      };

      registry.registerFromJSON(customLexicon);
      expect(registry.isRegistered("org.test.custom")).toBe(true);
    });
  });
});
