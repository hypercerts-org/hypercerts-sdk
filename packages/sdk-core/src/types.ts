/**
 * Types entrypoint - All TypeScript types and interfaces
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

// Repository class
export type { ValidationResult } from "./repository/LexiconRegistry.js";

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
  HypercertRecord,
  RightsRecord,
  LocationRecord,
  ContributionRecord,
  MeasurementRecord,
  EvaluationRecord,
  CollectionRecord,
  CollectionClaimItem,
  HypercertEvidence,
  HypercertImage,
  BlobRef,
  HypercertWithMetadata,
} from "./services/hypercerts/types.js";
