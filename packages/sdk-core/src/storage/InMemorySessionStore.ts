import type { SessionStore } from "../core/interfaces.js";
import type { NodeSavedSession } from "@atproto/oauth-client-node";

/**
 * In-memory implementation of the SessionStore interface.
 *
 * This store keeps OAuth sessions in memory using a Map. It's intended
 * for development, testing, and simple use cases where session persistence
 * across restarts is not required.
 *
 * @remarks
 * **Warning**: This implementation is **not suitable for production** because:
 * - Sessions are lost when the process restarts
 * - Sessions cannot be shared across multiple server instances
 * - No automatic cleanup of expired sessions
 *
 * For production, implement {@link SessionStore} with a persistent backend:
 * - **Redis**: Good for distributed systems, supports TTL
 * - **PostgreSQL/MySQL**: Good for existing database infrastructure
 * - **MongoDB**: Good for document-based storage
 *
 * @example Basic usage
 * ```typescript
 * import { InMemorySessionStore } from "@hypercerts-org/sdk/storage";
 *
 * const sessionStore = new InMemorySessionStore();
 *
 * const sdk = new ATProtoSDK({
 *   oauth: { ... },
 *   storage: {
 *     sessionStore,  // Will warn in logs for production
 *   },
 * });
 * ```
 *
 * @example Testing usage
 * ```typescript
 * const sessionStore = new InMemorySessionStore();
 *
 * // After tests, clean up
 * sessionStore.clear();
 * ```
 *
 * @see {@link SessionStore} for the interface definition
 * @see {@link InMemoryStateStore} for the corresponding state store
 */
export class InMemorySessionStore implements SessionStore {
  /**
   * Internal storage for sessions, keyed by DID.
   * @internal
   */
  private sessions = new Map<string, NodeSavedSession>();

  /**
   * Retrieves a session by DID.
   *
   * @param did - The user's Decentralized Identifier
   * @returns Promise resolving to the session, or `undefined` if not found
   *
   * @example
   * ```typescript
   * const session = await sessionStore.get("did:plc:abc123");
   * if (session) {
   *   console.log("Session found");
   * }
   * ```
   */
  async get(did: string): Promise<NodeSavedSession | undefined> {
    return this.sessions.get(did);
  }

  /**
   * Stores or updates a session.
   *
   * @param did - The user's DID to use as the key
   * @param session - The session data to store
   *
   * @remarks
   * If a session already exists for the DID, it is overwritten.
   *
   * @example
   * ```typescript
   * await sessionStore.set("did:plc:abc123", sessionData);
   * ```
   */
  async set(did: string, session: NodeSavedSession): Promise<void> {
    this.sessions.set(did, session);
  }

  /**
   * Deletes a session by DID.
   *
   * @param did - The DID of the session to delete
   *
   * @remarks
   * If no session exists for the DID, this is a no-op.
   *
   * @example
   * ```typescript
   * await sessionStore.del("did:plc:abc123");
   * ```
   */
  async del(did: string): Promise<void> {
    this.sessions.delete(did);
  }

  /**
   * Clears all stored sessions.
   *
   * This is primarily useful for testing to ensure a clean state
   * between test runs.
   *
   * @remarks
   * This method is synchronous (not async) for convenience in test cleanup.
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   sessionStore.clear();
   * });
   * ```
   */
  clear(): void {
    this.sessions.clear();
  }
}
