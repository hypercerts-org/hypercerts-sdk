/**
 * Repository types - Shared types for repository operations
 * @packageDocumentation
 */

import type { CollaboratorPermissions } from "../core/types.js";

// ============================================================================
// Basic Types
// ============================================================================

/**
 * Options for creating a repository instance
 */
export interface RepositoryOptions {
  /** Use "sds" for configured SDS server, or provide a custom URL */
  server?: "pds" | "sds" | string;
  /** Custom server URL (overrides server option) */
  serverUrl?: string;
}

/**
 * Result of a create operation
 */
export interface CreateResult {
  uri: string;
  cid: string;
}

/**
 * Result of an update operation
 */
export interface UpdateResult {
  uri: string;
  cid: string;
}

/**
 * Paginated list result
 */
export interface PaginatedList<T> {
  records: T[];
  cursor?: string;
}

/**
 * List parameters
 */
export interface ListParams {
  limit?: number;
  cursor?: string;
}

// ============================================================================
// Collaborator Types
// ============================================================================

/**
 * Role for repository access
 */
export type RepositoryRole = "viewer" | "editor" | "admin" | "owner";

/**
 * Repository access grant
 */
export interface RepositoryAccessGrant {
  userDid: string;
  role: RepositoryRole;
  permissions: CollaboratorPermissions;
  grantedBy: string;
  grantedAt: string;
  revokedAt?: string;
}

// ============================================================================
// Organization Types
// ============================================================================

/**
 * Organization info
 */
export interface OrganizationInfo {
  did: string;
  handle: string;
  name: string;
  description?: string;
  createdAt: string;
  accessType: "owner" | "shared" | "none";
  permissions: CollaboratorPermissions;
  collaboratorCount?: number;
  profile?: {
    displayName?: string;
    avatar?: string;
    banner?: string;
    website?: string;
  };
}

// ============================================================================
// Progress Types
// ============================================================================

/**
 * Progress step for long-running operations
 */
export interface ProgressStep {
  name: string;
  status: "start" | "success" | "error";
  data?: unknown;
  error?: Error;
}
