/**
 * @hypercerts-org/sdk-core - Main entrypoint
 * @packageDocumentation
 */

// Core SDK
export { ATProtoSDK, createATProtoSDK } from "./core/SDK.js";
export type { AuthorizeOptions } from "./core/SDK.js";
export type { ATProtoSDKConfig } from "./core/config.js";
export type { Session } from "./core/types.js";

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

// Hypercert Zod schemas (for runtime validation)
export {
  HypercertRecordSchema,
  RightsRecordSchema,
  LocationRecordSchema,
  ContributionRecordSchema,
  MeasurementRecordSchema,
  EvaluationRecordSchema,
  CollectionRecordSchema,
  StrongRefSchema,
  BlobRefSchema,
  HypercertEvidenceSchema,
  parseHypercertRecord,
  parseCollectionRecord,
  safeParseHypercertRecord,
  safeParseCollectionRecord,
} from "./services/hypercerts/schemas.js";

// Lexicon constants
export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "./lexicons/hypercerts/index.js";

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
