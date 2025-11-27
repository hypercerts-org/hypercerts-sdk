/**
 * Query key factory for ATProto React hooks.
 *
 * Provides standardized query keys for cache management and invalidation.
 * Following TanStack Query best practices for hierarchical key structures.
 *
 * @example
 * ```typescript
 * import { atprotoKeys } from "@hypercerts-org/sdk-react";
 *
 * // Manual cache invalidation
 * queryClient.invalidateQueries({ queryKey: atprotoKeys.hypercerts(orgDid) });
 *
 * // Invalidate all ATProto queries
 * queryClient.invalidateQueries({ queryKey: atprotoKeys.all });
 * ```
 *
 * @packageDocumentation
 */

import type { ListParams } from "@hypercerts-org/sdk-core";

/**
 * Query key factory for all ATProto-related queries.
 *
 * Keys are structured hierarchically to enable granular cache invalidation:
 * - `atprotoKeys.all` - All ATProto queries
 * - `atprotoKeys.session()` - All session queries
 * - `atprotoKeys.profile(did)` - Specific profile
 */
export const atprotoKeys = {
  /**
   * Root key for all ATProto queries.
   * Use to invalidate the entire ATProto cache.
   */
  all: ["atproto"] as const,

  // ─────────────────────────────────────────────
  // Session Keys
  // ─────────────────────────────────────────────

  /**
   * Key for all session queries.
   */
  session: () => [...atprotoKeys.all, "session"] as const,

  /**
   * Key for a specific session by DID.
   */
  sessionByDid: (did: string) => [...atprotoKeys.session(), did] as const,

  // ─────────────────────────────────────────────
  // Server Resolution Keys
  // ─────────────────────────────────────────────

  /**
   * Key for server resolution cache.
   */
  servers: () => [...atprotoKeys.all, "server"] as const,

  /**
   * Key for a specific DID's server resolution.
   */
  server: (did: string) => [...atprotoKeys.servers(), did] as const,

  // ─────────────────────────────────────────────
  // Profile Keys
  // ─────────────────────────────────────────────

  /**
   * Key for all profile queries.
   */
  profiles: () => [...atprotoKeys.all, "profile"] as const,

  /**
   * Key for a specific profile by DID.
   */
  profile: (did: string) => [...atprotoKeys.profiles(), did] as const,

  // ─────────────────────────────────────────────
  // Organization Keys
  // ─────────────────────────────────────────────

  /**
   * Key for all organization queries.
   */
  organizations: () => [...atprotoKeys.all, "organizations"] as const,

  /**
   * Key for a specific organization by DID.
   */
  organization: (did: string) => [...atprotoKeys.organizations(), did] as const,

  // ─────────────────────────────────────────────
  // Collaborator Keys
  // ─────────────────────────────────────────────

  /**
   * Key for all collaborator queries.
   */
  allCollaborators: () => [...atprotoKeys.all, "collaborators"] as const,

  /**
   * Key for collaborators of a specific repository.
   */
  collaborators: (repoDid: string) => [...atprotoKeys.allCollaborators(), repoDid] as const,

  // ─────────────────────────────────────────────
  // Hypercert Keys
  // ─────────────────────────────────────────────

  /**
   * Key for all hypercert queries.
   */
  allHypercerts: () => [...atprotoKeys.all, "hypercerts"] as const,

  /**
   * Key for hypercerts in a specific repository.
   */
  hypercerts: (repoDid?: string) => [...atprotoKeys.allHypercerts(), repoDid ?? "all"] as const,

  /**
   * Key for a hypercerts list with pagination params.
   */
  hypercertsList: (repoDid: string, params?: ListParams) =>
    [...atprotoKeys.hypercerts(repoDid), "list", params] as const,

  /**
   * Key for a single hypercert by URI.
   */
  hypercert: (uri: string) => [...atprotoKeys.allHypercerts(), "detail", uri] as const,
} as const;

/**
 * Type helper for extracting query key types from the factory.
 *
 * @example
 * ```typescript
 * // Use in generic functions
 * function invalidateKey<K extends ATProtoQueryKey>(queryClient: QueryClient, key: K) {
 *   queryClient.invalidateQueries({ queryKey: key });
 * }
 * ```
 */
export type ATProtoQueryKey =
  | typeof atprotoKeys.all
  | ReturnType<typeof atprotoKeys.session>
  | ReturnType<typeof atprotoKeys.sessionByDid>
  | ReturnType<typeof atprotoKeys.servers>
  | ReturnType<typeof atprotoKeys.server>
  | ReturnType<typeof atprotoKeys.profiles>
  | ReturnType<typeof atprotoKeys.profile>
  | ReturnType<typeof atprotoKeys.organizations>
  | ReturnType<typeof atprotoKeys.organization>
  | ReturnType<typeof atprotoKeys.allCollaborators>
  | ReturnType<typeof atprotoKeys.collaborators>
  | ReturnType<typeof atprotoKeys.allHypercerts>
  | ReturnType<typeof atprotoKeys.hypercerts>
  | ReturnType<typeof atprotoKeys.hypercertsList>
  | ReturnType<typeof atprotoKeys.hypercert>;
