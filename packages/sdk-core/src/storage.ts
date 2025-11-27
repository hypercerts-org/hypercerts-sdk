/**
 * Storage entrypoint - Storage implementations and interfaces
 *
 * This module provides storage adapters for persisting OAuth sessions and state.
 * Includes in-memory implementations for development and testing, plus interfaces
 * for implementing custom storage backends (Redis, database, etc.).
 *
 * @remarks
 * The in-memory implementations are suitable for:
 * - Development and testing environments
 * - Single-server deployments with acceptable session loss on restart
 * - Prototyping and demos
 *
 * For production multi-server deployments, implement the interfaces with
 * a distributed storage backend like Redis, PostgreSQL, or a managed
 * key-value store.
 *
 * @example
 * ```typescript
 * // Using built-in in-memory stores (development)
 * import { InMemorySessionStore, InMemoryStateStore } from "@hypercerts-org/sdk";
 *
 * const sessionStore = new InMemorySessionStore();
 * const stateStore = new InMemoryStateStore();
 *
 * const sdk = new HypercertsSDK({
 *   sessionStore,
 *   stateStore,
 *   // ... other config
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Implementing custom storage (production)
 * import type { SessionStore, StateStore } from "@hypercerts-org/sdk";
 * import Redis from "ioredis";
 *
 * class RedisSessionStore implements SessionStore {
 *   constructor(private redis: Redis) {}
 *
 *   async get(did: string) {
 *     const data = await this.redis.get(`session:${did}`);
 *     return data ? JSON.parse(data) : undefined;
 *   }
 *
 *   async set(did: string, session: Session) {
 *     await this.redis.set(`session:${did}`, JSON.stringify(session));
 *   }
 *
 *   async delete(did: string) {
 *     await this.redis.del(`session:${did}`);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

export { InMemorySessionStore } from "./storage/InMemorySessionStore.js";
export { InMemoryStateStore } from "./storage/InMemoryStateStore.js";

export type { SessionStore, StateStore, CacheInterface } from "./core/interfaces.js";
