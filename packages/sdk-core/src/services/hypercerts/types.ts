/**
 * TypeScript types for hypercert lexicon schemas.
 *
 * Re-exports generated types and validation from `@hypercerts-org/lexicon`.
 *
 * @packageDocumentation
 */

// Re-export BlobRef from ATProto lexicon
export { BlobRef } from "@atproto/lexicon";
export type { JsonBlobRef } from "@atproto/lexicon";

// Re-export everything from lexicon package
export {
  // Namespaced types with validation (isRecord, validateRecord)
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
  // Validation utilities
  validate,
  HYPERCERTS_SCHEMAS,
  HYPERCERTS_SCHEMA_DICT,
  HYPERCERTS_NSIDS_BY_TYPE,
  HYPERCERTS_NSIDS,
  HYPERCERTS_LEXICON_JSON,
  HYPERCERTS_LEXICON_DOC,
  lexicons,
} from "@hypercerts-org/lexicon";

// Re-export lexicon constants from SDK's lexicons module
export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "../../lexicons.js";

export type { AppCertifiedDefs, OrgHypercertsDefs } from "@hypercerts-org/lexicon";

/*
 * Dual import pattern: The lexicon package uses `export * as X` which exports namespaces (values).
 * We need both:
 * 1. `export { ... }` - re-exports namespaces for external consumers
 * 2. `import type { ... }` - makes names available locally for type aliases below
 *
 * Without the import, TypeScript wouldn't recognize OrgHypercertsClaimActivity etc.
 * when defining `type HypercertClaim = OrgHypercertsClaimActivity.Main`.
 */
import type {
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
  OrgHypercertsDefs,
} from "@hypercerts-org/lexicon";

// ============================================================================
// Type Aliases
// ============================================================================

export type StrongRef = ComAtprotoRepoStrongRef.Main;
export type HypercertClaim = OrgHypercertsClaimActivity.Main;
export type HypercertRights = OrgHypercertsClaimRights.Main;
export type HypercertContribution = OrgHypercertsClaimContribution.Main;
export type HypercertMeasurement = OrgHypercertsClaimMeasurement.Main;
export type HypercertEvaluation = OrgHypercertsClaimEvaluation.Main;
export type HypercertEvidence = OrgHypercertsClaimEvidence.Main;
export type HypercertCollection = OrgHypercertsClaimCollection.Main;
export type HypercertCollectionClaimItem = OrgHypercertsClaimActivity.ActivityWeight;
export type HypercertProject = OrgHypercertsClaimProject.Main;
export type HypercertLocation = AppCertifiedLocation.Main;
export type BadgeAward = AppCertifiedBadgeAward.Main;
export type BadgeDefinition = AppCertifiedBadgeDefinition.Main;
export type BadgeResponse = AppCertifiedBadgeResponse.Main;
export type FundingReceipt = OrgHypercertsFundingReceipt.Main;

// ============================================================================
// SDK Input Helper Types
// ATProto API infers $type from the collection
// ============================================================================

/**
 * Image input for SDK operations.
 *
 * Can be either:
 * - A URI reference (for external images)
 * - A Blob to be uploaded
 *
 * The SDK will convert these to the appropriate lexicon types:
 * - OrgHypercertsDefs.Uri
 * - OrgHypercertsDefs.SmallImage
 * - OrgHypercertsDefs.LargeImage
 */
export type HypercertImage = { type: "uri"; uri: string } | { type: "blob"; blob: Blob };

/**
 * Lexicon-defined image types (union of Uri and image blob types).
 * Use this when working with stored records.
 */
export type HypercertImageRecord = OrgHypercertsDefs.Uri | OrgHypercertsDefs.SmallImage | OrgHypercertsDefs.LargeImage;

/** Hypercert with AT Protocol metadata */
export interface HypercertWithMetadata {
  uri: string;
  cid: string;
  record: HypercertClaim;
}
