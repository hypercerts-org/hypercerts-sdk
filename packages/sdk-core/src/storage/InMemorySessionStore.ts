import type { SessionStore } from "../core/interfaces.js";
import type { NodeSavedSession } from "@atproto/oauth-client-node";

/**
 * In-memory session store implementation
 *
 * **Note**: This is suitable for development and testing only.
 * For production, use a persistent storage implementation (database, Redis, etc.).
 * Sessions are lost on server restart.
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

  /**
   * Clear all sessions (useful for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}
