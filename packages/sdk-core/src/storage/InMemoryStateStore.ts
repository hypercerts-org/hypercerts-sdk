import type { StateStore } from "../core/interfaces.js";
import type { NodeSavedState } from "@atproto/oauth-client-node";

/**
 * In-memory implementation of the StateStore interface.
 *
 * This store keeps OAuth state parameters in memory using a Map. State is
 * used during the OAuth authorization flow for CSRF protection and PKCE.
 *
 * @remarks
 * **Warning**: This implementation is **not suitable for production** because:
 * - State is lost when the process restarts (breaking in-progress OAuth flows)
 * - State cannot be shared across multiple server instances
 * - No automatic cleanup of expired state (memory leak potential)
 *
 * For production, implement {@link StateStore} with a persistent backend
 * that supports TTL (time-to-live):
 * - **Redis**: Ideal choice with built-in TTL support
 * - **Database with cleanup job**: PostgreSQL/MySQL with periodic cleanup
 *
 * **State Lifecycle**:
 * 1. Created when user starts OAuth flow (`authorize()`)
 * 2. Retrieved and validated during callback
 * 3. Deleted after successful or failed callback
 * 4. Should expire after ~15 minutes if callback never happens
 *
 * @example Basic usage
 * ```typescript
 * import { InMemoryStateStore } from "@hypercerts-org/sdk/storage";
 *
 * const stateStore = new InMemoryStateStore();
 *
 * const sdk = new ATProtoSDK({
 *   oauth: { ... },
 *   storage: {
 *     stateStore,  // Will warn in logs for production
 *   },
 * });
 * ```
 *
 * @example Testing usage
 * ```typescript
 * const stateStore = new InMemoryStateStore();
 *
 * // After tests, clean up
 * stateStore.clear();
 * ```
 *
 * @see {@link StateStore} for the interface definition
 * @see {@link InMemorySessionStore} for the corresponding session store
 */
export class InMemoryStateStore implements StateStore {
  /**
   * Internal storage for OAuth state, keyed by state string.
   * @internal
   */
  private states = new Map<string, NodeSavedState>();

  /**
   * Retrieves OAuth state by key.
   *
   * @param key - The state key (random string from authorization URL)
   * @returns Promise resolving to the state, or `undefined` if not found
   *
   * @remarks
   * The key is a cryptographically random string generated during
   * the authorization request. It's included in the callback URL
   * and used to retrieve the associated PKCE verifier and other data.
   *
   * @example
   * ```typescript
   * // During OAuth callback
   * const state = await stateStore.get(params.get("state")!);
   * if (!state) {
   *   throw new Error("Invalid or expired state");
   * }
   * ```
   */
  async get(key: string): Promise<NodeSavedState | undefined> {
    return this.states.get(key);
  }

  /**
   * Stores OAuth state temporarily.
   *
   * @param key - The state key to use for storage
   * @param state - The OAuth state data (includes PKCE verifier, etc.)
   *
   * @remarks
   * In production implementations, state should be stored with a TTL
   * of approximately 10-15 minutes to prevent stale state accumulation.
   *
   * @example
   * ```typescript
   * // Called internally by OAuthClient during authorize()
   * await stateStore.set(stateKey, {
   *   // PKCE code verifier, redirect URI, etc.
   * });
   * ```
   */
  async set(key: string, state: NodeSavedState): Promise<void> {
    this.states.set(key, state);
  }

  /**
   * Deletes OAuth state by key.
   *
   * @param key - The state key to delete
   *
   * @remarks
   * Called after the OAuth callback is processed (whether successful or not)
   * to clean up the temporary state.
   *
   * @example
   * ```typescript
   * // After processing callback
   * await stateStore.del(stateKey);
   * ```
   */
  async del(key: string): Promise<void> {
    this.states.delete(key);
  }

  /**
   * Clears all stored state.
   *
   * This is primarily useful for testing to ensure a clean state
   * between test runs.
   *
   * @remarks
   * This method is synchronous (not async) for convenience in test cleanup.
   * In production, be careful using this as it will invalidate all
   * in-progress OAuth flows.
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   stateStore.clear();
   * });
   * ```
   */
  clear(): void {
    this.states.clear();
  }
}
