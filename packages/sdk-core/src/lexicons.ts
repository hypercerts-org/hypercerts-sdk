/**
 * Lexicons entrypoint - Lexicon definitions and registry.
 *
 * This sub-entrypoint exports the lexicon registry and hypercert
 * lexicon constants for working with AT Protocol record schemas.
 *
 * @remarks
 * Import from `@hypercerts-org/sdk/lexicons`:
 *
 * ```typescript
 * import {
 *   LexiconRegistry,
 *   HYPERCERT_LEXICONS,
 *   HYPERCERT_COLLECTIONS,
 * } from "@hypercerts-org/sdk/lexicons";
 * ```
 *
 * **Exports**:
 * - {@link LexiconRegistry} - Registry for managing and validating lexicons
 * - {@link HYPERCERT_LEXICONS} - Array of all hypercert lexicon documents
 * - {@link HYPERCERT_COLLECTIONS} - Constants for collection NSIDs
 *
 * @example Using collection constants
 * ```typescript
 * import { HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk/lexicons";
 *
 * // List hypercerts using the correct collection name
 * const records = await repo.records.list({
 *   collection: HYPERCERT_COLLECTIONS.RECORD,
 * });
 *
 * // List contributions
 * const contributions = await repo.records.list({
 *   collection: HYPERCERT_COLLECTIONS.CONTRIBUTION,
 * });
 * ```
 *
 * @example Custom lexicon registration
 * ```typescript
 * import { LexiconRegistry } from "@hypercerts-org/sdk/lexicons";
 *
 * const registry = sdk.getLexiconRegistry();
 *
 * // Register custom lexicon
 * registry.register({
 *   lexicon: 1,
 *   id: "org.myapp.customRecord",
 *   defs: { ... },
 * });
 *
 * // Validate a record
 * const result = registry.validate("org.myapp.customRecord", record);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 *
 * @packageDocumentation
 */

// Import lexicon JSON files and constants from the published package
import type { LexiconDoc } from "@atproto/lexicon";
import {
  CERTIFIED_DEFS_LEXICON_JSON,
  LOCATION_LEXICON_JSON,
  STRONGREF_LEXICON_JSON,
  HYPERCERTS_DEFS_LEXICON_JSON,
  ACTIVITY_LEXICON_JSON,
  COLLECTION_LEXICON_JSON,
  CONTRIBUTION_LEXICON_JSON,
  EVALUATION_LEXICON_JSON,
  EVIDENCE_LEXICON_JSON,
  MEASUREMENT_LEXICON_JSON,
  RIGHTS_LEXICON_JSON,
  PROJECT_LEXICON_JSON,
  BADGE_AWARD_LEXICON_JSON,
  BADGE_DEFINITION_LEXICON_JSON,
  BADGE_RESPONSE_LEXICON_JSON,
  FUNDING_RECEIPT_LEXICON_JSON,
  // NSID constants
  ACTIVITY_NSID,
  RIGHTS_NSID,
  LOCATION_NSID,
  CONTRIBUTION_NSID,
  MEASUREMENT_NSID,
  EVALUATION_NSID,
  EVIDENCE_NSID,
  COLLECTION_NSID,
  PROJECT_NSID,
  BADGE_AWARD_NSID,
  BADGE_DEFINITION_NSID,
  BADGE_RESPONSE_NSID,
  FUNDING_RECEIPT_NSID,
} from "@hypercerts-org/lexicon";

/**
 * All hypercert-related lexicons for registration with AT Protocol Agent.
 * This array contains all lexicon documents from the published package.
 */
export const HYPERCERT_LEXICONS: LexiconDoc[] = [
  CERTIFIED_DEFS_LEXICON_JSON as LexiconDoc,
  LOCATION_LEXICON_JSON as LexiconDoc,
  STRONGREF_LEXICON_JSON as LexiconDoc,
  HYPERCERTS_DEFS_LEXICON_JSON as LexiconDoc,
  ACTIVITY_LEXICON_JSON as LexiconDoc,
  COLLECTION_LEXICON_JSON as LexiconDoc,
  CONTRIBUTION_LEXICON_JSON as LexiconDoc,
  EVALUATION_LEXICON_JSON as LexiconDoc,
  EVIDENCE_LEXICON_JSON as LexiconDoc,
  MEASUREMENT_LEXICON_JSON as LexiconDoc,
  RIGHTS_LEXICON_JSON as LexiconDoc,
  PROJECT_LEXICON_JSON as LexiconDoc,
  BADGE_AWARD_LEXICON_JSON as LexiconDoc,
  BADGE_DEFINITION_LEXICON_JSON as LexiconDoc,
  BADGE_RESPONSE_LEXICON_JSON as LexiconDoc,
  FUNDING_RECEIPT_LEXICON_JSON as LexiconDoc,
];

/**
 * Collection NSIDs (Namespaced Identifiers) for hypercert records.
 *
 * Use these constants when performing record operations to ensure
 * correct collection names.
 */
export const HYPERCERT_COLLECTIONS = {
  /**
   * Main hypercert claim record collection.
   */
  CLAIM: ACTIVITY_NSID,

  /**
   * Rights record collection.
   */
  RIGHTS: RIGHTS_NSID,

  /**
   * Location record collection (shared certified lexicon).
   */
  LOCATION: LOCATION_NSID,

  /**
   * Contribution record collection.
   */
  CONTRIBUTION: CONTRIBUTION_NSID,

  /**
   * Measurement record collection.
   */
  MEASUREMENT: MEASUREMENT_NSID,

  /**
   * Evaluation record collection.
   */
  EVALUATION: EVALUATION_NSID,

  /**
   * Evidence record collection.
   */
  EVIDENCE: EVIDENCE_NSID,

  /**
   * Collection record collection (groups of hypercerts).
   */
  COLLECTION: COLLECTION_NSID,

  /**
   * Project record collection.
   */
  PROJECT: PROJECT_NSID,

  /**
   * Badge award record collection.
   */
  BADGE_AWARD: BADGE_AWARD_NSID,

  /**
   * Badge definition record collection.
   */
  BADGE_DEFINITION: BADGE_DEFINITION_NSID,

  /**
   * Badge response record collection.
   */
  BADGE_RESPONSE: BADGE_RESPONSE_NSID,

  /**
   * Funding receipt record collection.
   */
  FUNDING_RECEIPT: FUNDING_RECEIPT_NSID,
} as const;
