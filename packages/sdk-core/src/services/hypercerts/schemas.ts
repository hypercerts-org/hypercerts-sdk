/**
 * Zod schemas for hypercert lexicon types
 * Provides runtime validation for ATProto record data
 */

import { z } from "zod";

/**
 * Strong reference schema (ATProto link to another record)
 */
export const StrongRefSchema = z.object({
  uri: z.string(),
  cid: z.string(),
});

/**
 * Blob reference schema (ATProto blob)
 */
export const BlobRefSchema = z.object({
  $type: z.literal("blob"),
  ref: z.object({ $link: z.string() }),
  mimeType: z.string(),
  size: z.number(),
});

/**
 * Evidence schema
 */
export const HypercertEvidenceSchema = z.object({
  uri: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Hypercert image schema - can be URI or blob
 */
export const HypercertImageSchema = z.union([
  z.object({ type: z.literal("uri"), uri: z.string() }),
  z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
]);

/**
 * Rights record schema
 */
export const RightsRecordSchema = z.object({
  rightsName: z.string(),
  rightsType: z.string(),
  rightsDescription: z.string(),
  createdAt: z.string(),
});

/**
 * Hypercert record schema
 */
export const HypercertRecordSchema = z.object({
  title: z.string(),
  description: z.string(),
  workScope: z.string(),
  workTimeframeFrom: z.string(),
  workTimeframeTo: z.string(),
  createdAt: z.string(),
  shortDescription: z.string().optional(),
  image: z.union([HypercertImageSchema, BlobRefSchema]).optional(),
  evidence: z.array(HypercertEvidenceSchema).optional(),
  contributions: z.array(StrongRefSchema).optional(),
  rights: StrongRefSchema.optional(),
  location: StrongRefSchema.optional(),
});

/**
 * Location record schema
 */
export const LocationRecordSchema = z.object({
  hypercert: StrongRefSchema.optional(),
  value: z.union([z.string(), BlobRefSchema]),
  createdAt: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  srs: z.string().optional(),
});

/**
 * Contribution record schema
 */
export const ContributionRecordSchema = z.object({
  contributors: z.array(z.string()),
  role: z.string(),
  createdAt: z.string(),
  hypercert: StrongRefSchema.optional(),
  description: z.string().optional(),
  workTimeframeFrom: z.string().optional(),
  workTimeframeTo: z.string().optional(),
});

/**
 * Measurement record schema
 */
export const MeasurementRecordSchema = z.object({
  hypercert: StrongRefSchema,
  measurers: z.array(z.string()),
  metric: z.string(),
  value: z.string(),
  createdAt: z.string(),
  measurementMethodURI: z.string().optional(),
  evidenceURI: z.array(z.string()).optional(),
});

/**
 * Evaluation record schema
 */
export const EvaluationRecordSchema = z.object({
  subject: StrongRefSchema,
  evaluators: z.array(z.string()),
  summary: z.string(),
  createdAt: z.string(),
  evaluations: z.array(z.union([
    z.object({ type: z.literal("uri"), uri: z.string() }),
    z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
  ])).optional(),
});

/**
 * Collection claim item schema
 */
export const CollectionClaimItemSchema = z.object({
  claim: StrongRefSchema,
  weight: z.string(),
});

/**
 * Collection record schema
 */
export const CollectionRecordSchema = z.object({
  title: z.string(),
  claims: z.array(CollectionClaimItemSchema),
  createdAt: z.string(),
  shortDescription: z.string().optional(),
  coverPhoto: z.union([
    z.object({ type: z.literal("uri"), uri: z.string() }),
    z.object({ type: z.literal("blob"), blob: z.instanceof(Blob) }),
    BlobRefSchema,
  ]).optional(),
});

// Type exports inferred from schemas
export type StrongRef = z.infer<typeof StrongRefSchema>;
export type BlobRefParsed = z.infer<typeof BlobRefSchema>;
export type HypercertEvidenceParsed = z.infer<typeof HypercertEvidenceSchema>;
export type RightsRecordParsed = z.infer<typeof RightsRecordSchema>;
export type HypercertRecordParsed = z.infer<typeof HypercertRecordSchema>;
export type LocationRecordParsed = z.infer<typeof LocationRecordSchema>;
export type ContributionRecordParsed = z.infer<typeof ContributionRecordSchema>;
export type MeasurementRecordParsed = z.infer<typeof MeasurementRecordSchema>;
export type EvaluationRecordParsed = z.infer<typeof EvaluationRecordSchema>;
export type CollectionRecordParsed = z.infer<typeof CollectionRecordSchema>;

/**
 * Parse and validate a hypercert record from ATProto response
 */
export function parseHypercertRecord(data: unknown): HypercertRecordParsed {
  return HypercertRecordSchema.parse(data);
}

/**
 * Parse and validate a rights record from ATProto response
 */
export function parseRightsRecord(data: unknown): RightsRecordParsed {
  return RightsRecordSchema.parse(data);
}

/**
 * Parse and validate a location record from ATProto response
 */
export function parseLocationRecord(data: unknown): LocationRecordParsed {
  return LocationRecordSchema.parse(data);
}

/**
 * Parse and validate a contribution record from ATProto response
 */
export function parseContributionRecord(data: unknown): ContributionRecordParsed {
  return ContributionRecordSchema.parse(data);
}

/**
 * Parse and validate a measurement record from ATProto response
 */
export function parseMeasurementRecord(data: unknown): MeasurementRecordParsed {
  return MeasurementRecordSchema.parse(data);
}

/**
 * Parse and validate an evaluation record from ATProto response
 */
export function parseEvaluationRecord(data: unknown): EvaluationRecordParsed {
  return EvaluationRecordSchema.parse(data);
}

/**
 * Parse and validate a collection record from ATProto response
 */
export function parseCollectionRecord(data: unknown): CollectionRecordParsed {
  return CollectionRecordSchema.parse(data);
}

/**
 * Safe parse variants that return null on failure
 */
export function safeParseHypercertRecord(data: unknown): HypercertRecordParsed | null {
  const result = HypercertRecordSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseCollectionRecord(data: unknown): CollectionRecordParsed | null {
  const result = CollectionRecordSchema.safeParse(data);
  return result.success ? result.data : null;
}
