/**
 * Hypercert lexicon definitions for AT Protocol.
 *
 * This module exports the lexicon documents and collection names
 * for all hypercert-related record types. Lexicons define the
 * schema for records stored in AT Protocol repositories.
 *
 * @remarks
 * Lexicons are registered with the SDK's {@link LexiconRegistry} to enable:
 * - Runtime validation of record data
 * - Type-safe record operations
 * - Proper serialization/deserialization
 *
 * The lexicons follow the AT Protocol lexicon specification and define
 * the structure of each record type in the hypercerts namespace.
 *
 * @see https://atproto.com/specs/lexicon for the Lexicon specification
 *
 * @example Accessing collection names
 * ```typescript
 * import { HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk/lexicons";
 *
 * // Use collection names for record operations
 * await repo.records.list({
 *   collection: HYPERCERT_COLLECTIONS.RECORD,
 * });
 * ```
 *
 * @example Registering lexicons manually
 * ```typescript
 * import { HYPERCERT_LEXICONS } from "@hypercerts-org/sdk/lexicons";
 *
 * // Lexicons are auto-registered, but can be added manually
 * const registry = sdk.getLexiconRegistry();
 * registry.registerMany(HYPERCERT_LEXICONS);
 * ```
 *
 * @packageDocumentation
 */

import defsLexicon from "./defs.json";
import hypercertLexicon from "./hypercert.json";
import collectionLexicon from "./hypercertCollection.json";
import contributionLexicon from "./hypercertContribution.json";
import evaluationLexicon from "./hypercertEvaluation.json";
import locationLexicon from "./hypercertLocation.json";
import measurementLexicon from "./hypercertMeasurement.json";
import rightsLexicon from "./hypercertRights.json";
import type { LexiconDoc } from "@atproto/lexicon";

/**
 * All hypercert-related lexicons for registration with AT Protocol Agent.
 *
 * This array contains all lexicon documents needed to work with
 * hypercert records. The SDK automatically registers these with
 * the {@link LexiconRegistry} when creating a {@link Repository}.
 *
 * @remarks
 * **Included Lexicons**:
 * - `org.hypercerts.defs` - Shared type definitions
 * - `org.hypercerts.claim.record` - Main hypercert record
 * - `org.hypercerts.claim.rights` - Rights definitions
 * - `org.hypercerts.claim.location` - Geographic locations
 * - `org.hypercerts.claim.contribution` - Contributor tracking
 * - `org.hypercerts.claim.measurement` - Impact measurements
 * - `org.hypercerts.claim.evaluation` - Third-party evaluations
 * - `org.hypercerts.collection` - Hypercert collections
 *
 * @example
 * ```typescript
 * import { HYPERCERT_LEXICONS } from "@hypercerts-org/sdk/lexicons";
 *
 * console.log(`Registering ${HYPERCERT_LEXICONS.length} lexicons`);
 * // Output: Registering 8 lexicons
 * ```
 */
export const HYPERCERT_LEXICONS: LexiconDoc[] = [
  defsLexicon as LexiconDoc,
  hypercertLexicon as LexiconDoc,
  rightsLexicon as LexiconDoc,
  locationLexicon as LexiconDoc,
  contributionLexicon as LexiconDoc,
  measurementLexicon as LexiconDoc,
  evaluationLexicon as LexiconDoc,
  collectionLexicon as LexiconDoc,
];

/**
 * Collection NSIDs (Namespaced Identifiers) for hypercert records.
 *
 * Use these constants when performing record operations to ensure
 * correct collection names. They match the lexicon IDs and are
 * used as the `collection` parameter in CRUD operations.
 *
 * @remarks
 * **NSID Format**: `{authority}.{name}` (e.g., `org.hypercerts.claim.record`)
 *
 * Using these constants instead of string literals provides:
 * - Type safety
 * - Autocomplete support
 * - Protection against typos
 * - Single source of truth for collection names
 *
 * @example Using collection names
 * ```typescript
 * import { HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk/lexicons";
 *
 * // List all hypercerts
 * const hypercerts = await repo.records.list({
 *   collection: HYPERCERT_COLLECTIONS.RECORD,
 * });
 *
 * // List all contributions
 * const contributions = await repo.records.list({
 *   collection: HYPERCERT_COLLECTIONS.CONTRIBUTION,
 * });
 *
 * // Create a measurement
 * await repo.records.create({
 *   collection: HYPERCERT_COLLECTIONS.MEASUREMENT,
 *   record: measurementData,
 * });
 * ```
 */
export const HYPERCERT_COLLECTIONS = {
  /**
   * Main hypercert record collection.
   *
   * Contains the core hypercert data: title, description,
   * work scope, timeframe, and references to related records.
   */
  RECORD: "org.hypercerts.claim.record",

  /**
   * Rights record collection.
   *
   * Defines the rights associated with hypercerts (licenses,
   * impact rights, ownership terms).
   */
  RIGHTS: "org.hypercerts.claim.rights",

  /**
   * Location record collection.
   *
   * Geographic information for hypercerts, supporting both
   * text descriptions and GeoJSON boundaries.
   */
  LOCATION: "org.hypercerts.claim.location",

  /**
   * Contribution record collection.
   *
   * Tracks contributors and their roles in the impact work.
   */
  CONTRIBUTION: "org.hypercerts.claim.contribution",

  /**
   * Measurement record collection.
   *
   * Quantitative impact measurements with metrics and values.
   */
  MEASUREMENT: "org.hypercerts.claim.measurement",

  /**
   * Evaluation record collection.
   *
   * Third-party assessments and verifications of impact claims.
   */
  EVALUATION: "org.hypercerts.claim.evaluation",

  /**
   * Collection record collection.
   *
   * Groups of hypercerts organized into portfolios or projects.
   */
  COLLECTION: "org.hypercerts.collection",
} as const;
