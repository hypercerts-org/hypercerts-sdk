import type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "../../src/core/interfaces.js";
import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";

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
