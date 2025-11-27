import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";

/**
 * Session store for OAuth sessions
 * Stores NodeSavedSession objects which include DPoP keys, tokens, and OAuth state
 */
export interface SessionStore {
  /**
   * Retrieve a session by DID (sub)
   */
  get(did: string): Promise<NodeSavedSession | undefined>;

  /**
   * Store or update a session
   */
  set(did: string, session: NodeSavedSession): Promise<void>;

  /**
   * Delete a session
   */
  del(did: string): Promise<void>;
}

/**
 * State store for OAuth state/PKCE parameters
 * Temporary storage during OAuth flow
 */
export interface StateStore {
  /**
   * Retrieve OAuth state by key
   */
  get(key: string): Promise<NodeSavedState | undefined>;

  /**
   * Store OAuth state
   */
  set(key: string, state: NodeSavedState): Promise<void>;

  /**
   * Delete OAuth state
   */
  del(key: string): Promise<void>;
}

/**
 * Optional cache interface for profile and metadata caching
 * SDK provides in-memory implementation; users can provide Redis/etc.
 */
export interface CacheInterface {
  /**
   * Get a cached value
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a cached value with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a cached value
   */
  del(key: string): Promise<void>;

  /**
   * Clear all cached values
   */
  clear(): Promise<void>;
}

/**
 * Logger interface for debugging and observability
 */
export interface LoggerInterface {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
