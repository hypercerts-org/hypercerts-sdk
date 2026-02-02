/**
 * Lexicon Development Utilities - AT-URI and StrongRef Helpers
 *
 * This module provides utilities for working with AT Protocol URIs and strongRefs
 * when building custom lexicons. These tools help developers create type-safe
 * references between records.
 *
 * @packageDocumentation
 */

import type { StrongRef } from "../services/hypercerts/types.js";
import type { CreateResult, UpdateResult } from "../repository/types.js";

/**
 * Regular expression for parsing AT-URIs.
 *
 * AT-URIs follow the format: `at://{did}/{collection}/{rkey}`
 *
 * Capture groups:
 * - [1] did - The DID of the repository owner (e.g., "did:plc:abc123")
 * - [2] collection - The NSID of the record type (e.g., "org.hypercerts.claim.activity")
 * - [3] rkey - The record key (e.g., "3km2vj4kfqp2a")
 *
 * @example Direct regex usage
 * ```typescript
 * const match = AT_URI_REGEX.exec("at://did:plc:abc/org.hypercerts.claim.activity/xyz");
 * if (match) {
 *   const [, did, collection, rkey] = match;
 * }
 * ```
 *
 * @example Validation
 * ```typescript
 * if (AT_URI_REGEX.test(userInput)) {
 *   // Valid AT-URI format
 * }
 * ```
 *
 * @remarks
 * For most use cases, prefer using {@link parseAtUri} which provides
 * better error messages and returns a typed object.
 */
export const AT_URI_REGEX = /^at:\/\/([^/]+)\/([^/]+)\/(.+)$/;

/**
 * Components of an AT-URI (AT Protocol Uniform Resource Identifier).
 *
 * AT-URIs follow the format: `at://{did}/{collection}/{rkey}`
 * where:
 * - `did`: The DID of the repository owner (e.g., "did:plc:abc123")
 * - `collection`: The NSID of the record type (e.g., "org.hypercerts.claim.activity")
 * - `rkey`: The record key, either a TID or custom key (e.g., "3km2vj4kfqp2a")
 */
export interface AtUriComponents {
  /** Repository owner's DID */
  did: string;
  /** Collection NSID (lexicon identifier) */
  collection: string;
  /** Record key (TID or custom string) */
  rkey: string;
}

/**
 * Parse an AT-URI into its component parts.
 *
 * Extracts the DID, collection NSID, and record key from an AT-URI string.
 * AT-URIs follow the format: `at://{did}/{collection}/{rkey}`
 *
 * @param uri - The AT-URI to parse
 * @returns The components of the URI
 * @throws {Error} If the URI format is invalid
 *
 * @example
 * ```typescript
 * const components = parseAtUri("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a");
 * console.log(components);
 * // {
 * //   did: "did:plc:abc123",
 * //   collection: "org.hypercerts.claim.activity",
 * //   rkey: "3km2vj4kfqp2a"
 * // }
 * ```
 */
export function parseAtUri(uri: string): AtUriComponents {
  if (!uri.startsWith("at://")) {
    throw new Error(`Invalid AT-URI format: must start with "at://", got "${uri}"`);
  }

  const withoutProtocol = uri.slice(5); // Remove "at://"
  const parts = withoutProtocol.split("/");

  if (parts.length !== 3) {
    throw new Error(`Invalid AT-URI format: expected "at://{did}/{collection}/{rkey}", got "${uri}"`);
  }

  const [did, collection, rkey] = parts;

  if (!did || !collection || !rkey) {
    throw new Error(`Invalid AT-URI format: all components must be non-empty, got "${uri}"`);
  }

  return { did, collection, rkey };
}

/**
 * Build an AT-URI from its component parts.
 *
 * Constructs a valid AT-URI string from a DID, collection NSID, and record key.
 * The resulting URI follows the format: `at://{did}/{collection}/{rkey}`
 *
 * @param did - The repository owner's DID
 * @param collection - The collection NSID (lexicon identifier)
 * @param rkey - The record key (TID or custom string)
 * @returns The complete AT-URI
 *
 * @example
 * ```typescript
 * const uri = buildAtUri(
 *   "did:plc:abc123",
 *   "org.hypercerts.claim.activity",
 *   "3km2vj4kfqp2a"
 * );
 * console.log(uri); // "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a"
 * ```
 */
export function buildAtUri(did: string, collection: string, rkey: string): string {
  if (!did || !collection || !rkey) {
    throw new Error("All AT-URI components (did, collection, rkey) must be non-empty");
  }

  return `at://${did}/${collection}/${rkey}`;
}

/**
 * Extract the record key (TID or custom key) from an AT-URI.
 *
 * Returns the last component of the AT-URI, which is the record key.
 * This is equivalent to `parseAtUri(uri).rkey` but more efficient.
 *
 * @param uri - The AT-URI to extract from
 * @returns The record key (TID or custom string)
 * @throws {Error} If the URI format is invalid
 *
 * @example
 * ```typescript
 * const rkey = extractRkeyFromUri("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a");
 * console.log(rkey); // "3km2vj4kfqp2a"
 * ```
 */
export function extractRkeyFromUri(uri: string): string {
  const { rkey } = parseAtUri(uri);
  return rkey;
}

/**
 * Check if a string is a valid AT-URI format.
 *
 * Validates that the string follows the AT-URI format without throwing errors.
 * This is useful for input validation before parsing.
 *
 * @param uri - The string to validate
 * @returns True if the string is a valid AT-URI, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidAtUri(userInput)) {
 *   const components = parseAtUri(userInput);
 *   // ... use components
 * } else {
 *   console.error("Invalid AT-URI");
 * }
 * ```
 */
export function isValidAtUri(uri: string): boolean {
  try {
    parseAtUri(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a strongRef from a URI and CID.
 *
 * StrongRefs are the canonical way to reference specific versions of records
 * in AT Protocol. They combine an AT-URI (which identifies the record) with
 * a CID (which identifies the specific version).
 *
 * @param uri - The AT-URI of the record
 * @param cid - The CID (Content Identifier) of the record version
 * @returns A strongRef object
 *
 * @example
 * ```typescript
 * const ref = createStrongRef(
 *   "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
 *   "bafyreiabc123..."
 * );
 * console.log(ref);
 * // {
 * //   uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
 * //   cid: "bafyreiabc123..."
 * // }
 * ```
 */
export function createStrongRef(uri: string, cid: string): StrongRef {
  if (!uri || !cid) {
    throw new Error("Both uri and cid are required to create a strongRef");
  }

  return { uri, cid };
}

/**
 * Create a strongRef from a CreateResult or UpdateResult.
 *
 * This is a convenience function that extracts the URI and CID from
 * the result of a record creation or update operation.
 *
 * @param result - The result from creating or updating a record
 * @returns A strongRef object
 *
 * @example
 * ```typescript
 * const hypercert = await repo.hypercerts.create({
 *   title: "Climate Research",
 *   // ... other params
 * });
 *
 * const ref = createStrongRefFromResult(hypercert);
 * // Now use ref in another record to reference this hypercert
 * ```
 */
export function createStrongRefFromResult(result: CreateResult | UpdateResult): StrongRef {
  return createStrongRef(result.uri, result.cid);
}

/**
 * Validate that an object is a valid strongRef.
 *
 * Checks that the object has the required `uri` and `cid` properties
 * and that they are non-empty strings.
 *
 * @param ref - The object to validate
 * @returns True if the object is a valid strongRef, false otherwise
 *
 * @example
 * ```typescript
 * const maybeRef = { uri: "at://...", cid: "bafyrei..." };
 * if (validateStrongRef(maybeRef)) {
 *   // Safe to use as strongRef
 *   record.subject = maybeRef;
 * }
 * ```
 */
export function validateStrongRef(ref: unknown): ref is StrongRef {
  if (!ref || typeof ref !== "object") {
    return false;
  }

  const obj = ref as Record<string, unknown>;
  return typeof obj.uri === "string" && obj.uri.length > 0 && typeof obj.cid === "string" && obj.cid.length > 0;
}

/**
 * Type guard to check if a value is a strongRef.
 *
 * This is an alias for `validateStrongRef` that provides better semantics
 * for type narrowing in TypeScript.
 *
 * @param value - The value to check
 * @returns True if the value is a strongRef, false otherwise
 *
 * @example
 * ```typescript
 * function processReference(ref: unknown) {
 *   if (isStrongRef(ref)) {
 *     // TypeScript knows ref is StrongRef here
 *     console.log(ref.uri);
 *   }
 * }
 * ```
 */
export function isStrongRef(value: unknown): value is StrongRef {
  return validateStrongRef(value);
}
