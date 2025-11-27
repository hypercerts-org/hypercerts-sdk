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

export { LexiconRegistry } from "./repository/LexiconRegistry.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";

export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "@hypercerts-org/lexicon";
