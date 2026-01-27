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
  STRONG_REF_LEXICON_JSON,
  HYPERCERTS_DEFS_LEXICON_JSON,
  ACTIVITY_LEXICON_JSON,
  COLLECTION_LEXICON_JSON,
  CONTRIBUTION_DETAILS_LEXICON_JSON,
  CONTRIBUTOR_INFORMATION_LEXICON_JSON,
  EVALUATION_LEXICON_JSON,
  ATTACHMENT_LEXICON_JSON,
  MEASUREMENT_LEXICON_JSON,
  RIGHTS_LEXICON_JSON,
  BADGE_AWARD_LEXICON_JSON,
  BADGE_DEFINITION_LEXICON_JSON,
  BADGE_RESPONSE_LEXICON_JSON,
  FUNDING_RECEIPT_LEXICON_JSON,
  WORK_SCOPE_TAG_LEXICON_JSON,
  // NSID constants
  ACTIVITY_NSID,
  RIGHTS_NSID,
  LOCATION_NSID,
  CONTRIBUTION_DETAILS_NSID,
  CONTRIBUTOR_INFORMATION_NSID,
  MEASUREMENT_NSID,
  EVALUATION_NSID,
  ATTACHMENT_NSID,
  COLLECTION_NSID,
  BADGE_AWARD_NSID,
  BADGE_DEFINITION_NSID,
  BADGE_RESPONSE_NSID,
  FUNDING_RECEIPT_NSID,
  WORK_SCOPE_TAG_NSID,
} from "@hypercerts-org/lexicon";

// Export LexiconRegistry for custom lexicon management
export { LexiconRegistry } from "./repository/LexiconRegistry.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";

/**
 * All hypercert-related lexicons for registration with AT Protocol Agent.
 * This array contains all lexicon documents from the published package.
 */
export const HYPERCERT_LEXICONS: LexiconDoc[] = [
  CERTIFIED_DEFS_LEXICON_JSON as LexiconDoc,
  LOCATION_LEXICON_JSON as LexiconDoc,
  STRONG_REF_LEXICON_JSON as LexiconDoc,
  HYPERCERTS_DEFS_LEXICON_JSON as LexiconDoc,
  ACTIVITY_LEXICON_JSON as LexiconDoc,
  COLLECTION_LEXICON_JSON as LexiconDoc,
  CONTRIBUTION_DETAILS_LEXICON_JSON as LexiconDoc,
  CONTRIBUTOR_INFORMATION_LEXICON_JSON as LexiconDoc,
  EVALUATION_LEXICON_JSON as LexiconDoc,
  ATTACHMENT_LEXICON_JSON as LexiconDoc,
  MEASUREMENT_LEXICON_JSON as LexiconDoc,
  RIGHTS_LEXICON_JSON as LexiconDoc,
  BADGE_AWARD_LEXICON_JSON as LexiconDoc,
  BADGE_DEFINITION_LEXICON_JSON as LexiconDoc,
  BADGE_RESPONSE_LEXICON_JSON as LexiconDoc,
  FUNDING_RECEIPT_LEXICON_JSON as LexiconDoc,
  WORK_SCOPE_TAG_LEXICON_JSON as LexiconDoc,
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
   * Contribution details record collection.
   * For storing details about a specific contribution (role, description, timeframe).
   */
  CONTRIBUTION_DETAILS: CONTRIBUTION_DETAILS_NSID,

  /**
   * Contributor information record collection.
   * For storing contributor profile information (identifier, displayName, image).
   */
  CONTRIBUTOR_INFORMATION: CONTRIBUTOR_INFORMATION_NSID,

  /**
   * Measurement record collection.
   */
  MEASUREMENT: MEASUREMENT_NSID,

  /**
   * Evaluation record collection.
   */
  EVALUATION: EVALUATION_NSID,

  /**
   * Attachment record collection (formerly evidence).
   * @remarks Renamed from EVIDENCE in beta.13
   */
  ATTACHMENT: ATTACHMENT_NSID,

  /**
   * @deprecated Use ATTACHMENT instead. Renamed in beta.13.
   */
  EVIDENCE: ATTACHMENT_NSID,

  /**
   * Collection record collection (groups of hypercerts).
   * Projects are now collections with type='project'.
   */
  COLLECTION: COLLECTION_NSID,

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

  /**
   * Work scope tag record collection.
   * For defining reusable work scope atoms.
   */
  WORK_SCOPE_TAG: WORK_SCOPE_TAG_NSID,
} as const;
