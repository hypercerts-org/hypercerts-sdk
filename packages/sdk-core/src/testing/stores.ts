/**
 * Mock storage implementations for testing
 * @packageDocumentation
 */

import type { SessionStore, StateStore } from "../core/interfaces.js";
import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";

/**
 * Mock session store that tracks all operations
 */
export class MockSessionStore implements SessionStore {
  private store = new Map<string, NodeSavedSession>();
  public getCalls: string[] = [];
  public setCalls: Array<{ did: string; session: NodeSavedSession }> = [];
  public delCalls: string[] = [];

  async get(did: string): Promise<NodeSavedSession | undefined> {
    this.getCalls.push(did);
    return this.store.get(did);
  }

  async set(did: string, session: NodeSavedSession): Promise<void> {
    this.setCalls.push({ did, session });
    this.store.set(did, session);
  }

  async del(did: string): Promise<void> {
    this.delCalls.push(did);
    this.store.delete(did);
  }

  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}

/**
 * Mock state store that tracks all operations
 */
export class MockStateStore implements StateStore {
  private store = new Map<string, NodeSavedState>();
  public getCalls: string[] = [];
  public setCalls: Array<{ key: string; state: NodeSavedState }> = [];
  public delCalls: string[] = [];

  async get(key: string): Promise<NodeSavedState | undefined> {
    this.getCalls.push(key);
    return this.store.get(key);
  }

  async set(key: string, state: NodeSavedState): Promise<void> {
    this.setCalls.push({ key, state });
    this.store.set(key, state);
  }

  async del(key: string): Promise<void> {
    this.delCalls.push(key);
    this.store.delete(key);
  }

  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}
