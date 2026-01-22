/**
 * LexiconRegistry - Manages custom lexicon registration and validation.
 *
 * This module provides a registry for AT Protocol lexicon schemas,
 * allowing developers to register custom lexicons and validate records
 * against registered schemas.
 *
 * @packageDocumentation
 */

import type { LexiconDoc } from "@atproto/lexicon";
import { Lexicons } from "@atproto/lexicon";
import type { Agent } from "@atproto/api";

/**
 * Validation result from lexicon validation.
 */
export interface ValidationResult {
  /**
   * Whether the record is valid according to the lexicon.
   */
  valid: boolean;

  /**
   * Error message if validation failed.
   */
  error?: string;
}

/**
 * Registry for managing AT Protocol lexicon schemas.
 *
 * The LexiconRegistry allows developers to:
 * - Register custom lexicon definitions
 * - Validate records against registered schemas
 * - Query registered lexicons
 * - Add lexicons to AT Protocol agents
 *
 * @example Basic usage
 * ```typescript
 * const registry = new LexiconRegistry();
 *
 * // Register a custom lexicon
 * registry.register({
 *   lexicon: 1,
 *   id: "org.myapp.customRecord",
 *   defs: {
 *     main: {
 *       type: "record",
 *       key: "tid",
 *       record: {
 *         type: "object",
 *         required: ["$type", "title"],
 *         properties: {
 *           "$type": { type: "string", const: "org.myapp.customRecord" },
 *           title: { type: "string" }
 *         }
 *       }
 *     }
 *   }
 * });
 *
 * // Validate a record
 * const result = registry.validate("org.myapp.customRecord", {
 *   $type: "org.myapp.customRecord",
 *   title: "My Record"
 * });
 *
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export class LexiconRegistry {
  private lexicons: Lexicons;
  private registeredIds: Set<string>;

  /**
   * Creates a new LexiconRegistry instance.
   *
   * @param initialLexicons - Optional array of lexicons to register on initialization
   */
  constructor(initialLexicons?: LexiconDoc[]) {
    this.lexicons = new Lexicons();
    this.registeredIds = new Set();

    if (initialLexicons && initialLexicons.length > 0) {
      this.registerMany(initialLexicons);
    }
  }

  /**
   * Registers a single lexicon definition.
   *
   * @param lexicon - The lexicon document to register
   * @throws {Error} If the lexicon is invalid or already registered
   *
   * @example
   * ```typescript
   * registry.register({
   *   lexicon: 1,
   *   id: "org.myapp.customRecord",
   *   defs: { ... }
   * });
   * ```
   */
  register(lexicon: LexiconDoc): void {
    if (!lexicon.id) {
      throw new Error("Lexicon must have an id");
    }

    if (this.registeredIds.has(lexicon.id)) {
      throw new Error(`Lexicon ${lexicon.id} is already registered`);
    }

    try {
      this.lexicons.add(lexicon);
      this.registeredIds.add(lexicon.id);
    } catch (error) {
      throw new Error(
        `Failed to register lexicon ${lexicon.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Registers multiple lexicon definitions at once.
   *
   * @param lexicons - Array of lexicon documents to register
   * @throws {Error} If any lexicon is invalid or already registered
   *
   * @example
   * ```typescript
   * registry.registerMany([lexicon1, lexicon2, lexicon3]);
   * ```
   */
  registerMany(lexicons: LexiconDoc[]): void {
    for (const lexicon of lexicons) {
      this.register(lexicon);
    }
  }

  /**
   * Registers a lexicon from a JSON object.
   *
   * This is a convenience method for registering lexicons loaded from JSON files.
   *
   * @param lexiconJson - The lexicon as a plain JavaScript object
   * @throws {Error} If the lexicon is invalid or already registered
   *
   * @example
   * ```typescript
   * import customLexicon from "./custom-lexicon.json";
   * registry.registerFromJSON(customLexicon);
   * ```
   */
  registerFromJSON(lexiconJson: unknown): void {
    this.register(lexiconJson as LexiconDoc);
  }

  /**
   * Unregisters a lexicon by its NSID.
   *
   * @param nsid - The NSID of the lexicon to unregister
   * @returns True if the lexicon was unregistered, false if it wasn't registered
   *
   * @example
   * ```typescript
   * registry.unregister("org.myapp.customRecord");
   * ```
   */
  unregister(nsid: string): boolean {
    if (!this.registeredIds.has(nsid)) {
      return false;
    }

    this.registeredIds.delete(nsid);
    // Note: Lexicons class doesn't have a remove method,
    // so we can't actually remove from the internal store.
    // We track removal in our Set for isRegistered checks.
    return true;
  }

  /**
   * Checks if a lexicon is registered.
   *
   * @param nsid - The NSID to check
   * @returns True if the lexicon is registered
   *
   * @example
   * ```typescript
   * if (registry.isRegistered("org.myapp.customRecord")) {
   *   // Lexicon is available
   * }
   * ```
   */
  isRegistered(nsid: string): boolean {
    return this.registeredIds.has(nsid);
  }

  /**
   * Gets a lexicon definition by its NSID.
   *
   * @param nsid - The NSID of the lexicon to retrieve
   * @returns The lexicon document, or undefined if not found
   *
   * @example
   * ```typescript
   * const lexicon = registry.get("org.myapp.customRecord");
   * if (lexicon) {
   *   console.log(lexicon.defs);
   * }
   * ```
   */
  get(nsid: string): LexiconDoc | undefined {
    if (!this.isRegistered(nsid)) {
      return undefined;
    }

    return this.lexicons.get(nsid);
  }

  /**
   * Gets all registered lexicon NSIDs.
   *
   * @returns Array of registered NSIDs
   *
   * @example
   * ```typescript
   * const registered = registry.getAll();
   * console.log(`Registered lexicons: ${registered.join(", ")}`);
   * ```
   */
  getAll(): string[] {
    return Array.from(this.registeredIds);
  }

  /**
   * Validates a record against a registered lexicon.
   *
   * @param nsid - The collection NSID to validate against
   * @param record - The record data to validate
   * @returns Validation result with success status and optional error message
   *
   * @example
   * ```typescript
   * const result = registry.validate("org.myapp.customRecord", {
   *   $type: "org.myapp.customRecord",
   *   title: "My Record"
   * });
   *
   * if (!result.valid) {
   *   console.error(`Validation failed: ${result.error}`);
   * }
   * ```
   */
  validate(nsid: string, record: unknown): ValidationResult {
    if (!this.isRegistered(nsid)) {
      return {
        valid: false,
        error: `Lexicon ${nsid} is not registered`,
      };
    }

    try {
      this.lexicons.assertValidRecord(nsid, record);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Validation failed",
      };
    }
  }

  /**
   * Adds all registered lexicons to an AT Protocol Agent.
   *
   * This method is currently a no-op as the AT Protocol Agent
   * doesn't provide a public API for adding lexicons at runtime.
   * Lexicons must be registered with the server.
   *
   * This method is kept for future compatibility if the API
   * adds support for client-side lexicon registration.
   *
   * @param _agent - The AT Protocol Agent (currently unused)
   *
   * @example
   * ```typescript
   * const agent = new Agent(session);
   * registry.addToAgent(agent);
   * // Reserved for future use
   * ```
   */
  addToAgent(_agent: Agent): void {
    // No-op: AT Protocol Agent doesn't support client-side lexicon addition
    // Lexicons are validated client-side via this registry,
    // but server-side validation is performed by the PDS/SDS
  }

  /**
   * Gets the underlying Lexicons instance.
   *
   * This provides direct access to the AT Protocol Lexicons object
   * for advanced use cases.
   *
   * @returns The internal Lexicons instance
   *
   * @example
   * ```typescript
   * const lexicons = registry.getLexicons();
   * // Use lexicons directly for advanced operations
   * ```
   */
  getLexicons(): Lexicons {
    return this.lexicons;
  }
}
