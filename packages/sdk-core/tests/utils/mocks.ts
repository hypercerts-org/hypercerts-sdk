import type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "../../src/core/interfaces.js";
import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";
import type { Mock } from "vitest";

/**
 * In-memory session store for testing
 */
export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, NodeSavedSession>();

  async get(did: string): Promise<NodeSavedSession | undefined> {
    return this.sessions.get(did);
  }

  async set(did: string, session: NodeSavedSession): Promise<void> {
    this.sessions.set(did, session);
  }

  async del(did: string): Promise<void> {
    this.sessions.delete(did);
  }

  clear(): void {
    this.sessions.clear();
  }
}

/**
 * In-memory state store for testing
 */
export class InMemoryStateStore implements StateStore {
  private states = new Map<string, NodeSavedState>();

  async get(key: string): Promise<NodeSavedState | undefined> {
    return this.states.get(key);
  }

  async set(key: string, state: NodeSavedState): Promise<void> {
    this.states.set(key, state);
  }

  async del(key: string): Promise<void> {
    this.states.delete(key);
  }

  clear(): void {
    this.states.clear();
  }
}

/**
 * In-memory cache for testing
 */
export class InMemoryCache implements CacheInterface {
  private cache = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Mock logger for testing
 */
export class MockLogger implements LoggerInterface {
  public logs: Array<{ level: string; message: string; args: unknown[] }> = [];

  debug(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "debug", message, args });
  }

  info(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "info", message, args });
  }

  warn(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "warn", message, args });
  }

  error(message: string, ...args: unknown[]): void {
    this.logs.push({ level: "error", message, args });
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Mock types for testing repository operations.
 * These types provide type-safe mocks for Agent and Session objects.
 */

/**
 * Comprehensive mocked Agent type with all possible operations.
 * Test files can include all properties even if some aren't used.
 */
export type MockedAgent = {
  getProfile?: Mock; // Optional - only include if test uses it
  fetchHandler: Mock; // For direct XRPC calls (e.g., SDS blob upload)
  com: {
    atproto: {
      repo: {
        createRecord: Mock;
        putRecord: Mock;
        getRecord: Mock;
        listRecords: Mock;
        deleteRecord: Mock;
        uploadBlob: Mock;
      };
      sync?: {
        getBlob: Mock;
      };
    };
  };
};

/**
 * Mocked Session type for testing SDS operations (CollaboratorOperationsImpl, OrganizationOperationsImpl).
 */
export type MockedSession = {
  did?: string;
  sub: string;
  fetchHandler: Mock;
};

/**
 * Test constants used across repository tests.
 */
export const TEST_REPO_DID = "did:plc:testdid123";
export const TEST_PDS_URL = "https://pds.example.com";
export const TEST_SDS_URL = "https://sds.example.com";

/**
 * Creates a mock Agent with all possible operations.
 * Includes all repo operations, getProfile, and sync.getBlob.
 * Tests can use only the properties they need.
 *
 * @param vi - Vitest's vi object (from vitest import)
 */
export function createMockAgent(vi: typeof import("vitest").vi): MockedAgent {
  return {
    getProfile: vi.fn(),
    fetchHandler: vi.fn(),
    com: {
      atproto: {
        repo: {
          createRecord: vi.fn(),
          putRecord: vi.fn(),
          getRecord: vi.fn(),
          listRecords: vi.fn(),
          deleteRecord: vi.fn(),
          uploadBlob: vi.fn(),
        },
        sync: {
          getBlob: vi.fn(),
        },
      },
    },
  };
}

/**
 * Creates a mock Session for SDS operations.
 *
 * @param vi - Vitest's vi object (from vitest import)
 * @param did - DID to use (defaults to "did:plc:user123")
 */
export function createMockSession(vi: typeof import("vitest").vi, did: string = "did:plc:user123"): MockedSession {
  return {
    did,
    sub: did,
    fetchHandler: vi.fn(),
  };
}

/**
 * Mocked BlobOperations type for testing.
 */
export type MockedBlobOperations = {
  upload: Mock;
  get: Mock;
};

/**
 * Creates a mock BlobOperations for testing ProfileOperationsImpl and HypercertOperationsImpl.
 *
 * @param vi - Vitest's vi object (from vitest import)
 */
export function createMockBlobOperations(vi: typeof import("vitest").vi): MockedBlobOperations {
  return {
    upload: vi.fn(),
    get: vi.fn(),
  };
}
