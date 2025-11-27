import type { StateStore } from "../core/interfaces.js";
import type { NodeSavedState } from "@atproto/oauth-client-node";

/**
 * In-memory state store implementation
 *
 * **Note**: This is suitable for development and testing only.
 * For production, use a persistent storage implementation (database, Redis, etc.).
 * OAuth state is lost on server restart, which will cause OAuth flows to fail.
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

  /**
   * Clear all states (useful for testing)
   */
  clear(): void {
    this.states.clear();
  }
}
