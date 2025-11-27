/**
 * TypeScript types for hypercert lexicon schemas.
 *
 * This module defines TypeScript interfaces that correspond to the
 * AT Protocol lexicon definitions for hypercerts. These types are used
 * throughout the SDK for type safety and documentation.
 *
 * @packageDocumentation
 */

/**
 * Evidence item supporting a hypercert claim.
 *
 * Evidence provides supporting documentation or data for the impact
 * claims made in a hypercert.
 *
 * @example
 * ```typescript
 * const evidence: HypercertEvidence = {
 *   uri: "https://example.com/impact-report.pdf",
 *   title: "Annual Impact Report",
 *   description: "Third-party verified impact assessment",
 * };
 * ```
 */
export interface HypercertEvidence {
  /**
   * URI pointing to the evidence resource.
   *
   * Can be any URL (HTTPS, IPFS, etc.) that provides supporting data.
   */
  uri: string;

  /**
   * Optional title for the evidence.
   */
  title?: string;

  /**
   * Optional description of what the evidence demonstrates.
   */
  description?: string;
}

/**
 * Image reference for a hypercert.
 *
 * Images can be referenced either by URI (for external images) or
 * as a blob (for uploaded images).
 */
export type HypercertImage =
  | {
      /** Type discriminator for URI-based images */
      type: "uri";
      /** External URL to the image */
      uri: string;
    }
  | {
      /** Type discriminator for blob-based images */
      type: "blob";
      /** Blob object containing the image data */
      blob: Blob;
    };

/**
 * Main hypercert record representing an impact claim.
 *
 * This is the core data structure for a hypercert, containing all
 * information about the claimed impact, work scope, and timeframe.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.record` lexicon.
 *
 * The `[key: string]: unknown` index signature allows for ATProto
 * API compatibility and forward compatibility with lexicon extensions.
 *
 * @example
 * ```typescript
 * const record: HypercertRecord = {
 *   title: "Reforestation Project",
 *   description: "Planted 10,000 trees in deforested areas",
 *   workScope: "Environmental Restoration",
 *   workTimeframeFrom: "2024-01-01T00:00:00.000Z",
 *   workTimeframeTo: "2024-12-31T23:59:59.999Z",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 *   rights: { uri: "at://did:plc:abc/org.hypercerts.rights/xyz", cid: "bafyrei..." },
 * };
 * ```
 */
export interface HypercertRecord {
  /**
   * Title of the hypercert.
   *
   * Should be concise but descriptive of the impact claim.
   */
  title: string;

  /**
   * Detailed description of the impact.
   *
   * Can include methodology, outcomes, and supporting details.
   * Supports markdown formatting.
   */
  description: string;

  /**
   * Scope of work or impact area.
   *
   * @example "Climate Action", "Education", "Healthcare", "Conservation"
   */
  workScope: string;

  /**
   * Start of the work timeframe.
   *
   * ISO 8601 datetime string.
   *
   * @example "2024-01-01T00:00:00.000Z"
   */
  workTimeframeFrom: string;

  /**
   * End of the work timeframe.
   *
   * ISO 8601 datetime string.
   *
   * @example "2024-12-31T23:59:59.999Z"
   */
  workTimeframeTo: string;

  /**
   * When this record was created.
   *
   * ISO 8601 datetime string, auto-set by the SDK.
   */
  createdAt: string;

  /**
   * Optional short description for previews and cards.
   *
   * Should be under 200 characters.
   */
  shortDescription?: string;

  /**
   * Optional cover image for the hypercert.
   */
  image?: HypercertImage;

  /**
   * Optional array of evidence supporting the claim.
   */
  evidence?: HypercertEvidence[];

  /**
   * Optional references to contribution records.
   *
   * Each entry is a strong reference (AT-URI + CID) to a contribution record.
   */
  contributions?: Array<{ uri: string; cid: string }>;

  /**
   * Reference to the associated rights record.
   *
   * Strong reference (AT-URI + CID) to the rights definition.
   */
  rights?: { uri: string; cid: string };

  /**
   * Reference to the primary location record.
   *
   * Strong reference (AT-URI + CID) to a location record.
   */
  location?: { uri: string; cid: string };

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Rights record defining the rights associated with a hypercert.
 *
 * Rights specify what can be done with the hypercert, such as
 * transfer, attribution requirements, or commercial use.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.rights` lexicon.
 *
 * @example
 * ```typescript
 * const rights: RightsRecord = {
 *   rightsName: "Attribution",
 *   rightsType: "license",
 *   rightsDescription: "CC-BY-4.0 - Attribution required",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * };
 * ```
 */
export interface RightsRecord {
  /**
   * Name of the rights.
   *
   * @example "Attribution", "Public Domain", "Impact Rights"
   */
  rightsName: string;

  /**
   * Type/category of rights.
   *
   * @example "license", "impact-rights", "ownership"
   */
  rightsType: string;

  /**
   * Description of the rights terms.
   *
   * Can include license text or detailed terms.
   */
  rightsDescription: string;

  /**
   * When this record was created.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * AT Protocol blob reference.
 *
 * Returned by `com.atproto.repo.uploadBlob` when uploading binary data.
 * Used to reference uploaded images, files, or GeoJSON data in records.
 *
 * @example
 * ```typescript
 * const blobRef: BlobRef = {
 *   $type: "blob",
 *   ref: { $link: "bafyreibq3..." },
 *   mimeType: "image/jpeg",
 *   size: 102400,
 * };
 * ```
 */
export interface BlobRef {
  /**
   * Type discriminator for blob references.
   *
   * Always `"blob"` for blob references.
   */
  $type: "blob";

  /**
   * Reference containing the blob's CID.
   *
   * The `$link` property contains the Content Identifier.
   */
  ref: { $link: string };

  /**
   * MIME type of the blob content.
   *
   * @example "image/jpeg", "image/png", "application/geo+json"
   */
  mimeType: string;

  /**
   * Size of the blob in bytes.
   */
  size: number;
}

/**
 * Location record for geographic context of a hypercert.
 *
 * Locations can be specified as simple text, coordinates, or
 * detailed GeoJSON boundaries.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.location` lexicon.
 *
 * @example Simple location
 * ```typescript
 * const location: LocationRecord = {
 *   hypercert: { uri: "at://...", cid: "bafyrei..." },
 *   value: "San Francisco, CA, USA",
 *   name: "SF Bay Area",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * };
 * ```
 *
 * @example Location with GeoJSON
 * ```typescript
 * const location: LocationRecord = {
 *   hypercert: { uri: "at://...", cid: "bafyrei..." },
 *   value: geojsonBlobRef,  // BlobRef to uploaded GeoJSON
 *   srs: "EPSG:4326",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * };
 * ```
 */
export interface LocationRecord {
  /**
   * Reference to the associated hypercert.
   *
   * Optional for backward compatibility.
   */
  hypercert?: { uri: string; cid: string };

  /**
   * Location value - either a string description or a blob reference.
   *
   * - String: Human-readable location (address, coordinates, description)
   * - BlobRef: Reference to uploaded GeoJSON or other spatial data
   */
  value: string | BlobRef;

  /**
   * When this record was created.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /**
   * Human-readable name for the location.
   */
  name?: string;

  /**
   * Description of the location's relevance or scope.
   */
  description?: string;

  /**
   * Spatial Reference System identifier.
   *
   * @example "EPSG:4326" for WGS84 (standard GPS coordinates)
   */
  srs?: string;

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Contribution record tracking who contributed to a hypercert.
 *
 * Contributions credit individuals or organizations for their
 * role in the impact work.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.contribution` lexicon.
 *
 * @example
 * ```typescript
 * const contribution: ContributionRecord = {
 *   contributors: ["did:plc:alice", "did:plc:bob"],
 *   role: "implementer",
 *   description: "On-ground implementation and monitoring",
 *   hypercert: { uri: "at://...", cid: "bafyrei..." },
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * };
 * ```
 */
export interface ContributionRecord {
  /**
   * DIDs of the contributors.
   *
   * Array of Decentralized Identifiers for all contributors in this role.
   */
  contributors: string[];

  /**
   * Role of the contributors in the work.
   *
   * @example "coordinator", "implementer", "funder", "volunteer", "researcher"
   */
  role: string;

  /**
   * When this record was created.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /**
   * Reference to the associated hypercert.
   */
  hypercert?: { uri: string; cid: string };

  /**
   * Description of the contribution.
   */
  description?: string;

  /**
   * Start of the contribution timeframe.
   *
   * ISO 8601 datetime string. May differ from hypercert timeframe.
   */
  workTimeframeFrom?: string;

  /**
   * End of the contribution timeframe.
   *
   * ISO 8601 datetime string.
   */
  workTimeframeTo?: string;

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Measurement record for quantifying hypercert impact.
 *
 * Measurements provide specific metrics and values that quantify
 * the claimed impact.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.measurement` lexicon.
 *
 * @example
 * ```typescript
 * const measurement: MeasurementRecord = {
 *   hypercert: { uri: "at://...", cid: "bafyrei..." },
 *   measurers: ["did:plc:auditor"],
 *   metric: "Carbon Offset",
 *   value: "150 tons CO2e",
 *   createdAt: "2024-06-15T10:30:00.000Z",
 *   measurementMethodURI: "https://example.com/methodology",
 * };
 * ```
 */
export interface MeasurementRecord {
  /**
   * Reference to the hypercert being measured.
   */
  hypercert: { uri: string; cid: string };

  /**
   * DIDs of entities who performed the measurement.
   */
  measurers: string[];

  /**
   * Name of the metric being measured.
   *
   * @example "Carbon Offset", "Trees Planted", "Students Taught"
   */
  metric: string;

  /**
   * Measured value with units.
   *
   * @example "150 tons CO2e", "10000", "500 students"
   */
  value: string;

  /**
   * When this measurement was recorded.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /**
   * URI to the measurement methodology documentation.
   */
  measurementMethodURI?: string;

  /**
   * URIs to evidence supporting this measurement.
   */
  evidenceURI?: string[];

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Evaluation record for third-party assessment of a hypercert.
 *
 * Evaluations provide independent verification or assessment
 * of the claims made in a hypercert.
 *
 * @remarks
 * Based on the `org.hypercerts.claim.evaluation` lexicon.
 *
 * @example
 * ```typescript
 * const evaluation: EvaluationRecord = {
 *   subject: { uri: "at://...", cid: "bafyrei..." },
 *   evaluators: ["did:plc:auditor-org"],
 *   summary: "Claims verified through site visit and data review",
 *   createdAt: "2024-07-01T10:30:00.000Z",
 * };
 * ```
 */
export interface EvaluationRecord {
  /**
   * Reference to the record being evaluated.
   *
   * Typically a hypercert, but could be other record types.
   */
  subject: { uri: string; cid: string };

  /**
   * DIDs of the evaluating entities.
   */
  evaluators: string[];

  /**
   * Summary of the evaluation findings.
   */
  summary: string;

  /**
   * When this evaluation was created.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /**
   * Optional detailed evaluation documents.
   *
   * Can be URI references or blob uploads.
   */
  evaluations?: Array<{ type: "uri"; uri: string } | { type: "blob"; blob: Blob }>;

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Claim item within a collection.
 *
 * Represents a hypercert included in a collection with an
 * associated weight indicating its relative importance.
 *
 * @remarks
 * Based on the `claimItem` definition in `org.hypercerts.collection` lexicon.
 */
export interface CollectionClaimItem {
  /**
   * Strong reference to the hypercert claim record.
   */
  claim: { uri: string; cid: string };

  /**
   * Weight of this claim in the collection.
   *
   * String representation of a percentage (0-100).
   * Sum of weights across all claims should equal 100.
   *
   * @example "50", "33.33", "25"
   */
  weight: string;
}

/**
 * Collection record for grouping related hypercerts.
 *
 * Collections allow organizing multiple hypercerts into a single
 * portfolio or project grouping.
 *
 * @remarks
 * Based on the `org.hypercerts.collection` lexicon.
 *
 * @example
 * ```typescript
 * const collection: CollectionRecord = {
 *   title: "Climate Projects 2024",
 *   shortDescription: "Our climate impact portfolio",
 *   claims: [
 *     { claim: { uri: "at://...", cid: "..." }, weight: "50" },
 *     { claim: { uri: "at://...", cid: "..." }, weight: "30" },
 *     { claim: { uri: "at://...", cid: "..." }, weight: "20" },
 *   ],
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * };
 * ```
 */
export interface CollectionRecord {
  /**
   * Title of the collection.
   */
  title: string;

  /**
   * Hypercerts included in this collection with weights.
   */
  claims: CollectionClaimItem[];

  /**
   * When this collection was created.
   *
   * ISO 8601 datetime string.
   */
  createdAt: string;

  /**
   * Optional short description for previews.
   */
  shortDescription?: string;

  /**
   * Optional cover photo for the collection.
   */
  coverPhoto?: { type: "uri"; uri: string } | { type: "blob"; blob: Blob };

  /** Index signature for ATProto API compatibility */
  [key: string]: unknown;
}

/**
 * Response from creating a hypercert.
 *
 * @deprecated Use {@link CreateHypercertResult} from repository interfaces instead.
 */
export interface CreateHypercertResponse {
  /** Whether the creation succeeded */
  success: boolean;
  /** URI of the created hypercert (if successful) */
  hypercertUri?: string;
  /** URI of the created rights record (if successful) */
  rightsUri?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Hypercert with its AT Protocol metadata.
 *
 * Combines the record data with its URI and CID for complete
 * reference information.
 */
export interface HypercertWithMetadata {
  /**
   * AT-URI of the hypercert.
   *
   * Format: `at://{did}/{collection}/{rkey}`
   */
  uri: string;

  /**
   * Content Identifier (CID) of the record.
   */
  cid: string;

  /**
   * The hypercert record data.
   */
  record: HypercertRecord;
}
