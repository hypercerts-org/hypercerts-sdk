/**
 * React-specific types for the Hypercerts ATProto SDK.
 *
 * @packageDocumentation
 */

import type {
  ATProtoSDK,
  ATProtoSDKConfig,
  Collaborator,
  CollaboratorPermissions,
  CreateHypercertParams,
  CreateHypercertResult,
  CreateOrganizationParams,
  CreateProjectParams,
  HypercertClaim,
  HypercertProject,
  OrganizationInfo,
  OrgHypercertsDefs,
  Repository,
  RepositoryRole,
  Session,
  UpdateProjectParams,
} from "@hypercerts-org/sdk-core";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────
// Factory Types
// ─────────────────────────────────────────────

/**
 * Options for creating an ATProto React instance.
 */
export interface CreateATProtoReactOptions {
  /**
   * SDK configuration. Creates a new SDK instance if provided.
   * Either `config` or `sdk` must be provided.
   */
  config?: ATProtoSDKConfig;

  /**
   * Existing SDK instance to use instead of creating a new one.
   * Either `config` or `sdk` must be provided.
   */
  sdk?: ATProtoSDK;

  /**
   * Optional React Query client. Creates one if not provided.
   */
  queryClient?: QueryClient;

  /**
   * Initial session for SSR hydration.
   */
  initialSession?: Session | null;

  /**
   * Enable cross-tab session synchronization.
   * @default true
   */
  syncTabs?: boolean;
}

/**
 * Props for the ATProto Provider component.
 */
export interface ATProtoProviderProps {
  children: ReactNode;
  /**
   * Dehydrated state from server for SSR hydration.
   */
  dehydratedState?: unknown;
}

// ─────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────

/**
 * Discriminated auth status for clear state management.
 */
export type AuthStatus = "idle" | "authorizing" | "authenticated" | "error";

/**
 * Result of the useAuth hook.
 */
export interface UseAuthResult {
  /** Current session (null if not authenticated) */
  session: Session | null;

  /** Discriminated auth status */
  status: AuthStatus;

  /** Error if status is "error" */
  error: Error | null;

  /** Whether session is valid and not expired */
  isValid: boolean;

  /** Initiate login flow */
  login: (identifier: string, redirectUrl?: string) => Promise<void>;

  /** Logout and clear session */
  logout: () => Promise<void>;

  /** Force refresh session from storage/server */
  refresh: () => Promise<void>;

  /** Whether any auth operation is in progress */
  isLoading: boolean;
}

// ─────────────────────────────────────────────
// Repository Types
// ─────────────────────────────────────────────

/**
 * Options for the useRepository hook.
 */
export interface UseRepositoryOptions {
  /** Repository DID (defaults to session DID) */
  repoDid?: string;

  /** Force server type: "pds" or "sds" */
  server?: "pds" | "sds";

  /** Force specific server URL (overrides server option) */
  serverUrl?: string;
}

/**
 * Result of the useRepository hook.
 */
export interface UseRepositoryResult {
  /** Bound repository client */
  repository: Repository | null;

  /** Repository status */
  status: "idle" | "loading" | "ready" | "error";

  /** Error if status is "error" */
  error: Error | null;

  /** Whether this is an SDS repository */
  isSDS: boolean;

  /** Resolved server URL */
  serverUrl: string | null;
}

// ─────────────────────────────────────────────
// Profile Types
// ─────────────────────────────────────────────

/**
 * Profile data structure.
 */
export interface Profile {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

/**
 * Parameters for updating a profile.
 */
export interface ProfileUpdate {
  displayName?: string | null;
  description?: string | null;
  avatar?: Blob | null;
  banner?: Blob | null;
  website?: string | null;
}

/**
 * Result of the useProfile hook.
 */
export interface UseProfileResult {
  /** Profile data */
  profile: Profile | null;

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Update profile */
  update: (params: ProfileUpdate) => Promise<void>;

  /** Update loading state */
  isUpdating: boolean;

  /** Refetch profile */
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Organization Types
// ─────────────────────────────────────────────

/**
 * Result of the useOrganizations hook.
 */
export interface UseOrganizationsResult {
  /** List of organizations */
  organizations: OrganizationInfo[];

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Create new organization */
  create: (params: CreateOrganizationParams) => Promise<OrganizationInfo>;

  /** Create loading state */
  isCreating: boolean;

  /** Whether there are more pages to fetch */
  hasNextPage: boolean;

  /** Fetch next page of organizations */
  fetchNextPage: () => Promise<void>;

  /** Refetch organizations */
  refetch: () => Promise<void>;
}

/**
 * Result of the useOrganization hook.
 */
export interface UseOrganizationResult {
  /** Organization data */
  organization: OrganizationInfo | null;

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Refetch organization */
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Collaborator Types
// ─────────────────────────────────────────────

/**
 * Parameters for granting collaborator access.
 */
export interface GrantCollaboratorParams {
  userDid: string;
  role: RepositoryRole;
}

/**
 * Result of the useCollaborators hook.
 */
export interface UseCollaboratorsResult {
  /** List of collaborators */
  collaborators: Collaborator[];

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Grant access to user */
  grant: (params: GrantCollaboratorParams) => Promise<void>;

  /** Revoke access from user */
  revoke: (userDid: string) => Promise<void>;

  /** Grant loading state */
  isGranting: boolean;

  /** Revoke loading state */
  isRevoking: boolean;

  /** Whether there are more pages to fetch */
  hasNextPage: boolean;

  /** Fetch next page of collaborators */
  fetchNextPage: () => Promise<void>;

  /** Refetch collaborators */
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Hypercert Types
// ─────────────────────────────────────────────

/**
 * Hypercert with metadata for display.
 */
export interface Hypercert extends HypercertClaim {
  uri: string;
  cid: string;
}

/**
 * Parameters for updating a hypercert.
 */
export interface UpdateHypercertParams {
  title?: string;
  description?: string;
  workScope?:
    | OrgHypercertsDefs.WorkScopeAll
    | OrgHypercertsDefs.WorkScopeAny
    | OrgHypercertsDefs.WorkScopeNot
    | OrgHypercertsDefs.WorkScopeAtom
    | { $type: string };
  impactScope?: string;
  workTimeFrameFrom?: string;
  workTimeFrameTo?: string;
  impactTimeframeFrom?: string;
  impactTimeframeTo?: string;
  contributors?: string[];
}

/**
 * Result of the useHypercerts hook.
 */
export interface UseHypercertsResult {
  /** List of hypercerts */
  hypercerts: Hypercert[];

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Create hypercert */
  create: (params: CreateHypercertParams) => Promise<CreateHypercertResult>;

  /** Create loading state */
  isCreating: boolean;

  /** Whether there are more pages */
  hasNextPage: boolean;

  /** Fetch next page */
  fetchNextPage: () => Promise<void>;

  /** Refetch hypercerts */
  refetch: () => Promise<void>;
}

/**
 * Result of the useHypercert hook.
 */
export interface UseHypercertResult {
  /** Hypercert data */
  hypercert: Hypercert | null;

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Update hypercert */
  update: (params: UpdateHypercertParams) => Promise<void>;

  /** Delete hypercert */
  remove: () => Promise<void>;

  /** Update loading state */
  isUpdating: boolean;

  /** Delete loading state */
  isDeleting: boolean;

  /** Refetch hypercert */
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Project Types
// ─────────────────────────────────────────────

export type Project = {
  uri: string;
  cid: string;
  record: HypercertProject;
};

/**
 * Result of the useProjects hook.
 */
export interface UseProjectsResult {
  /** List of projects */
  projects: Project[];

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Create project */
  create: (params: CreateProjectParams) => Promise<{ uri: string; cid: string }>;

  /** Create loading state */
  isCreating: boolean;

  /** Whether there are more pages */
  hasNextPage: boolean;

  /** Fetch next page */
  fetchNextPage: () => Promise<void>;

  /** Refetch projects */
  refetch: () => Promise<void>;
}

/**
 * Result of the useProject hook.
 */
export interface UseProjectResult {
  /** Project data */
  project: Project | null;

  /** Query loading state */
  isLoading: boolean;

  /** Query error */
  error: Error | null;

  /** Update project */
  update: (params: UpdateProjectParams) => Promise<{ uri: string; cid: string }>;

  /** Delete project */
  remove: () => Promise<void>;

  /** Update loading state */
  isUpdating: boolean;

  /** Delete loading state */
  isDeleting: boolean;

  /** Refetch project */
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// SSR Types
// ─────────────────────────────────────────────

/**
 * SSR helper functions for server-side rendering.
 */
export interface SSRHelpers {
  /** Prefetch session on server */
  prefetchSession: (did: string) => Promise<void>;

  /** Prefetch profile on server */
  prefetchProfile: (did: string) => Promise<void>;

  /** Get dehydrated state for client hydration */
  getDehydratedState: () => unknown;
}

// ─────────────────────────────────────────────
// Cross-Tab Sync Types
// ─────────────────────────────────────────────

/**
 * Message types for cross-tab synchronization.
 */
export interface SyncMessage {
  type: "session:changed" | "session:revoked";
  did?: string;
  timestamp: number;
}

// ─────────────────────────────────────────────
// Re-exports from sdk-core for convenience
// ─────────────────────────────────────────────

export type {
  ATProtoSDK,
  ATProtoSDKConfig,
  Collaborator,
  CollaboratorPermissions,
  CreateHypercertParams,
  CreateHypercertResult,
  CreateOrganizationParams,
  CreateProjectParams,
  HypercertClaim,
  HypercertProject,
  OrganizationInfo,
  OrgHypercertsDefs,
  Repository,
  RepositoryRole,
  Session,
  UpdateProjectParams,
};
