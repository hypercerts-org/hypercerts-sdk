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
export { LexiconRegistry } from "./repository/LexiconRegistry.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";
export { BaseOperations } from "./repository/BaseOperations.js";
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

// Lexicon Development Utilities
export {
  parseAtUri,
  buildAtUri,
  extractRkeyFromUri,
  isValidAtUri,
  createStrongRef,
  createStrongRefFromResult,
  validateStrongRef,
  isStrongRef,
} from "./lexicons/utils.js";
export type { AtUriComponents } from "./lexicons/utils.js";

export {
  createStringField,
  createIntegerField,
  createNumberField,
  createBooleanField,
  createStrongRefField,
  createArrayField,
  createObjectField,
  createBlobField,
  createDatetimeField,
  createRecordDef,
  createLexiconDoc,
  validateLexiconStructure,
} from "./lexicons/builders.js";
export type {
  LexiconFieldType,
  LexiconField,
  LexiconStringField,
  LexiconIntegerField,
  LexiconNumberField,
  LexiconBooleanField,
  LexiconRefField,
  LexiconArrayField,
  LexiconObjectField,
  LexiconBlobField,
  LexiconUnknownField,
  LexiconRecordDef,
  LexiconDoc,
} from "./lexicons/builders.js";

export { createSidecarRecord, attachSidecar, createWithSidecars, batchCreateSidecars } from "./lexicons/sidecar.js";
export type {
  SidecarRecordParams,
  SidecarResult,
  AttachSidecarParams,
  MultiSidecarResult,
  CreateWithSidecarsParams,
} from "./lexicons/sidecar.js";
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
  CreateOrganizationParams,
  LocationParams,
  ContributionDetailsParams,
  CreateContributionDetailsParams,
  ResolvedContributionDetails,
  ContributorIdentityParams,
  CreateContributorInformationParams,
  ResolvedContributorIdentity,
  BlobInput,
} from "./repository/interfaces.js";

// ============================================================================
// Lexicon Types and Validation (from @hypercerts-org/lexicon)
// ============================================================================

// Namespaced types with validation functions (isRecord, validateRecord)
export {
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContributionDetails,
  OrgHypercertsClaimContributorInformation,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimAttachment,
  OrgHypercertsClaimCollection,
  OrgHypercertsHelperWorkScopeTag,
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
  HypercertContributionDetails,
  HypercertContributorInformation,
  HypercertContributor,
  HypercertMeasurement,
  HypercertEvaluation,
  HypercertCollection,
  HypercertCollectionItem,
  HypercertWorkScopeTag,
  HypercertLocation,
  BadgeAward,
  BadgeDefinition,
  BadgeResponse,
  FundingReceipt,
  // SDK-specific types
  HypercertAttachment,
  HypercertImage,
  HypercertImageRecord,
  BlobRef,
  HypercertWithMetadata,
  HypercertProject,
  HypercertProjectWithMetadata,
  CreateProjectParams,
  UpdateProjectParams,
  CreateAttachmentParams,
  UpdateAttachmentParams,
  AttachmentParams,
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
export { OrganizationSchema, CollaboratorSchema, CollaboratorPermissionsSchema, isValidDid } from "./core/types.js";
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

// URL Utilities
export { isValidUri } from "./lib/url-utils.js";

// Rich Text Utilities
export { createFacetsFromText, createFacetsFromTextSync, RichText } from "./lib/rich-text.js";
export type { RichTextResult, AppBskyRichtextFacet } from "./lib/rich-text.js";
