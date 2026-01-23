/**
 * BaseOperations - Abstract base class for custom lexicon operations.
 *
 * This module provides a foundation for building domain-specific operation
 * classes that work with custom lexicons. It handles validation, record
 * creation, and provides utilities for working with AT Protocol records.
 *
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { ValidationError, NetworkError } from "../errors.js";
import type { LexiconRegistry } from "./LexiconRegistry.js";
import type { CreateResult, UpdateResult } from "./types.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { StrongRef } from "../services/hypercerts/types.js";

/**
 * Abstract base class for creating custom lexicon operation classes.
 *
 * Extend this class to build domain-specific operations for your custom
 * lexicons. The base class provides:
 *
 * - Automatic validation against registered lexicon schemas
 * - Helper methods for creating and updating records
 * - Utilities for building strongRefs and AT-URIs
 * - Error handling and logging support
 *
 * @typeParam TParams - Type of parameters accepted by the create() method
 * @typeParam TResult - Type of result returned by the create() method
 *
 * @remarks
 * This class is designed to be extended by developers creating custom
 * operation classes for their own lexicons. It follows the same patterns
 * as the built-in hypercert operations.
 *
 * @example Basic usage
 * ```typescript
 * import { BaseOperations } from "@hypercerts-org/sdk-core";
 *
 * interface EvaluationParams {
 *   subjectUri: string;
 *   subjectCid: string;
 *   score: number;
 *   methodology?: string;
 * }
 *
 * interface EvaluationResult {
 *   uri: string;
 *   cid: string;
 *   record: MyEvaluation;
 * }
 *
 * class EvaluationOperations extends BaseOperations<EvaluationParams, EvaluationResult> {
 *   async create(params: EvaluationParams): Promise<EvaluationResult> {
 *     const record = {
 *       $type: "org.myapp.evaluation",
 *       subject: this.createStrongRef(params.subjectUri, params.subjectCid),
 *       score: params.score,
 *       methodology: params.methodology,
 *       createdAt: new Date().toISOString(),
 *     };
 *
 *     const { uri, cid } = await this.validateAndCreate("org.myapp.evaluation", record);
 *     return { uri, cid, record };
 *   }
 * }
 * ```
 *
 * @example With validation and error handling
 * ```typescript
 * class ProjectOperations extends BaseOperations<CreateProjectParams, ProjectResult> {
 *   async create(params: CreateProjectParams): Promise<ProjectResult> {
 *     // Validate input parameters
 *     if (!params.title || params.title.trim().length === 0) {
 *       throw new ValidationError("Project title cannot be empty");
 *     }
 *
 *     const record = {
 *       $type: "org.myapp.project",
 *       title: params.title,
 *       description: params.description,
 *       createdAt: new Date().toISOString(),
 *     };
 *
 *     try {
 *       const { uri, cid } = await this.validateAndCreate("org.myapp.project", record);
 *       this.logger?.info(`Created project: ${uri}`);
 *       return { uri, cid, record };
 *     } catch (error) {
 *       this.logger?.error(`Failed to create project: ${error}`);
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseOperations<TParams = unknown, TResult = unknown> {
  /**
   * Creates a new BaseOperations instance.
   *
   * @param agent - AT Protocol Agent for making API calls
   * @param repoDid - DID of the repository to operate on
   * @param lexiconRegistry - Registry for validating records against lexicon schemas
   * @param logger - Optional logger for debugging and monitoring
   *
   * @internal
   */
  constructor(
    protected agent: Agent,
    protected repoDid: string,
    protected lexiconRegistry: LexiconRegistry,
    protected logger?: LoggerInterface,
  ) {}

  /**
   * Validates a record against its lexicon schema and creates it in the repository.
   *
   * This method performs the following steps:
   * 1. Validates the record against the registered lexicon schema
   * 2. Throws ValidationError if validation fails
   * 3. Creates the record using the AT Protocol Agent
   * 4. Returns the created record's URI and CID
   *
   * @param collection - NSID of the collection (e.g., "org.myapp.customRecord")
   * @param record - Record data conforming to the collection's lexicon schema
   * @param rkey - Optional record key. If not provided, a TID is auto-generated
   * @returns Promise resolving to the created record's URI and CID
   * @throws {@link ValidationError} if the record doesn't conform to the lexicon schema
   * @throws {@link NetworkError} if the API request fails
   *
   * @example
   * ```typescript
   * const record = {
   *   $type: "org.myapp.evaluation",
   *   subject: { uri: "at://...", cid: "bafyrei..." },
   *   score: 85,
   *   createdAt: new Date().toISOString(),
   * };
   *
   * const { uri, cid } = await this.validateAndCreate("org.myapp.evaluation", record);
   * ```
   */
  protected async validateAndCreate(collection: string, record: unknown, rkey?: string): Promise<CreateResult> {
    // Validate record against registered lexicon
    if (this.lexiconRegistry.isRegistered(collection)) {
      const validation = this.lexiconRegistry.validate(collection, record);
      if (!validation.valid) {
        throw new ValidationError(`Invalid ${collection}: ${validation.error}`);
      }
    }

    try {
      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection,
        record: record as Record<string, unknown>,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create record");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to create ${collection}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Validates a record against its lexicon schema and updates it in the repository.
   *
   * This method performs the following steps:
   * 1. Validates the record against the registered lexicon schema
   * 2. Throws ValidationError if validation fails
   * 3. Updates the record using the AT Protocol Agent
   * 4. Returns the updated record's URI and new CID
   *
   * @param collection - NSID of the collection
   * @param rkey - Record key (the last segment of the AT-URI)
   * @param record - New record data (completely replaces existing record)
   * @returns Promise resolving to the updated record's URI and new CID
   * @throws {@link ValidationError} if the record doesn't conform to the lexicon schema
   * @throws {@link NetworkError} if the API request fails
   *
   * @remarks
   * This is a full replacement operation, not a partial update.
   *
   * @example
   * ```typescript
   * const updatedRecord = {
   *   $type: "org.myapp.evaluation",
   *   subject: { uri: "at://...", cid: "bafyrei..." },
   *   score: 90, // Updated score
   *   createdAt: existingRecord.createdAt,
   * };
   *
   * const { uri, cid } = await this.validateAndUpdate(
   *   "org.myapp.evaluation",
   *   "abc123",
   *   updatedRecord
   * );
   * ```
   */
  protected async validateAndUpdate(collection: string, rkey: string, record: unknown): Promise<UpdateResult> {
    // Validate record against registered lexicon
    if (this.lexiconRegistry.isRegistered(collection)) {
      const validation = this.lexiconRegistry.validate(collection, record);
      if (!validation.valid) {
        throw new ValidationError(`Invalid ${collection}: ${validation.error}`);
      }
    }

    try {
      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: record as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update record");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to update ${collection}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Creates a strongRef object from a URI and CID.
   *
   * StrongRefs are used in AT Protocol to reference specific versions
   * of records. They ensure that references point to an exact record
   * version, not just the latest version.
   *
   * @param uri - AT-URI of the record (e.g., "at://did:plc:abc/collection/rkey")
   * @param cid - Content Identifier (CID) of the record
   * @returns StrongRef object with uri and cid properties
   *
   * @example
   * ```typescript
   * const hypercertRef = this.createStrongRef(
   *   "at://did:plc:abc123/org.hypercerts.claim.activity/xyz789",
   *   "bafyreiabc123..."
   * );
   *
   * const evaluation = {
   *   $type: "org.myapp.evaluation",
   *   subject: hypercertRef, // Reference to specific hypercert version
   *   score: 85,
   *   createdAt: new Date().toISOString(),
   * };
   * ```
   */
  protected createStrongRef(uri: string, cid: string): StrongRef {
    return { uri, cid };
  }

  /**
   * Creates a strongRef from a CreateResult or UpdateResult.
   *
   * This is a convenience method for creating strongRefs from the
   * results of create or update operations.
   *
   * @param result - Result from a create or update operation
   * @returns StrongRef object with uri and cid properties
   *
   * @example
   * ```typescript
   * // Create a project
   * const projectResult = await this.validateAndCreate("org.myapp.project", projectRecord);
   *
   * // Create a task that references the project
   * const taskRecord = {
   *   $type: "org.myapp.task",
   *   project: this.createStrongRefFromResult(projectResult),
   *   title: "Implement feature",
   *   createdAt: new Date().toISOString(),
   * };
   * ```
   */
  protected createStrongRefFromResult(result: CreateResult | UpdateResult): StrongRef {
    return { uri: result.uri, cid: result.cid };
  }

  /**
   * Parses an AT-URI to extract its components.
   *
   * AT-URIs follow the format: `at://{did}/{collection}/{rkey}`
   *
   * @param uri - AT-URI to parse
   * @returns Object containing did, collection, and rkey
   * @throws Error if the URI format is invalid
   *
   * @example
   * ```typescript
   * const { did, collection, rkey } = this.parseAtUri(
   *   "at://did:plc:abc123/org.hypercerts.claim.activity/xyz789"
   * );
   * // did: "did:plc:abc123"
   * // collection: "org.hypercerts.claim.activity"
   * // rkey: "xyz789"
   * ```
   */
  protected parseAtUri(uri: string): { did: string; collection: string; rkey: string } {
    if (!uri.startsWith("at://")) {
      throw new Error(`Invalid AT-URI format: ${uri}`);
    }

    const parts = uri.slice(5).split("/"); // Remove "at://" and split
    if (parts.length !== 3) {
      throw new Error(`Invalid AT-URI format: ${uri}`);
    }

    return {
      did: parts[0],
      collection: parts[1],
      rkey: parts[2],
    };
  }

  /**
   * Builds an AT-URI from its components.
   *
   * @param did - DID of the repository
   * @param collection - NSID of the collection
   * @param rkey - Record key (typically a TID)
   * @returns Complete AT-URI string
   *
   * @example
   * ```typescript
   * const uri = this.buildAtUri(
   *   "did:plc:abc123",
   *   "org.myapp.evaluation",
   *   "xyz789"
   * );
   * // Returns: "at://did:plc:abc123/org.myapp.evaluation/xyz789"
   * ```
   */
  protected buildAtUri(did: string, collection: string, rkey: string): string {
    return `at://${did}/${collection}/${rkey}`;
  }

  /**
   * Abstract create method that must be implemented by subclasses.
   *
   * Implement this method to define how your custom records are created.
   * Use the helper methods like `validateAndCreate()`, `createStrongRef()`,
   * etc. to build your implementation.
   *
   * @param params - Parameters for creating the record
   * @returns Promise resolving to the creation result
   *
   * @example
   * ```typescript
   * async create(params: EvaluationParams): Promise<EvaluationResult> {
   *   const record = {
   *     $type: "org.myapp.evaluation",
   *     subject: this.createStrongRef(params.subjectUri, params.subjectCid),
   *     score: params.score,
   *     methodology: params.methodology,
   *     createdAt: new Date().toISOString(),
   *   };
   *
   *   const { uri, cid } = await this.validateAndCreate("org.myapp.evaluation", record);
   *   return { uri, cid, record };
   * }
   * ```
   */
  abstract create(params: TParams): Promise<TResult>;
}
