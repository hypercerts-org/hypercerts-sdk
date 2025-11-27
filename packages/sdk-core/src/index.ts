/**
 * Hypercerts SDK - Main entrypoint.
 *
 * This is the primary entry point for the `@hypercerts-org/sdk` package.
 * It exports all public APIs needed to work with hypercerts on the
 * AT Protocol.
 *
 * @remarks
 * **Quick Start**:
 * ```typescript
 * import { ATProtoSDK } from "@hypercerts-org/sdk";
 *
 * const sdk = new ATProtoSDK({
 *   oauth: {
 *     clientId: "https://my-app.com/client-metadata.json",
 *     redirectUri: "https://my-app.com/callback",
 *     scope: "atproto transition:generic",
 *     jwksUri: "https://my-app.com/.well-known/jwks.json",
 *     jwkPrivate: process.env.JWK_PRIVATE_KEY!,
 *   },
 *   servers: {
 *     pds: "https://bsky.social",
 *     sds: "https://sds.hypercerts.org",
 *   },
 * });
 *
 * // Start OAuth flow
 * const authUrl = await sdk.authorize("user.bsky.social");
 *
 * // After callback
 * const session = await sdk.callback(params);
 * const repo = sdk.repository(session);
 *
 * // Create a hypercert
 * const result = await repo.hypercerts.create({
 *   title: "My Impact",
 *   description: "...",
 *   workScope: "Climate",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-12-31",
 *   rights: { name: "CC-BY", type: "license", description: "..." },
 * });
 * ```
 *
 * **Sub-entrypoints**:
 * - `@hypercerts-org/sdk/types` - TypeScript types only
 * - `@hypercerts-org/sdk/errors` - Error classes
 * - `@hypercerts-org/sdk/lexicons` - Lexicon registry and constants
 * - `@hypercerts-org/sdk/storage` - Storage implementations
 * - `@hypercerts-org/sdk/testing` - Test utilities
 *
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
