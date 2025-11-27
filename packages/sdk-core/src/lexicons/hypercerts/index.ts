/**
 * Hypercert lexicon definitions for AT Protocol.
 *
 * This module re-exports lexicon documents and collection names
 * from the @hypercerts-org/lexicon package.
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
 *   collection: HYPERCERT_COLLECTIONS.CLAIM,
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

export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "@hypercerts-org/lexicon";
