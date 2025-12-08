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
} from "./repository/interfaces.js";

// Lexicon Registry
export { LexiconRegistry } from "./repository/LexiconRegistry.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";

// ============================================================================
// Lexicon Types and Validation (from @hypercerts-org/lexicon)
// ============================================================================

// Namespaced types with validation functions (isRecord, validateRecord)
export {
  OrgHypercertsClaim,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContribution,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimEvidence,
  OrgHypercertsCollection,
  AppCertifiedLocation,
  ComAtprotoRepoStrongRef,
  // Validation utilities
  validate,
  schemas,
  schemaDict,
  lexicons,
  ids,
  // Lexicon constants
  HYPERCERT_LEXICONS,
  HYPERCERT_COLLECTIONS,
} from "./services/hypercerts/types.js";

// Type-only exports
export type { AppCertifiedDefs } from "./services/hypercerts/types.js";

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
  HypercertLocation,
  // SDK-specific types
  HypercertEvidence,
  HypercertImage,
  BlobRef,
  HypercertWithMetadata,
} from "./services/hypercerts/types.js";

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
