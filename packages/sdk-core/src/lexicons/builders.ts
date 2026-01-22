/**
 * Lexicon Builder Utilities
 *
 * This module provides utilities for constructing lexicon JSON schemas programmatically.
 * These builders help developers create valid AT Protocol lexicons with proper structure
 * and type-safe field definitions.
 *
 * @packageDocumentation
 */

/**
 * Lexicon field type definitions.
 */
export type LexiconFieldType =
  | "string"
  | "integer"
  | "boolean"
  | "number"
  | "datetime"
  | "blob"
  | "ref"
  | "array"
  | "object"
  | "unknown";

/**
 * Base lexicon field definition.
 */
export interface LexiconFieldBase {
  type: LexiconFieldType;
  description?: string;
}

/**
 * String field definition.
 */
export interface LexiconStringField extends LexiconFieldBase {
  type: "string";
  format?: "datetime" | "uri" | "at-uri" | "did" | "handle" | "at-identifier" | "nsid" | "cid";
  minLength?: number;
  maxLength?: number;
  minGraphemes?: number;
  maxGraphemes?: number;
  enum?: string[];
  const?: string;
  default?: string;
}

/**
 * Integer field definition.
 */
export interface LexiconIntegerField extends LexiconFieldBase {
  type: "integer";
  minimum?: number;
  maximum?: number;
  enum?: number[];
  const?: number;
  default?: number;
}

/**
 * Number field definition.
 */
export interface LexiconNumberField extends LexiconFieldBase {
  type: "number";
  minimum?: number;
  maximum?: number;
  enum?: number[];
  const?: number;
  default?: number;
}

/**
 * Boolean field definition.
 */
export interface LexiconBooleanField extends LexiconFieldBase {
  type: "boolean";
  const?: boolean;
  default?: boolean;
}

/**
 * Reference field definition (for strongRefs).
 */
export interface LexiconRefField extends LexiconFieldBase {
  type: "ref";
  ref: string; // NSID or "com.atproto.repo.strongRef"
}

/**
 * Array field definition.
 */
export interface LexiconArrayField extends LexiconFieldBase {
  type: "array";
  items: LexiconField;
  minLength?: number;
  maxLength?: number;
}

/**
 * Object field definition.
 */
export interface LexiconObjectField extends LexiconFieldBase {
  type: "object";
  properties?: Record<string, LexiconField>;
  required?: string[];
}

/**
 * Blob field definition.
 */
export interface LexiconBlobField extends LexiconFieldBase {
  type: "blob";
  accept?: string[]; // MIME types
  maxSize?: number;
}

/**
 * Unknown field definition (accepts any type).
 */
export interface LexiconUnknownField extends LexiconFieldBase {
  type: "unknown";
}

/**
 * Union of all lexicon field types.
 */
export type LexiconField =
  | LexiconStringField
  | LexiconIntegerField
  | LexiconNumberField
  | LexiconBooleanField
  | LexiconRefField
  | LexiconArrayField
  | LexiconObjectField
  | LexiconBlobField
  | LexiconUnknownField;

/**
 * Record definition for a lexicon.
 */
export interface LexiconRecordDef {
  type: "record";
  key?: "tid" | "literal:{string}" | "any";
  record: {
    type: "object";
    required: string[];
    properties: Record<string, LexiconField>;
  };
}

/**
 * Main lexicon document structure.
 */
export interface LexiconDoc {
  lexicon: 1;
  id: string; // NSID
  defs: {
    main: LexiconRecordDef;
    [key: string]: unknown;
  };
}

/**
 * Create a string field definition.
 *
 * @param options - String field options
 * @returns A lexicon string field definition
 *
 * @example
 * ```typescript
 * const titleField = createStringField({
 *   description: "Title of the item",
 *   minLength: 1,
 *   maxLength: 200,
 * });
 * ```
 */
export function createStringField(options: Omit<LexiconStringField, "type"> = {}): LexiconStringField {
  return { type: "string", ...options };
}

/**
 * Create an integer field definition.
 *
 * @param options - Integer field options
 * @returns A lexicon integer field definition
 *
 * @example
 * ```typescript
 * const scoreField = createIntegerField({
 *   description: "Score from 0 to 100",
 *   minimum: 0,
 *   maximum: 100,
 * });
 * ```
 */
export function createIntegerField(options: Omit<LexiconIntegerField, "type"> = {}): LexiconIntegerField {
  return { type: "integer", ...options };
}

/**
 * Create a number field definition.
 *
 * @param options - Number field options
 * @returns A lexicon number field definition
 *
 * @example
 * ```typescript
 * const weightField = createNumberField({
 *   description: "Weight as decimal",
 *   minimum: 0,
 *   maximum: 1,
 * });
 * ```
 */
export function createNumberField(options: Omit<LexiconNumberField, "type"> = {}): LexiconNumberField {
  return { type: "number", ...options };
}

/**
 * Create a boolean field definition.
 *
 * @param options - Boolean field options
 * @returns A lexicon boolean field definition
 *
 * @example
 * ```typescript
 * const verifiedField = createBooleanField({
 *   description: "Whether the item is verified",
 *   default: false,
 * });
 * ```
 */
export function createBooleanField(options: Omit<LexiconBooleanField, "type"> = {}): LexiconBooleanField {
  return { type: "boolean", ...options };
}

/**
 * Create a strongRef field definition.
 *
 * StrongRefs are the standard way to reference other records in AT Protocol.
 * They contain both the AT-URI and CID of the referenced record.
 *
 * @param options - Reference field options
 * @returns A lexicon reference field definition
 *
 * @example
 * ```typescript
 * const subjectField = createStrongRefField({
 *   description: "The hypercert being evaluated",
 * });
 * ```
 */
export function createStrongRefField(
  options: Omit<LexiconRefField, "type" | "ref"> & { ref?: string } = {},
): LexiconRefField {
  return {
    type: "ref",
    ref: options.ref || "com.atproto.repo.strongRef",
    description: options.description,
  };
}

/**
 * Create an array field definition.
 *
 * @param itemType - The type of items in the array
 * @param options - Array field options
 * @returns A lexicon array field definition
 *
 * @example
 * ```typescript
 * const tagsField = createArrayField(
 *   createStringField({ maxLength: 50 }),
 *   {
 *     description: "List of tags",
 *     minLength: 1,
 *     maxLength: 10,
 *   }
 * );
 * ```
 */
export function createArrayField(
  itemType: LexiconField,
  options: Omit<LexiconArrayField, "type" | "items"> = {},
): LexiconArrayField {
  return {
    type: "array",
    items: itemType,
    ...options,
  };
}

/**
 * Create an object field definition.
 *
 * @param options - Object field options
 * @returns A lexicon object field definition
 *
 * @example
 * ```typescript
 * const metadataField = createObjectField({
 *   description: "Additional metadata",
 *   properties: {
 *     author: createStringField(),
 *     version: createIntegerField(),
 *   },
 *   required: ["author"],
 * });
 * ```
 */
export function createObjectField(options: Omit<LexiconObjectField, "type"> = {}): LexiconObjectField {
  return { type: "object", ...options };
}

/**
 * Create a blob field definition.
 *
 * @param options - Blob field options
 * @returns A lexicon blob field definition
 *
 * @example
 * ```typescript
 * const imageField = createBlobField({
 *   description: "Profile image",
 *   accept: ["image/png", "image/jpeg"],
 *   maxSize: 1000000, // 1MB
 * });
 * ```
 */
export function createBlobField(options: Omit<LexiconBlobField, "type"> = {}): LexiconBlobField {
  return { type: "blob", ...options };
}

/**
 * Create a datetime string field.
 *
 * This is a convenience function for creating string fields with datetime format.
 *
 * @param options - String field options
 * @returns A lexicon string field with datetime format
 *
 * @example
 * ```typescript
 * const createdAtField = createDatetimeField({
 *   description: "When the record was created",
 * });
 * ```
 */
export function createDatetimeField(options: Omit<LexiconStringField, "type" | "format"> = {}): LexiconStringField {
  return {
    type: "string",
    format: "datetime",
    ...options,
  };
}

/**
 * Create a record definition.
 *
 * This defines the structure of records in your lexicon.
 *
 * @param properties - The record's properties (fields)
 * @param required - Array of required field names
 * @param keyType - The type of record key ("tid" for server-generated, "any" for custom)
 * @returns A lexicon record definition
 *
 * @example
 * ```typescript
 * const recordDef = createRecordDef(
 *   {
 *     $type: createStringField({ const: "org.myapp.evaluation" }),
 *     subject: createStrongRefField({ description: "The evaluated item" }),
 *     score: createIntegerField({ minimum: 0, maximum: 100 }),
 *     createdAt: createDatetimeField(),
 *   },
 *   ["$type", "subject", "score", "createdAt"],
 *   "tid"
 * );
 * ```
 */
export function createRecordDef(
  properties: Record<string, LexiconField>,
  required: string[],
  keyType: "tid" | "any" = "tid",
): LexiconRecordDef {
  return {
    type: "record",
    key: keyType,
    record: {
      type: "object",
      required,
      properties,
    },
  };
}

/**
 * Create a complete lexicon document.
 *
 * This creates a full lexicon JSON structure that can be registered with the SDK.
 *
 * @param nsid - The NSID (Namespaced Identifier) for this lexicon
 * @param properties - The record's properties (fields)
 * @param required - Array of required field names
 * @param keyType - The type of record key ("tid" for server-generated, "any" for custom)
 * @returns A complete lexicon document
 *
 * @example
 * ```typescript
 * const lexicon = createLexiconDoc(
 *   "org.myapp.evaluation",
 *   {
 *     $type: createStringField({ const: "org.myapp.evaluation" }),
 *     subject: createStrongRefField({ description: "The evaluated item" }),
 *     score: createIntegerField({ minimum: 0, maximum: 100 }),
 *     methodology: createStringField({ maxLength: 500 }),
 *     createdAt: createDatetimeField(),
 *   },
 *   ["$type", "subject", "score", "createdAt"],
 *   "tid"
 * );
 *
 * // Register with SDK
 * sdk.getLexiconRegistry().registerFromJSON(lexicon);
 * ```
 */
export function createLexiconDoc(
  nsid: string,
  properties: Record<string, LexiconField>,
  required: string[],
  keyType: "tid" | "any" = "tid",
): LexiconDoc {
  return {
    lexicon: 1,
    id: nsid,
    defs: {
      main: createRecordDef(properties, required, keyType),
    },
  };
}

/**
 * Validate a lexicon document structure.
 *
 * Performs basic validation to ensure the lexicon follows AT Protocol conventions.
 * This does NOT perform full JSON schema validation.
 *
 * @param lexicon - The lexicon document to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * const lexicon = createLexiconDoc(...);
 * if (validateLexiconStructure(lexicon)) {
 *   sdk.getLexiconRegistry().registerFromJSON(lexicon);
 * } else {
 *   console.error("Invalid lexicon structure");
 * }
 * ```
 */
export function validateLexiconStructure(lexicon: unknown): lexicon is LexiconDoc {
  if (!lexicon || typeof lexicon !== "object") {
    return false;
  }

  const doc = lexicon as Record<string, unknown>;

  // Check required top-level fields
  if (doc.lexicon !== 1) return false;
  if (typeof doc.id !== "string" || !doc.id) return false;
  if (!doc.defs || typeof doc.defs !== "object") return false;

  const defs = doc.defs as Record<string, unknown>;
  if (!defs.main || typeof defs.main !== "object") return false;

  const main = defs.main as Record<string, unknown>;
  if (main.type !== "record") return false;
  if (!main.record || typeof main.record !== "object") return false;

  const record = main.record as Record<string, unknown>;
  if (record.type !== "object") return false;
  if (!Array.isArray(record.required)) return false;
  if (!record.properties || typeof record.properties !== "object") return false;

  return true;
}
