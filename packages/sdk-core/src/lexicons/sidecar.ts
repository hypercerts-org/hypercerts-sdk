/**
 * Sidecar Pattern Utilities
 *
 * This module provides utilities for implementing the AT Protocol "sidecar pattern"
 * where additional records are created that reference a main record via StrongRef.
 *
 * ## The Sidecar Pattern
 *
 * In AT Protocol, the sidecar pattern uses **unidirectional references**:
 * - Sidecar records contain a StrongRef (uri + cid) pointing to the main record
 * - Main records do NOT maintain back-references to sidecars
 * - Sidecars are discovered by querying records that reference the main record
 * - Optionally, sidecars can use the same rkey as the main record (in different collections)
 *
 * ## Example Use Cases
 *
 * - Evaluations that reference hypercerts
 * - Comments that reference posts
 * - Metadata records that reference primary entities
 *
 * @see https://atproto.com/specs/record-key
 * @see https://atproto.com/specs/data-model
 *
 * @packageDocumentation
 */

import type { Repository } from "../repository/Repository.js";
import type { CreateResult } from "../repository/types.js";

/**
 * Parameters for creating a sidecar record.
 */
export interface SidecarRecordParams {
  /** The collection NSID for the sidecar record */
  collection: string;
  /** The record data */
  record: Record<string, unknown>;
  /** Optional custom rkey */
  rkey?: string;
  /** Skip validation if true */
  skipValidation?: boolean;
}

/**
 * Result from creating a sidecar record.
 */
export interface SidecarResult {
  /** The main record that was referenced */
  mainRecord: CreateResult;
  /** The sidecar record that was created */
  sidecarRecord: CreateResult;
}

/**
 * Parameters for attaching a sidecar to an existing record.
 */
export interface AttachSidecarParams {
  /** The main record to reference */
  mainRecord: { uri: string; cid: string };
  /** The sidecar record to create */
  sidecar: SidecarRecordParams;
}

/**
 * Result from creating multiple sidecars.
 */
export interface MultiSidecarResult {
  /** The main record that was created */
  main: CreateResult;
  /** The sidecar records that were created */
  sidecars: CreateResult[];
}

/**
 * Parameters for creating a main record with multiple sidecars.
 */
export interface CreateWithSidecarsParams {
  /** The main record to create */
  main: SidecarRecordParams;
  /** The sidecar records to create (can reference the main record via placeholder) */
  sidecars: SidecarRecordParams[];
}

/**
 * Create a sidecar record that references an existing record.
 *
 * This is a low-level utility that creates a single sidecar record. The sidecar
 * record should include a strongRef field that points to the main record.
 *
 * @param repo - The repository instance
 * @param collection - The collection NSID for the sidecar
 * @param record - The sidecar record data (should include a strongRef to the main record)
 * @param options - Optional creation options
 * @returns The created sidecar record
 *
 * @example
 * ```typescript
 * const hypercert = await repo.hypercerts.create({...});
 *
 * const evaluation = await createSidecarRecord(
 *   repo,
 *   "org.myapp.evaluation",
 *   {
 *     $type: "org.myapp.evaluation",
 *     subject: { uri: hypercert.hypercertUri, cid: hypercert.hypercertCid },
 *     score: 85,
 *     createdAt: new Date().toISOString(),
 *   }
 * );
 * ```
 */
export async function createSidecarRecord(
  repo: Repository,
  collection: string,
  record: Record<string, unknown>,
  options: { rkey?: string; skipValidation?: boolean } = {},
): Promise<CreateResult> {
  return await repo.records.create({
    collection,
    record,
    rkey: options.rkey,
    skipValidation: options.skipValidation,
  });
}

/**
 * Attach a sidecar record to an existing main record.
 *
 * This creates a new record that references an existing record via strongRef.
 * It's a higher-level convenience function that wraps `createSidecarRecord`.
 *
 * @param repo - The repository instance
 * @param params - Parameters including the main record reference and sidecar definition
 * @returns Both the main record reference and the created sidecar
 *
 * @example
 * ```typescript
 * const hypercert = await repo.hypercerts.create({...});
 *
 * const result = await attachSidecar(repo, {
 *   mainRecord: {
 *     uri: hypercert.hypercertUri,
 *     cid: hypercert.hypercertCid,
 *   },
 *   sidecar: {
 *     collection: "org.myapp.evaluation",
 *     record: {
 *       $type: "org.myapp.evaluation",
 *       subject: { uri: hypercert.hypercertUri, cid: hypercert.hypercertCid },
 *       score: 85,
 *       createdAt: new Date().toISOString(),
 *     },
 *   },
 * });
 * ```
 */
export async function attachSidecar(repo: Repository, params: AttachSidecarParams): Promise<SidecarResult> {
  const sidecarRecord = await createSidecarRecord(repo, params.sidecar.collection, params.sidecar.record, {
    rkey: params.sidecar.rkey,
    skipValidation: params.sidecar.skipValidation,
  });

  return {
    mainRecord: params.mainRecord,
    sidecarRecord,
  };
}

/**
 * Create a main record and multiple sidecar records in sequence.
 *
 * This orchestrates the creation of a main record followed by one or more
 * sidecar records that reference it. This is useful for workflows like:
 * - Creating a project with multiple hypercert claims
 * - Creating a hypercert with evidence and evaluation records
 *
 * @param repo - The repository instance
 * @param params - Parameters including the main record and sidecar definitions
 * @returns The main record and all created sidecar records
 *
 * @example
 * ```typescript
 * const result = await createWithSidecars(repo, {
 *   main: {
 *     collection: "org.hypercerts.project",
 *     record: {
 *       $type: "org.hypercerts.project",
 *       title: "Climate Initiative 2024",
 *       description: "Our climate work",
 *       createdAt: new Date().toISOString(),
 *     },
 *   },
 *   sidecars: [
 *     {
 *       collection: "org.hypercerts.claim.activity",
 *       record: {
 *         $type: "org.hypercerts.claim.activity",
 *         title: "Tree Planting",
 *         // ... other hypercert fields
 *         // Note: If you need to reference the main record, you must wait
 *         // for result.main and then call batchCreateSidecars separately
 *       },
 *     },
 *     {
 *       collection: "org.hypercerts.claim.activity",
 *       record: {
 *         $type: "org.hypercerts.claim.activity",
 *         title: "Carbon Measurement",
 *         // ... other hypercert fields
 *       },
 *     },
 *   ],
 * });
 *
 * console.log(result.main.uri); // Main project record
 * console.log(result.sidecars.length); // 2 hypercert sidecars
 * ```
 */
export async function createWithSidecars(
  repo: Repository,
  params: CreateWithSidecarsParams,
): Promise<MultiSidecarResult> {
  // Create the main record first
  const main = await repo.records.create({
    collection: params.main.collection,
    record: params.main.record,
    rkey: params.main.rkey,
    skipValidation: params.main.skipValidation,
  });

  // Create all sidecar records
  const sidecars: CreateResult[] = [];
  for (const sidecar of params.sidecars) {
    const created = await repo.records.create({
      collection: sidecar.collection,
      record: sidecar.record,
      rkey: sidecar.rkey,
      skipValidation: sidecar.skipValidation,
    });

    sidecars.push(created);
  }

  return { main, sidecars };
}

/**
 * Batch create multiple sidecar records.
 *
 * This is useful when you want to add multiple related records
 * efficiently. The sidecar records should already contain any necessary
 * references to the main record in their data.
 *
 * @param repo - The repository instance
 * @param sidecars - Array of sidecar definitions (records should include references)
 * @returns Array of created sidecar records
 *
 * @example
 * ```typescript
 * const hypercert = await repo.hypercerts.create({...});
 * const mainRef = { uri: hypercert.hypercertUri, cid: hypercert.hypercertCid };
 *
 * const evaluations = await batchCreateSidecars(repo, [
 *   {
 *     collection: "org.myapp.evaluation",
 *     record: {
 *       $type: "org.myapp.evaluation",
 *       subject: mainRef,  // Reference already included
 *       score: 85,
 *       methodology: "Peer review",
 *       createdAt: new Date().toISOString(),
 *     },
 *   },
 *   {
 *     collection: "org.myapp.comment",
 *     record: {
 *       $type: "org.myapp.comment",
 *       subject: mainRef,  // Reference already included
 *       text: "Great work!",
 *       createdAt: new Date().toISOString(),
 *     },
 *   },
 * ]);
 * ```
 */
export async function batchCreateSidecars(repo: Repository, sidecars: SidecarRecordParams[]): Promise<CreateResult[]> {
  const results: CreateResult[] = [];

  for (const sidecar of sidecars) {
    const result = await createSidecarRecord(repo, sidecar.collection, sidecar.record, {
      rkey: sidecar.rkey,
      skipValidation: sidecar.skipValidation,
    });
    results.push(result);
  }

  return results;
}
