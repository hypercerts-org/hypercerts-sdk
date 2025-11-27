/**
 * TypeScript types for hypercert lexicon schemas
 * Based on ATProto lexicon definitions for hypercerts
 */

/**
 * Evidence item for a hypercert
 */
export interface HypercertEvidence {
  uri: string;
  title?: string;
  description?: string;
}

/**
 * Image for a hypercert - can be URI or blob
 */
export type HypercertImage = { type: "uri"; uri: string } | { type: "blob"; blob: Blob };

/**
 * Main hypercert record
 * Based on org.hypercerts.claim.record lexicon
 */
export interface HypercertRecord {
  title: string;
  description: string;
  workScope: string;
  workTimeframeFrom: string; // ISO datetime
  workTimeframeTo: string; // ISO datetime
  createdAt: string; // ISO datetime
  shortDescription?: string;
  image?: HypercertImage;
  evidence?: HypercertEvidence[];
  contributions?: Array<{ uri: string; cid: string }>; // strongRefs
  rights?: { uri: string; cid: string }; // strongRef
  location?: { uri: string; cid: string }; // strongRef
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Rights record for a hypercert
 * Based on org.hypercerts.claim.rights lexicon
 */
export interface RightsRecord {
  rightsName: string;
  rightsType: string;
  rightsDescription: string;
  createdAt: string; // ISO datetime
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * ATProto Blob Reference
 * Returned by com.atproto.repo.uploadBlob
 */
export interface BlobRef {
  $type: "blob";
  ref: { $link: string }; // CID
  mimeType: string;
  size: number;
}

/**
 * Location record for a hypercert
 * Based on org.hypercerts.claim.location lexicon
 */
export interface LocationRecord {
  hypercert?: { uri: string; cid: string }; // strongRef (optional for backward compatibility)
  value: string | BlobRef; // Union: either URI string OR blob reference
  createdAt: string; // ISO datetime
  name?: string;
  description?: string;
  srs?: string; // Spatial Reference System (e.g., EPSG:4326)
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Contribution record for a hypercert
 * Based on org.hypercerts.claim.contribution lexicon
 */
export interface ContributionRecord {
  contributors: string[]; // Array of DIDs
  role: string;
  createdAt: string; // ISO datetime
  hypercert?: { uri: string; cid: string }; // strongRef
  description?: string;
  workTimeframeFrom?: string; // ISO datetime
  workTimeframeTo?: string; // ISO datetime
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Measurement record for a hypercert
 * Based on org.hypercerts.claim.measurement lexicon
 */
export interface MeasurementRecord {
  hypercert: { uri: string; cid: string }; // strongRef
  measurers: string[]; // Array of DIDs
  metric: string;
  value: string;
  createdAt: string; // ISO datetime
  measurementMethodURI?: string;
  evidenceURI?: string[];
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Evaluation record for a hypercert
 * Based on org.hypercerts.claim.evaluation lexicon
 */
export interface EvaluationRecord {
  subject: { uri: string; cid: string }; // strongRef
  evaluators: string[]; // Array of DIDs
  summary: string;
  createdAt: string; // ISO datetime
  evaluations?: Array<{ type: "uri"; uri: string } | { type: "blob"; blob: Blob }>;
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Claim item in a collection
 * Based on org.hypercerts.collection lexicon claimItem definition
 */
export interface CollectionClaimItem {
  claim: { uri: string; cid: string }; // strongRef to hypercert claim record
  weight: string; // Percentage from 0-100 as string
}

/**
 * Collection record for grouping hypercerts
 * Based on org.hypercerts.collection lexicon
 */
export interface CollectionRecord {
  title: string;
  claims: CollectionClaimItem[];
  createdAt: string; // ISO datetime
  shortDescription?: string;
  coverPhoto?: { type: "uri"; uri: string } | { type: "blob"; blob: Blob };
  [key: string]: unknown; // Index signature for ATProto API compatibility
}

/**
 * Response from creating a hypercert
 */
export interface CreateHypercertResponse {
  success: boolean;
  hypercertUri?: string;
  rightsUri?: string;
  error?: string;
}

/**
 * Hypercert with metadata (URI and CID)
 */
export interface HypercertWithMetadata {
  uri: string;
  cid: string;
  record: HypercertRecord;
}
