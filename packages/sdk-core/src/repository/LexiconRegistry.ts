import type { Agent } from "@atproto/api";
import type { LexiconDoc } from "@atproto/lexicon";
import { Lexicons } from "@atproto/lexicon";
import { ValidationError } from "../core/errors.js";

/**
 * Validation result for lexicon validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Lexicon registry for managing and validating ATProto lexicons
 */
export class LexiconRegistry {
  private lexicons = new Map<string, LexiconDoc>();
  private lexiconsCollection: Lexicons;

  constructor() {
    this.lexiconsCollection = new Lexicons();
  }

  /**
   * Register a single lexicon
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
   * Register multiple lexicons at once
   */
  registerMany(lexicons: LexiconDoc[]): void {
    for (const lexicon of lexicons) {
      this.register(lexicon);
    }
  }

  /**
   * Get a lexicon by ID
   */
  get(id: string): LexiconDoc | undefined {
    return this.lexicons.get(id);
  }

  /**
   * Validate a record against a collection's lexicon
   * Only validates if a lexicon is registered for the collection.
   * If no lexicon is registered, validation passes (we can't validate against unknown schemas).
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
   * Add all registered lexicons to an Agent instance
   * This allows the Agent to understand custom lexicon types
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
   * Get all registered lexicon IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.lexicons.keys());
  }

  /**
   * Check if a lexicon is registered
   */
  has(id: string): boolean {
    return this.lexicons.has(id);
  }
}
