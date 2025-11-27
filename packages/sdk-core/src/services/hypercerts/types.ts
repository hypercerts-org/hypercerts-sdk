/**
 * TypeScript types for hypercert lexicon schemas.
 *
 * Re-exports generated types and validation from `@hypercerts-org/lexicon`.
 *
 * @packageDocumentation
 */

// Re-export everything from lexicon package
export {
  // Namespaced types with validation (isRecord, validateRecord)
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
} from "@hypercerts-org/lexicon";

export type { AppCertifiedDefs } from "@hypercerts-org/lexicon";

import type {
  OrgHypercertsClaim,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContribution,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsCollection,
  AppCertifiedLocation,
  ComAtprotoRepoStrongRef,
} from "@hypercerts-org/lexicon";

// ============================================================================
// Type Aliases
// ============================================================================

export type StrongRef = ComAtprotoRepoStrongRef.Main;
export type HypercertClaim = OrgHypercertsClaim.Main;
export type HypercertRights = OrgHypercertsClaimRights.Main;
export type HypercertContribution = OrgHypercertsClaimContribution.Main;
export type HypercertMeasurement = OrgHypercertsClaimMeasurement.Main;
export type HypercertEvaluation = OrgHypercertsClaimEvaluation.Main;
export type HypercertCollection = OrgHypercertsCollection.Main;
export type HypercertCollectionClaimItem = OrgHypercertsCollection.ClaimItem;
export type HypercertLocation = AppCertifiedLocation.Main;

// ============================================================================
// SDK Input Helper Types
// ATProto API infers $type from the collection
// ============================================================================

/** Blob reference for uploaded files (images, GeoJSON, etc.) */
export interface BlobRef {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
}

/** Evidence item for operations */
export interface HypercertEvidence {
  uri: string;
  title?: string;
  description?: string;
}

/** Image input for operations */
export type HypercertImage = { type: "uri"; uri: string } | { type: "blob"; blob: Blob };

/** Hypercert with AT Protocol metadata */
export interface HypercertWithMetadata {
  uri: string;
  cid: string;
  record: HypercertClaim;
}
