/**
 * Types entrypoint - All TypeScript types and interfaces.
 *
 * This sub-entrypoint exports only TypeScript types and Zod schemas,
 * with no runtime code. Use this for type-only imports to reduce
 * bundle size when you only need types.
 *
 * @remarks
 * Import from `@hypercerts-org/sdk/types` when you only need types:
 *
 * ```typescript
 * import type {
 *   HypercertClaim,
 *   Session,
 *   CreateHypercertParams,
 * } from "@hypercerts-org/sdk/types";
 * ```
 *
 * **Categories of exports**:
 * - Core types (DID, Session, Config)
 * - Entity types (Organization, Collaborator)
 * - Repository types (CreateResult, PaginatedList)
 * - Operation interfaces (RecordOperations, HypercertOperations)
 * - Hypercert record types (HypercertClaim, HypercertRights, etc.)
 * - Zod schemas for runtime validation
 *
 * @packageDocumentation
 */

// Core types
export type { DID, Session } from "./core/types.js";
export type { ATProtoSDKConfig } from "./core/config.js";
export type { AuthorizeOptions } from "./core/SDK.js";
export type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./core/interfaces.js";

// Entity types
export type { Organization, Collaborator, CollaboratorPermissions } from "./core/types.js";

// Zod schemas (for runtime validation)
export { ATProtoSDKConfigSchema, OAuthConfigSchema, ServerConfigSchema, TimeoutConfigSchema } from "./core/config.js";
export { OrganizationSchema, CollaboratorSchema, CollaboratorPermissionsSchema } from "./core/types.js";

// Repository types
export type {
  RepositoryOptions,
  CreateResult,
  UpdateResult,
  PaginatedList,
  ListParams,
  RepositoryRole,
  RepositoryAccessGrant,
  OrganizationInfo,
  ProgressStep,
} from "./repository/types.js";

// Operation interfaces
export type {
  RecordOperations,
  BlobOperations,
  ProfileOperations,
  HypercertOperations,
  HypercertEvents,
  CollaboratorOperations,
  OrganizationOperations,
  CreateHypercertParams,
  CreateHypercertResult,
} from "./repository/interfaces.js";

// Hypercert types
export type {
  HypercertClaim,
  HypercertRights,
  HypercertLocation,
  HypercertContributionDetails,
  HypercertContributorInformation,
  HypercertContributor,
  HypercertMeasurement,
  HypercertEvaluation,
  HypercertCollection,
  HypercertCollectionItem,
  HypercertWorkScopeTag,
  HypercertEvidence,
  HypercertImage,
  HypercertImageRecord,
  HypercertWithMetadata,
  HypercertProject,
  HypercertProjectWithMetadata,
  CreateProjectParams,
  UpdateProjectParams,
  JsonBlobRef,
} from "./services/hypercerts/types.js";

// BlobRef is a class, not just a type
export { BlobRef } from "./services/hypercerts/types.js";
