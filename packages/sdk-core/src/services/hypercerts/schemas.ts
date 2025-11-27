/**
 * Zod schemas for hypercert lexicon types.
 *
 * This module provides runtime validation schemas using Zod for all
 * hypercert record types. These schemas are used to validate data
 * received from the AT Protocol API and ensure type safety.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Schema for AT Protocol strong references.
 *
 * Strong references link to other records using their AT-URI and CID,
 * providing content-addressable links that can be verified.
 *
 * @example
 * ```typescript
 * const ref = StrongRefSchema.parse({
 *   uri: "at://did:plc:abc/org.hypercerts.hypercert/xyz",
 *   cid: "bafyreibq3...",
 * });
 * ```
 */
export const StrongRefSchema = z.object({
  /** AT-URI of the referenced record */
  uri: z.string(),
  /** Content Identifier for verification */
  cid: z.string(),
});

/**
 * Schema for AT Protocol blob references.
 *
 * Blob references point to uploaded binary data (images, files)
 * and include metadata about the content.
 *
 * @example
 * ```typescript
 * const blobRef = BlobRefSchema.parse({
 *   $type: "blob",
 *   ref: { $link: "bafyreibq3..." },
 *   mimeType: "image/jpeg",
 *   size: 102400,
 * });
 * ```
 */
export const BlobRefSchema = z.object({
  /** Type discriminator, always "blob" */
  $type: z.literal("blob"),
  /** Reference containing the CID */
  ref: z.object({ $link: z.string() }),
  /** MIME type of the blob content */
  mimeType: z.string(),
  /** Size in bytes */
  size: z.number(),
});

/**
 * Schema for hypercert evidence items.
 *
 * Evidence provides supporting documentation for impact claims.
 */
export const HypercertEvidenceSchema = z.object({
  /** URI to the evidence resource */
  uri: z.string(),
  /** Optional title */
  title: z.string().optional(),
  /** Optional description */
  description: z.string().optional(),
});

/**
 * Schema for hypercert images.
 *
 * Images can be external URIs or uploaded blobs.
 */
export const HypercertImageSchema = z.union([
  z.object({ type: z.literal("uri"), uri: z.string() }),
  z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
]);

/**
 * Schema for rights records.
 *
 * Validates the structure of rights definitions associated with hypercerts.
 *
 * @example
 * ```typescript
 * const rights = RightsRecordSchema.parse({
 *   rightsName: "Attribution",
 *   rightsType: "license",
 *   rightsDescription: "CC-BY-4.0",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 * });
 * ```
 */
export const RightsRecordSchema = z.object({
  /** Name of the rights */
  rightsName: z.string(),
  /** Type/category of rights */
  rightsType: z.string(),
  /** Description of terms */
  rightsDescription: z.string(),
  /** ISO 8601 creation timestamp */
  createdAt: z.string(),
});

/**
 * Schema for hypercert records.
 *
 * Validates the complete structure of a hypercert, including all
 * required and optional fields.
 *
 * @example
 * ```typescript
 * const hypercert = HypercertRecordSchema.parse(recordFromApi);
 * if (hypercert) {
 *   console.log(hypercert.title);
 * }
 * ```
 */
export const HypercertRecordSchema = z.object({
  /** Hypercert title */
  title: z.string(),
  /** Detailed description */
  description: z.string(),
  /** Work scope/category */
  workScope: z.string(),
  /** Work period start (ISO 8601) */
  workTimeframeFrom: z.string(),
  /** Work period end (ISO 8601) */
  workTimeframeTo: z.string(),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** Optional short description */
  shortDescription: z.string().optional(),
  /** Optional image (URI, blob, or blob reference) */
  image: z.union([HypercertImageSchema, BlobRefSchema]).optional(),
  /** Optional evidence array */
  evidence: z.array(HypercertEvidenceSchema).optional(),
  /** Optional contribution references */
  contributions: z.array(StrongRefSchema).optional(),
  /** Optional rights reference */
  rights: StrongRefSchema.optional(),
  /** Optional location reference */
  location: StrongRefSchema.optional(),
});

/**
 * Schema for location records.
 *
 * Validates location data which can be text-based or GeoJSON blobs.
 */
export const LocationRecordSchema = z.object({
  /** Reference to parent hypercert (optional for compatibility) */
  hypercert: StrongRefSchema.optional(),
  /** Location value - string description or blob reference */
  value: z.union([z.string(), BlobRefSchema]),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** Human-readable name */
  name: z.string().optional(),
  /** Location description */
  description: z.string().optional(),
  /** Spatial Reference System (e.g., "EPSG:4326") */
  srs: z.string().optional(),
});

/**
 * Schema for contribution records.
 *
 * Validates contribution tracking data.
 */
export const ContributionRecordSchema = z.object({
  /** Array of contributor DIDs */
  contributors: z.array(z.string()),
  /** Contributor role */
  role: z.string(),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** Reference to associated hypercert */
  hypercert: StrongRefSchema.optional(),
  /** Contribution description */
  description: z.string().optional(),
  /** Contribution start time (ISO 8601) */
  workTimeframeFrom: z.string().optional(),
  /** Contribution end time (ISO 8601) */
  workTimeframeTo: z.string().optional(),
});

/**
 * Schema for measurement records.
 *
 * Validates quantitative impact measurements.
 */
export const MeasurementRecordSchema = z.object({
  /** Reference to measured hypercert */
  hypercert: StrongRefSchema,
  /** DIDs of measurers */
  measurers: z.array(z.string()),
  /** Metric name */
  metric: z.string(),
  /** Measured value with units */
  value: z.string(),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** URI to methodology documentation */
  measurementMethodURI: z.string().optional(),
  /** URIs to supporting evidence */
  evidenceURI: z.array(z.string()).optional(),
});

/**
 * Schema for evaluation records.
 *
 * Validates third-party assessment data.
 */
export const EvaluationRecordSchema = z.object({
  /** Reference to evaluated record */
  subject: StrongRefSchema,
  /** DIDs of evaluators */
  evaluators: z.array(z.string()),
  /** Evaluation summary */
  summary: z.string(),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** Optional detailed evaluation documents */
  evaluations: z
    .array(
      z.union([
        z.object({ type: z.literal("uri"), uri: z.string() }),
        z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
      ]),
    )
    .optional(),
});

/**
 * Schema for collection claim items.
 *
 * Validates individual claims within a collection.
 */
export const CollectionClaimItemSchema = z.object({
  /** Strong reference to the hypercert */
  claim: StrongRefSchema,
  /** Weight as string (0-100) */
  weight: z.string(),
});

/**
 * Schema for collection records.
 *
 * Validates hypercert collection/portfolio structures.
 *
 * @example
 * ```typescript
 * const collection = CollectionRecordSchema.parse(recordFromApi);
 * console.log(`${collection.title}: ${collection.claims.length} claims`);
 * ```
 */
export const CollectionRecordSchema = z.object({
  /** Collection title */
  title: z.string(),
  /** Array of claims with weights */
  claims: z.array(CollectionClaimItemSchema),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string(),
  /** Optional short description */
  shortDescription: z.string().optional(),
  /** Optional cover photo */
  coverPhoto: z
    .union([
      z.object({ type: z.literal("uri"), uri: z.string() }),
      z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
      BlobRefSchema,
    ])
    .optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

/** Type for strong references (AT-URI + CID) */
export type StrongRef = z.infer<typeof StrongRefSchema>;

/** Type for blob references */
export type BlobRefParsed = z.infer<typeof BlobRefSchema>;

/** Type for evidence items */
export type HypercertEvidenceParsed = z.infer<typeof HypercertEvidenceSchema>;

/** Type for rights records */
export type RightsRecordParsed = z.infer<typeof RightsRecordSchema>;

/** Type for hypercert records */
export type HypercertRecordParsed = z.infer<typeof HypercertRecordSchema>;

/** Type for location records */
export type LocationRecordParsed = z.infer<typeof LocationRecordSchema>;

/** Type for contribution records */
export type ContributionRecordParsed = z.infer<typeof ContributionRecordSchema>;

/** Type for measurement records */
export type MeasurementRecordParsed = z.infer<typeof MeasurementRecordSchema>;

/** Type for evaluation records */
export type EvaluationRecordParsed = z.infer<typeof EvaluationRecordSchema>;

/** Type for collection records */
export type CollectionRecordParsed = z.infer<typeof CollectionRecordSchema>;

// ============================================================================
// Parse Functions
// ============================================================================

/**
 * Parses and validates a hypercert record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed hypercert record
 * @throws {z.ZodError} if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const record = parseHypercertRecord(apiResponse.value);
 *   console.log(record.title);
 * } catch (error) {
 *   console.error("Invalid record:", error);
 * }
 * ```
 */
export function parseHypercertRecord(data: unknown): HypercertRecordParsed {
  return HypercertRecordSchema.parse(data);
}

/**
 * Parses and validates a rights record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed rights record
 * @throws {z.ZodError} if validation fails
 */
export function parseRightsRecord(data: unknown): RightsRecordParsed {
  return RightsRecordSchema.parse(data);
}

/**
 * Parses and validates a location record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed location record
 * @throws {z.ZodError} if validation fails
 */
export function parseLocationRecord(data: unknown): LocationRecordParsed {
  return LocationRecordSchema.parse(data);
}

/**
 * Parses and validates a contribution record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed contribution record
 * @throws {z.ZodError} if validation fails
 */
export function parseContributionRecord(data: unknown): ContributionRecordParsed {
  return ContributionRecordSchema.parse(data);
}

/**
 * Parses and validates a measurement record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed measurement record
 * @throws {z.ZodError} if validation fails
 */
export function parseMeasurementRecord(data: unknown): MeasurementRecordParsed {
  return MeasurementRecordSchema.parse(data);
}

/**
 * Parses and validates an evaluation record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed evaluation record
 * @throws {z.ZodError} if validation fails
 */
export function parseEvaluationRecord(data: unknown): EvaluationRecordParsed {
  return EvaluationRecordSchema.parse(data);
}

/**
 * Parses and validates a collection record from AT Protocol response.
 *
 * @param data - Raw data from the API
 * @returns Validated and typed collection record
 * @throws {z.ZodError} if validation fails
 */
export function parseCollectionRecord(data: unknown): CollectionRecordParsed {
  return CollectionRecordSchema.parse(data);
}

// ============================================================================
// Safe Parse Functions
// ============================================================================

/**
 * Safely parses a hypercert record, returning null on failure.
 *
 * @param data - Raw data from the API
 * @returns Validated record or `null` if invalid
 *
 * @example
 * ```typescript
 * const record = safeParseHypercertRecord(apiResponse.value);
 * if (record) {
 *   // record is typed and valid
 * } else {
 *   // handle invalid data
 * }
 * ```
 */
export function safeParseHypercertRecord(data: unknown): HypercertRecordParsed | null {
  const result = HypercertRecordSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Safely parses a collection record, returning null on failure.
 *
 * @param data - Raw data from the API
 * @returns Validated record or `null` if invalid
 */
export function safeParseCollectionRecord(data: unknown): CollectionRecordParsed | null {
  const result = CollectionRecordSchema.safeParse(data);
  return result.success ? result.data : null;
}
