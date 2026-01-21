/**
 * Hypercerts SDK - Main entrypoint.
 *
 * @packageDocumentation
 */

// Core SDK
export { ATProtoSDK, createATProtoSDK } from "./core/SDK.js";
export type { AuthorizeOptions } from "./core/SDK.js";
export type { ATProtoSDKConfig } from "./core/config.js";
export type { Session } from "./core/types.js";

// Agent
export { ConfigurableAgent } from "./agent/ConfigurableAgent.js";

// Repository (fluent API)
export { Repository } from "./repository/Repository.js";
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
  CreateHypercertEvidenceParams,
  CreateOrganizationParams,
} from "./repository/interfaces.js";

// ============================================================================
// Lexicon Types and Validation (from @hypercerts-org/lexicon)
// ============================================================================

// Namespaced types with validation functions (isRecord, validateRecord)
export {
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContribution,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimEvidence,
  OrgHypercertsClaimCollection,
  OrgHypercertsClaimProject,
  AppCertifiedLocation,
  AppCertifiedBadgeAward,
  AppCertifiedBadgeDefinition,
  AppCertifiedBadgeResponse,
  OrgHypercertsFundingReceipt,
  ComAtprotoRepoStrongRef,
  // Re-export values from lexicon
  validate,
  HYPERCERTS_SCHEMAS,
  HYPERCERTS_SCHEMA_DICT,
  HYPERCERTS_NSIDS_BY_TYPE,
  HYPERCERTS_NSIDS,
  // Lexicon constants
  HYPERCERT_LEXICONS,
  HYPERCERT_COLLECTIONS,
} from "./services/hypercerts/types.js";

// Type-only exports
export type {
  HYPERCERTS_LEXICON_JSON,
  HYPERCERTS_LEXICON_DOC,
  lexicons,
  AppCertifiedDefs,
  OrgHypercertsDefs,
} from "./services/hypercerts/types.js";

// Type aliases for generated lexicon types
export type {
  StrongRef,
  HypercertClaim,
  HypercertRights,
  HypercertContribution,
  HypercertMeasurement,
  HypercertEvaluation,
  HypercertCollection,
  HypercertCollectionClaimItem,
  HypercertProject,
  HypercertLocation,
  BadgeAward,
  BadgeDefinition,
  BadgeResponse,
  FundingReceipt,
  // SDK-specific types
  HypercertEvidence,
  HypercertImage,
  HypercertImageRecord,
  BlobRef,
  HypercertWithMetadata,
} from "./services/hypercerts/types.js";

// Re-export ATProto lexicon types
export type { JsonBlobRef } from "./services/hypercerts/types.js";

// Errors
export {
  ATProtoSDKError,
  AuthenticationError,
  SessionExpiredError,
  ValidationError,
  NetworkError,
  SDSRequiredError,
} from "./core/errors.js";

// Storage interfaces and implementations
export type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./core/interfaces.js";
export { InMemorySessionStore } from "./storage/InMemorySessionStore.js";
export { InMemoryStateStore } from "./storage/InMemoryStateStore.js";

// Core types and schemas
export type { DID, Organization, Collaborator, CollaboratorPermissions } from "./core/types.js";
export { OrganizationSchema, CollaboratorSchema, CollaboratorPermissionsSchema } from "./core/types.js";
export { ATProtoSDKConfigSchema, OAuthConfigSchema, ServerConfigSchema, TimeoutConfigSchema } from "./core/config.js";

// OAuth Permissions System
export {
  // Constants
  ATPROTO_SCOPE,
  TRANSITION_SCOPES,
  // Schemas
  TransitionScopeSchema,
  AccountAttrSchema,
  AccountActionSchema,
  RepoActionSchema,
  IdentityAttrSchema,
  MimeTypeSchema,
  NsidSchema,
  AccountPermissionSchema,
  RepoPermissionSchema,
  BlobPermissionSchema,
  RpcPermissionSchema,
  IdentityPermissionSchema,
  IncludePermissionSchema,
  PermissionSchema,
  // Builder
  PermissionBuilder,
  // Presets
  ScopePresets,
  // Utilities
  buildScope,
  parseScope,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  mergeScopes,
  removePermissions,
  validateScope,
} from "./auth/permissions.js";

// OAuth Permission Types
export type {
  TransitionScope,
  AccountAttr,
  AccountAction,
  RepoAction,
  IdentityAttr,
  AccountPermissionInput,
  RepoPermissionInput,
  BlobPermissionInput,
  RpcPermissionInput,
  IdentityPermissionInput,
  IncludePermissionInput,
  PermissionInput,
  Permission,
} from "./auth/permissions.js";
