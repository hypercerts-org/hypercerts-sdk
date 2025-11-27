/**
 * Mock storage implementations for testing.
 *
 * This module provides mock implementations of SessionStore and StateStore
 * that track all operations for verification in tests.
 *
 * @packageDocumentation
 */

import type { SessionStore, StateStore } from "../core/interfaces.js";
import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";

/**
 * Mock session store that tracks all operations.
 *
 * This implementation stores sessions in memory and records all
 * method calls for verification in tests.
 *
 * @remarks
 * Use this in tests to:
 * - Verify that sessions are being stored correctly
 * - Check what DIDs have been accessed
 * - Assert on the number and order of operations
 * - Pre-populate sessions for testing restore flows
 *
 * @example Basic usage
 * ```typescript
 * import { MockSessionStore } from "@hypercerts-org/sdk/testing";
 *
 * const sessionStore = new MockSessionStore();
 * const sdk = new ATProtoSDK({
 *   ...config,
 *   storage: { sessionStore },
 * });
 *
 * // After some operations...
 * expect(sessionStore.setCalls).toHaveLength(1);
 * expect(sessionStore.getCalls).toContain("did:plc:test123");
 * ```
 *
 * @example Pre-populating for tests
 * ```typescript
 * const sessionStore = new MockSessionStore();
 *
 * // Pre-populate a session
 * await sessionStore.set("did:plc:existing", mockSessionData);
 *
 * // Reset tracking (keeps the data)
 * sessionStore.getCalls = [];
 * sessionStore.setCalls = [];
 *
 * // Now test restore behavior
 * const session = await sdk.restoreSession("did:plc:existing");
 * expect(sessionStore.getCalls).toContain("did:plc:existing");
 * ```
 *
 * @example Asserting on operations
 * ```typescript
 * const sessionStore = new MockSessionStore();
 *
 * // ... perform operations ...
 *
 * // Verify session was stored for correct DID
 * expect(sessionStore.setCalls[0].did).toBe("did:plc:expected");
 *
 * // Verify session was deleted on logout
 * expect(sessionStore.delCalls).toContain("did:plc:logged-out");
 * ```
 */
export class MockSessionStore implements SessionStore {
  /**
   * Internal storage for sessions.
   * @internal
   */
  private store = new Map<string, NodeSavedSession>();

  /**
   * Record of all `get()` calls made to this store.
   *
   * Each entry is the DID that was requested.
   */
  public getCalls: string[] = [];

  /**
   * Record of all `set()` calls made to this store.
   *
   * Each entry contains the DID and session that was stored.
   */
  public setCalls: Array<{ did: string; session: NodeSavedSession }> = [];

  /**
   * Record of all `del()` calls made to this store.
   *
   * Each entry is the DID that was deleted.
   */
  public delCalls: string[] = [];

  /**
   * Retrieves a session by DID.
   *
   * Records the call in `getCalls`.
   *
   * @param did - The DID to look up
   * @returns The stored session or undefined
   */
  async get(did: string): Promise<NodeSavedSession | undefined> {
    this.getCalls.push(did);
    return this.store.get(did);
  }

  /**
   * Stores a session.
   *
   * Records the call in `setCalls`.
   *
   * @param did - The DID to store under
   * @param session - The session data to store
   */
  async set(did: string, session: NodeSavedSession): Promise<void> {
    this.setCalls.push({ did, session });
    this.store.set(did, session);
  }

  /**
   * Deletes a session.
   *
   * Records the call in `delCalls`.
   *
   * @param did - The DID to delete
   */
  async del(did: string): Promise<void> {
    this.delCalls.push(did);
    this.store.delete(did);
  }

  /**
   * Resets the store to initial state.
   *
   * Clears all stored sessions and all recorded calls.
   * Call this in `beforeEach` or `afterEach` to ensure test isolation.
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   sessionStore.reset();
   * });
   * ```
   */
  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}

/**
 * Mock state store that tracks all operations.
 *
 * This implementation stores OAuth state in memory and records all
 * method calls for verification in tests.
 *
 * @remarks
 * Use this in tests to:
 * - Verify OAuth state is being created during authorization
 * - Check that state is retrieved during callback
 * - Assert that state is cleaned up after use
 * - Test error handling for missing/invalid state
 *
 * @example Basic usage
 * ```typescript
 * import { MockStateStore } from "@hypercerts-org/sdk/testing";
 *
 * const stateStore = new MockStateStore();
 * const sdk = new ATProtoSDK({
 *   ...config,
 *   storage: { stateStore },
 * });
 *
 * // After authorize()
 * expect(stateStore.setCalls).toHaveLength(1);
 *
 * // After callback()
 * expect(stateStore.getCalls).toHaveLength(1);
 * expect(stateStore.delCalls).toHaveLength(1);
 * ```
 *
 * @example Testing invalid state
 * ```typescript
 * const stateStore = new MockStateStore();
 * // Don't pre-populate - state will be missing
 *
 * // This should fail because state doesn't exist
 * await expect(sdk.callback(params)).rejects.toThrow();
 *
 * // Verify the lookup was attempted
 * expect(stateStore.getCalls).toContain(stateKey);
 * ```
 */
export class MockStateStore implements StateStore {
  /**
   * Internal storage for OAuth state.
   * @internal
   */
  private store = new Map<string, NodeSavedState>();

  /**
   * Record of all `get()` calls made to this store.
   *
   * Each entry is the state key that was requested.
   */
  public getCalls: string[] = [];

  /**
   * Record of all `set()` calls made to this store.
   *
   * Each entry contains the key and state that was stored.
   */
  public setCalls: Array<{ key: string; state: NodeSavedState }> = [];

  /**
   * Record of all `del()` calls made to this store.
   *
   * Each entry is the state key that was deleted.
   */
  public delCalls: string[] = [];

  /**
   * Retrieves OAuth state by key.
   *
   * Records the call in `getCalls`.
   *
   * @param key - The state key to look up
   * @returns The stored state or undefined
   */
  async get(key: string): Promise<NodeSavedState | undefined> {
    this.getCalls.push(key);
    return this.store.get(key);
  }

  /**
   * Stores OAuth state.
   *
   * Records the call in `setCalls`.
   *
   * @param key - The state key to store under
   * @param state - The OAuth state data to store
   */
  async set(key: string, state: NodeSavedState): Promise<void> {
    this.setCalls.push({ key, state });
    this.store.set(key, state);
  }

  /**
   * Deletes OAuth state.
   *
   * Records the call in `delCalls`.
   *
   * @param key - The state key to delete
   */
  async del(key: string): Promise<void> {
    this.delCalls.push(key);
    this.store.delete(key);
  }

  /**
   * Resets the store to initial state.
   *
   * Clears all stored state and all recorded calls.
   * Call this in `beforeEach` or `afterEach` to ensure test isolation.
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   stateStore.reset();
   * });
   * ```
   */
  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}
