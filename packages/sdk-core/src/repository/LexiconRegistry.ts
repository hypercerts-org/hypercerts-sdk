import type { Agent } from "@atproto/api";
import type { LexiconDoc } from "@atproto/lexicon";
import { Lexicons } from "@atproto/lexicon";
import { ValidationError } from "../core/errors.js";

/**
 * Result of validating a record against a lexicon schema.
 */
export interface ValidationResult {
  /**
   * Whether the record is valid according to the lexicon schema.
   */
  valid: boolean;

  /**
   * Error message if validation failed.
   *
   * Only present when `valid` is `false`.
   */
  error?: string;
}

/**
 * Registry for managing and validating AT Protocol lexicon schemas.
 *
 * Lexicons are schema definitions that describe the structure of records
 * in the AT Protocol. This registry allows you to:
 *
 * - Register custom lexicons for your application's record types
 * - Validate records against their lexicon schemas
 * - Extend the AT Protocol Agent with custom lexicon support
 *
 * @remarks
 * The SDK automatically registers hypercert lexicons when creating a Repository.
 * You only need to use this class directly if you're working with custom
 * record types.
 *
 * **Lexicon IDs** follow the NSID (Namespaced Identifier) format:
 * `{authority}.{name}` (e.g., `org.hypercerts.hypercert`)
 *
 * @example Registering custom lexicons
 * ```typescript
 * const registry = sdk.getLexiconRegistry();
 *
 * // Register a single lexicon
 * registry.register({
 *   lexicon: 1,
 *   id: "org.example.myRecord",
 *   defs: {
 *     main: {
 *       type: "record",
 *       key: "tid",
 *       record: {
 *         type: "object",
 *         required: ["title", "createdAt"],
 *         properties: {
 *           title: { type: "string" },
 *           description: { type: "string" },
 *           createdAt: { type: "string", format: "datetime" },
 *         },
 *       },
 *     },
 *   },
 * });
 *
 * // Register multiple lexicons at once
 * registry.registerMany([lexicon1, lexicon2, lexicon3]);
 * ```
 *
 * @example Validating records
 * ```typescript
 * const result = registry.validate("org.example.myRecord", {
 *   title: "Test",
 *   createdAt: new Date().toISOString(),
 * });
 *
 * if (!result.valid) {
 *   console.error(`Validation failed: ${result.error}`);
 * }
 * ```
 *
 * @see https://atproto.com/specs/lexicon for the Lexicon specification
 */
export class LexiconRegistry {
  /** Map of lexicon ID to lexicon document */
  private lexicons = new Map<string, LexiconDoc>();

  /** Lexicons collection for validation */
  private lexiconsCollection: Lexicons;

  /**
   * Creates a new LexiconRegistry.
   *
   * The registry starts empty. Use {@link register} or {@link registerMany}
   * to add lexicons.
   */
  constructor() {
    this.lexiconsCollection = new Lexicons();
  }

  /**
   * Registers a single lexicon schema.
   *
   * @param lexicon - The lexicon document to register
   * @throws {@link ValidationError} if the lexicon doesn't have an `id` field
   *
   * @remarks
   * If a lexicon with the same ID is already registered, it will be
   * replaced with the new definition. This is useful for testing but
   * should generally be avoided in production.
   *
   * @example
   * ```typescript
   * registry.register({
   *   lexicon: 1,
   *   id: "org.example.post",
   *   defs: {
   *     main: {
   *       type: "record",
   *       key: "tid",
   *       record: {
   *         type: "object",
   *         required: ["text", "createdAt"],
   *         properties: {
   *           text: { type: "string", maxLength: 300 },
   *           createdAt: { type: "string", format: "datetime" },
   *         },
   *       },
   *     },
   *   },
   * });
   * ```
   */
  register(lexicon: LexiconDoc): void {
    if (!lexicon.id) {
      throw new ValidationError("Lexicon must have an 'id' field");
    }

    // Remove existing lexicon if present (to allow overwriting)
    if (this.lexicons.has(lexicon.id)) {
      // Lexicons collection doesn't support removal, so we create a new one
      // This is a limitation - in practice, lexicons shouldn't be overwritten
      // But we allow it for testing and flexibility
      const existingLexicon = this.lexicons.get(lexicon.id);
      if (existingLexicon) {
        // Try to remove from collection (may fail if not supported)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.lexiconsCollection as any).remove?.(lexicon.id);
        } catch {
          // If removal fails, create a new collection
          this.lexiconsCollection = new Lexicons();
          // Re-register all other lexicons
          for (const [id, lex] of this.lexicons.entries()) {
            if (id !== lexicon.id) {
              this.lexiconsCollection.add(lex);
            }
          }
        }
      }
    }

    this.lexicons.set(lexicon.id, lexicon);
    this.lexiconsCollection.add(lexicon);
  }

  /**
   * Registers multiple lexicons at once.
   *
   * @param lexicons - Array of lexicon documents to register
   *
   * @example
   * ```typescript
   * import { HYPERCERT_LEXICONS } from "@hypercerts-org/sdk/lexicons";
   *
   * registry.registerMany(HYPERCERT_LEXICONS);
   * ```
   */
  registerMany(lexicons: LexiconDoc[]): void {
    for (const lexicon of lexicons) {
      this.register(lexicon);
    }
  }

  /**
   * Gets a lexicon document by ID.
   *
   * @param id - The lexicon NSID (e.g., "org.hypercerts.hypercert")
   * @returns The lexicon document, or `undefined` if not registered
   *
   * @example
   * ```typescript
   * const lexicon = registry.get("org.hypercerts.hypercert");
   * if (lexicon) {
   *   console.log(`Found lexicon: ${lexicon.id}`);
   * }
   * ```
   */
  get(id: string): LexiconDoc | undefined {
    return this.lexicons.get(id);
  }

  /**
   * Validates a record against a collection's lexicon schema.
   *
   * @param collection - The collection NSID (same as lexicon ID)
   * @param record - The record data to validate
   * @returns Validation result with `valid` boolean and optional `error` message
   *
   * @remarks
   * - If no lexicon is registered for the collection, validation passes
   *   (we can't validate against unknown schemas)
   * - Validation checks required fields and type constraints defined
   *   in the lexicon schema
   *
   * @example
   * ```typescript
   * const result = registry.validate("org.hypercerts.hypercert", {
   *   title: "My Hypercert",
   *   description: "Description...",
   *   // ... other fields
   * });
   *
   * if (!result.valid) {
   *   throw new Error(`Invalid record: ${result.error}`);
   * }
   * ```
   */
  validate(collection: string, record: unknown): ValidationResult {
    // Check if we have a lexicon registered for this collection
    // Collection format is typically "namespace.collection" (e.g., "app.bsky.feed.post")
    // Lexicon ID format is the same
    const lexiconId = collection;
    const lexicon = this.lexicons.get(lexiconId);
    if (!lexicon) {
      // No lexicon registered - validation passes (can't validate unknown schemas)
      return { valid: true };
    }

    // Check required fields if the lexicon defines them
    const recordDef = lexicon.defs?.record;
    if (recordDef && typeof recordDef === "object" && "record" in recordDef) {
      const recordSchema = recordDef.record;
      if (typeof recordSchema === "object" && "required" in recordSchema && Array.isArray(recordSchema.required)) {
        const recordObj = record as Record<string, unknown>;
        for (const requiredField of recordSchema.required) {
          if (typeof requiredField === "string" && !(requiredField in recordObj)) {
            return {
              valid: false,
              error: `Missing required field: ${requiredField}`,
            };
          }
        }
      }
    }

    try {
      this.lexiconsCollection.assertValidRecord(collection, record);
      return { valid: true };
    } catch (error) {
      // If error indicates lexicon not found, treat as validation pass
      // (the lexicon might exist in Agent's collection but not ours)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found") || errorMessage.includes("Lexicon not found")) {
        return { valid: true };
      }
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Adds all registered lexicons to an AT Protocol Agent instance.
   *
   * This allows the Agent to understand custom lexicon types when making
   * API requests.
   *
   * @param agent - The Agent instance to extend
   *
   * @remarks
   * This is called automatically when creating a Repository. You typically
   * don't need to call this directly unless you're using the Agent
   * independently.
   *
   * @internal
   */
  addToAgent(agent: Agent): void {
    // Access the internal lexicons collection and merge our lexicons
    // The Agent's lex property is a Lexicons instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentLex = (agent as any).lex as Lexicons;

    // Add each registered lexicon to the agent
    for (const lexicon of this.lexicons.values()) {
      agentLex.add(lexicon);
    }
  }

  /**
   * Gets all registered lexicon IDs.
   *
   * @returns Array of lexicon NSIDs
   *
   * @example
   * ```typescript
   * const ids = registry.getRegisteredIds();
   * console.log(`Registered lexicons: ${ids.join(", ")}`);
   * ```
   */
  getRegisteredIds(): string[] {
    return Array.from(this.lexicons.keys());
  }

  /**
   * Checks if a lexicon is registered.
   *
   * @param id - The lexicon NSID to check
   * @returns `true` if the lexicon is registered
   *
   * @example
   * ```typescript
   * if (registry.has("org.hypercerts.hypercert")) {
   *   // Hypercert lexicon is available
   * }
   * ```
   */
  has(id: string): boolean {
    return this.lexicons.has(id);
  }
}
