/**
 * HypercertOperationsImpl - High-level hypercert operations.
 *
 * This module provides the implementation for creating and managing
 * hypercerts, including related records like rights, locations,
 * contributions, measurements, and evaluations.
 *
 * @packageDocumentation
 */

import type { Agent, BlobRef } from "@atproto/api";
import { $Typed } from "@atproto/api";
import { validate } from "@hypercerts-org/lexicon";
import { EventEmitter } from "eventemitter3";
import type { LoggerInterface } from "../core/interfaces.js";
import { NetworkError, ValidationError } from "../errors.js";
import { sha256Hash } from "../lib/crypto.js";
import { isValidUri } from "../lib/url-utils.js";
import {
  HYPERCERT_COLLECTIONS,
  type CreateAcknowledgementParams,
  type CreateAttachmentParams,
  type CreateCollectionParams,
  type CreateCollectionResult,
  type CreateLocationParams,
  type CreateMeasurementParams,
  type CreateProjectParams,
  type CreateProjectResult,
  type HypercertAcknowledgement,
  type HypercertAttachment,
  type HypercertClaim,
  type HypercertCollection,
  type HypercertContributionDetails,
  type HypercertContributorInformation,
  type HypercertEvaluation,
  type HypercertLocation,
  type HypercertMeasurement,
  type HypercertRights,
  type OrgHypercertsDefs,
  type RefUri,
  type StrongRef,
  type UpdateAcknowledgementParams,
  type UpdateCollectionParams,
  type UpdateMeasurementParams,
  type UpdateProjectParams,
} from "../services/hypercerts/types.js";
import type {
  BlobOperations,
  ContributionDetailsParams,
  ContributorIdentityParams,
  CreateHypercertParams,
  UpdateHypercertParams,
  CreateHypercertResult,
  HypercertEvents,
  HypercertOperations,
  LocationParams,
} from "./interfaces.js";
import type { CreateResult, ListParams, PaginatedList, ProgressStep, UpdateResult } from "./types.js";
import { parseAtUri } from "../lexicons/utils.js";

/**
 * Implementation of high-level hypercert operations.
 *
 * This class provides a convenient API for creating and managing hypercerts
 * with automatic handling of:
 *
 * - Image upload and blob reference management
 * - Rights record creation and linking
 * - Location attachment with optional GeoJSON support
 * - Contribution tracking
 * - Measurement and evaluation records
 * - Hypercert collections
 *
 * The class extends EventEmitter to provide real-time progress notifications
 * during complex operations.
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.hypercerts}.
 *
 * **Record Relationships**:
 * - Hypercert → Rights (required, 1:1)
 * - Hypercert → Location (optional, 1:many)
 * - Hypercert → Contribution (optional, 1:many)
 * - Hypercert → Measurement (optional, 1:many)
 * - Hypercert → Evaluation (optional, 1:many)
 * - Collection → Hypercerts (1:many via claims array)
 *
 * @example Creating a hypercert with progress tracking
 * ```typescript
 * repo.hypercerts.on("recordCreated", ({ uri }) => {
 *   console.log(`Hypercert created: ${uri}`);
 * });
 *
 * const result = await repo.hypercerts.create({
 *   title: "Climate Impact",
 *   description: "Reduced emissions by 100 tons",
 *   workScope: "Climate",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-12-31",
 *   rights: { name: "CC-BY", type: "license", description: "..." },
 *   onProgress: (step) => console.log(`${step.name}: ${step.status}`),
 * });
 * ```
 *
 * @internal
 */
export class HypercertOperationsImpl extends EventEmitter<HypercertEvents> implements HypercertOperations {
  /**
   * Creates a new HypercertOperationsImpl.
   *
   * @param agent - AT Protocol Agent for making API calls
   * @param repoDid - DID of the repository to operate on
   * @param blobs - Blob operations for uploading images and files
   * @param logger - Optional logger for debugging
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private blobs: BlobOperations,
    private logger?: LoggerInterface,
  ) {
    super();
  }

  /**
   * Parses an AT-URI and throws ValidationError if invalid.
   *
   * This wrapper converts the generic Error from parseAtUri() to a ValidationError
   * for consistent error handling throughout the SDK.
   *
   * @param uri - AT-URI to parse
   * @returns Parsed URI components
   * @throws {@link ValidationError} if URI format is invalid
   * @internal
   */
  private parseUri(uri: string): { did: string; collection: string; rkey: string } {
    try {
      return parseAtUri(uri);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : `Invalid URI format: ${uri}`);
    }
  }

  /**
   * Fetches any record by AT-URI with generic typing.
   *
   * Returns the record along with parsed URI components needed for updates.
   * Unlike the public `get()` method which is typed for HypercertClaim,
   * this method can fetch any record type.
   *
   * @typeParam T - The expected type of the record
   * @param uri - AT-URI of the record to fetch
   * @returns Record data with parsed URI components
   * @throws {@link ValidationError} if URI format is invalid
   * @throws {@link NetworkError} if record cannot be fetched
   * @internal
   */
  private async fetchRecord<T = unknown>(
    uri: string,
  ): Promise<{
    uri: string;
    cid: string;
    record: T;
    collection: string;
    rkey: string;
  }> {
    const { did, collection, rkey } = this.parseUri(uri);

    const result = await this.agent.com.atproto.repo.getRecord({
      repo: did,
      collection,
      rkey,
    });

    if (!result.success) {
      throw new NetworkError(`Failed to fetch record: ${uri}`);
    }

    const cid = result.data.cid;
    if (!cid) {
      throw new NetworkError(`Record at ${uri} returned no CID`);
    }

    return {
      uri: result.data.uri,
      cid,
      record: result.data.value as T,
      collection,
      rkey,
    };
  }

  /**
   * Updates a record in the repository.
   *
   * @param collection - NSID of the collection
   * @param rkey - Record key
   * @param record - Updated record data
   * @returns Update result with URI and CID
   * @throws {@link NetworkError} if update fails
   * @internal
   */
  private async saveRecord(collection: string, rkey: string, record: Record<string, unknown>): Promise<UpdateResult> {
    const result = await this.agent.com.atproto.repo.putRecord({
      repo: this.repoDid,
      collection,
      rkey,
      record,
    });

    if (!result.success) {
      throw new NetworkError(`Failed to save record: ${collection}/${rkey}`);
    }

    return { uri: result.data.uri, cid: result.data.cid };
  }

  /**
   * Emits a progress event to the optional progress handler.
   *
   * @param onProgress - Progress callback from create params
   * @param step - Progress step information
   * @internal
   */
  private emitProgress(onProgress: ((step: ProgressStep) => void) | undefined, step: ProgressStep): void {
    if (onProgress) {
      try {
        onProgress(step);
      } catch (err) {
        this.logger?.error(`Error in progress handler: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
  }

  /**
   * Uploads an image blob and returns a blob reference.
   *
   * @param image - Image blob to upload
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to blob reference or undefined
   * @throws {@link NetworkError} if upload fails
   * @internal
   */
  private async uploadImageBlob(image: Blob, onProgress?: (step: ProgressStep) => void) {
    this.emitProgress(onProgress, { name: "uploadImage", status: "start" });
    try {
      const uploadResult = await this.blobs.upload(image);
      this.emitProgress(onProgress, {
        name: "uploadImage",
        status: "success",
        data: { size: image.size },
      });
      return uploadResult;
    } catch (error) {
      this.emitProgress(onProgress, { name: "uploadImage", status: "error", error: error as Error });
      throw new NetworkError(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Creates a rights record for a hypercert.
   *
   * @param rights - Rights data
   * @param createdAt - ISO timestamp for creation
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to rights URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if creation fails
   * @internal
   */
  private async createRightsRecord(
    rights: { name: string; type: string; description: string },
    createdAt: string,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<{ uri: string; cid: string }> {
    this.emitProgress(onProgress, { name: "createRights", status: "start" });
    const rightsRecord: HypercertRights = {
      $type: HYPERCERT_COLLECTIONS.RIGHTS,
      rightsName: rights.name,
      rightsType: rights.type,
      rightsDescription: rights.description,
      createdAt,
    };

    const rightsValidation = validate(rightsRecord, HYPERCERT_COLLECTIONS.RIGHTS, "main", false);
    if (!rightsValidation.success) {
      throw new ValidationError(`Invalid rights record: ${rightsValidation.error?.message}`);
    }

    const rightsResult = await this.agent.com.atproto.repo.createRecord({
      repo: this.repoDid,
      collection: HYPERCERT_COLLECTIONS.RIGHTS,
      record: rightsRecord as Record<string, unknown>,
    });

    if (!rightsResult.success) {
      throw new NetworkError("Failed to create rights record");
    }

    const uri = rightsResult.data.uri;
    const cid = rightsResult.data.cid;
    this.emit("rightsCreated", { uri, cid });
    this.emitProgress(onProgress, {
      name: "createRights",
      status: "success",
      data: { uri },
    });

    return { uri, cid };
  }

  /**
   * Creates the main hypercert record.
   *
   * @param params - Hypercert creation parameters
   * @param rightsUri - URI of the associated rights record
   * @param rightsCid - CID of the associated rights record
   * @param imageBlobRef - Optional image blob reference
   * @param locationRefs - Optional array of strong references to the associated location records
   * @param contributorsData - Optional array of contributor data (inline or StrongRef) to embed in the claim
   * @param createdAt - ISO timestamp for creation
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to hypercert URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if creation fails
   * @internal
   */
  private async createHypercertRecord(
    params: CreateHypercertParams,
    rightsUri: string,
    rightsCid: string,
    imageBlobRef: BlobRef | undefined,
    locationRefs: Array<{ uri: string; cid: string }> | undefined,
    contributorsData:
      | Array<{
          contributorIdentity: RefUri;
          contributionWeight?: string;
          contributionDetails?: RefUri;
        }>
      | undefined,
    createdAt: string,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<{ uri: string; cid: string }> {
    this.emitProgress(onProgress, { name: "createHypercert", status: "start" });
    const hypercertRecord: Record<string, unknown> = {
      $type: HYPERCERT_COLLECTIONS.CLAIM,
      title: params.title,
      shortDescription: params.shortDescription,
      description: params.description,
      workScope: params.workScope,
      startDate: params.startDate,
      endDate: params.endDate,
      rights: { uri: rightsUri, cid: rightsCid },
      createdAt,
    };

    if (imageBlobRef) {
      hypercertRecord.image = {
        $type: "org.hypercerts.defs#smallImage",
        image: imageBlobRef,
      };
    }

    // Add locations as embedded StrongRefs if provided
    if (locationRefs && locationRefs.length > 0) {
      hypercertRecord.locations = locationRefs.map((ref) => ({ uri: ref.uri, cid: ref.cid }));
    }

    if (params.shortDescriptionFacets !== undefined) {
      hypercertRecord.shortDescriptionFacets = params.shortDescriptionFacets;
    }

    if (params.descriptionFacets !== undefined) {
      hypercertRecord.descriptionFacets = params.descriptionFacets;
    }

    // Add contributors if provided (inline role string or StrongRef per lexicon)
    if (contributorsData && contributorsData.length > 0) {
      hypercertRecord.contributors = contributorsData.map((c) => {
        const contributor: Record<string, unknown> = {
          contributorIdentity: c.contributorIdentity,
        };
        if (c.contributionWeight) {
          contributor.contributionWeight = c.contributionWeight;
        }
        if (c.contributionDetails) {
          // StrongRef has uri/cid, string is inline role
          contributor.contributionDetails = c.contributionDetails;
        }
        return contributor;
      });
    }

    const hypercertValidation = validate(hypercertRecord, HYPERCERT_COLLECTIONS.CLAIM, "main", false);
    if (!hypercertValidation.success) {
      throw new ValidationError(`Invalid hypercert record: ${hypercertValidation.error?.message}`);
    }

    // if its a blob ref guaranteed to have ref and a .toString method
    let imageRef: string | undefined;
    if (imageBlobRef) {
      imageRef = imageBlobRef.ref.toString();
    }

    // Generate rKey from stable content hash (idempotency)
    // Use NORMALIZED values (already resolved StrongRefs and processed data)
    // to ensure JSON-serializability and deterministic hashing.
    // Raw params.location can contain non-serializable Blobs (GeoJSON),
    // and params.contributions can have arbitrary/inconsistent props.
    const hashInput = {
      title: params.title,
      description: params.description,
      shortDescription: params.shortDescription,
      workScope: params.workScope,
      startDate: params.startDate,
      endDate: params.endDate,
      imageRef,
      // Rights: canonical object with only known fields
      rights: {
        name: params.rights.name,
        type: params.rights.type,
        description: params.rights.description,
      },
      // Locations: use resolved StrongRefs (uri+cid), not raw params which may be Blob
      locationRefs: locationRefs?.map((ref) => ({ uri: ref.uri, cid: ref.cid })),
      // Contributors: use already-processed canonical format from processContributors()
      contributors: contributorsData,
    };

    const contentHash = await sha256Hash(hashInput);
    const rkey = `hc2:${contentHash}`;

    const hypercertResult = await this.agent.com.atproto.repo.createRecord({
      repo: this.repoDid,
      collection: HYPERCERT_COLLECTIONS.CLAIM,
      record: hypercertRecord,
      rkey,
    });

    if (!hypercertResult.success) {
      throw new NetworkError("Failed to create hypercert record");
    }

    const uri = hypercertResult.data.uri;
    const cid = hypercertResult.data.cid;
    this.emit("recordCreated", { uri, cid });
    this.emitProgress(onProgress, {
      name: "createHypercert",
      status: "success",
      data: { uri },
    });

    return { uri, cid };
  }

  /**
   * Attaches a location to a hypercert with progress tracking.
   *
   * @param hypercertUri - URI of the hypercert
   * @param location - Location data
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to location URI and CID
   * @internal
   */
  private async attachLocationWithProgress(
    hypercertUri: string,
    location: LocationParams,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<CreateResult> {
    this.emitProgress(onProgress, { name: "attachLocation", status: "start" });
    try {
      const locationResult = await this.attachLocation(hypercertUri, location);
      this.emitProgress(onProgress, {
        name: "attachLocation",
        status: "success",
        data: { uri: locationResult.uri },
      });
      return locationResult;
    } catch (error) {
      this.emitProgress(onProgress, { name: "attachLocation", status: "error", error: error as Error });
      this.logger?.warn(`Failed to attach location: ${error instanceof Error ? error.message : "Unknown"}`);
      throw error;
    }
  }

  /**
   * Creates attachment records and returns their URIs.
   *
   * @param hypercertUri - URI of the parent hypercert
   * @param attachmentItems - Array of attachment items to create
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of attachment URIs
   * @internal
   */
  private async createAttachmentsWithProgress(
    hypercertUri: string,
    attachmentItems: Array<Omit<CreateAttachmentParams, "subjects">>,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<string[]> {
    this.emitProgress(onProgress, { name: "addAttachment", status: "start" });
    try {
      const attachmentUris = await Promise.all(
        attachmentItems.map((attachment) =>
          this.addAttachment({
            ...attachment,
            subjects: hypercertUri,
          } as CreateAttachmentParams).then((result) => result.uri),
        ),
      );
      this.emitProgress(onProgress, {
        name: "addAttachment",
        status: "success",
        data: { count: attachmentUris.length },
      });
      return attachmentUris;
    } catch (error) {
      this.emitProgress(onProgress, { name: "addAttachment", status: "error", error: error as Error });
      this.logger?.warn(`Failed to create attachments: ${error instanceof Error ? error.message : "Unknown"}`);
      throw error;
    }
  }

  /**
   * Creates a new hypercert with all related records.
   *
   * This method orchestrates the creation of a hypercert and its associated
   * records in the correct order:
   *
   * 1. Upload image (if provided)
   * 2. Create rights record
   * 3. Create hypercert record (referencing rights)
   * 4. Attach location (if provided)
   * 5. Create contributions (if provided)
   *
   * @param params - Creation parameters (see {@link CreateHypercertParams})
   * @returns Promise resolving to URIs and CIDs of all created records
   * @throws {@link ValidationError} if any record fails validation
   * @throws {@link NetworkError} if any API call fails
   *
   * @remarks
   * The operation is not atomic - if a later step fails, earlier records
   * will still exist. The returned record reflects the created hypercert,
   * including location when attachment succeeds.
   *
   * **Progress Steps**:
   * - `uploadImage`: Image blob upload
   * - `createRights`: Rights record creation
   * - `createHypercert`: Main hypercert record creation
   * - `attachLocation`: Location record creation
   * - `createContributions`: Contribution records creation
   * - `addAttachment`: Attachment records creation
   *
   * @example Minimal hypercert
   * ```typescript
   * const result = await repo.hypercerts.create({
   *   title: "My Impact",
   *   description: "Description of impact work",
   *   shortDescription: "Impact work",
   *   workScope: "Education",
   *   startDate: "2024-01-01",
   *   endDate: "2024-06-30",
   *   rights: {
   *     name: "Attribution",
   *     type: "license",
   *     description: "CC-BY-4.0",
   *   },
   * });
   * ```
   *
   * @example Full hypercert with all options
   * ```typescript
   * const result = await repo.hypercerts.create({
   *   title: "Reforestation Project",
   *   description: "Planted 10,000 trees...",
   *   shortDescription: "10K trees planted",
   *   workScope: "Environment",
   *   startDate: "2024-01-01",
   *   endDate: "2024-12-31",
   *   rights: { name: "Open", type: "impact", description: "..." },
   *   image: coverImageBlob,
   *   locations: [{ value: "Amazon, Brazil", name: "Amazon Basin" }],
   *   contributions: [
   *     { contributors: ["did:plc:org1"], role: "coordinator" },
   *     { contributors: ["did:plc:org2"], role: "implementer" },
   *   ],
   *   attachments: [{ uri: "https://...", description: "Satellite data" }],
   *   onProgress: console.log,
   * });
   * ```
   */
  async create(params: CreateHypercertParams): Promise<CreateHypercertResult> {
    const createdAt = new Date().toISOString();
    const result: CreateHypercertResult = {
      hypercertUri: "",
      rightsUri: "",
      hypercertCid: "",
      rightsCid: "",
    };

    try {
      // Step 1: Upload image if provided
      const imageBlobRef = params.image ? await this.uploadImageBlob(params.image, params.onProgress) : undefined;

      // Step 2: Create location records if provided (must be before hypercert)
      // If locations are provided, they must succeed - failing silently would change the rKey on retries
      const locationRefs = await this.processLocations(params.locations, params.onProgress);
      if (locationRefs && locationRefs.length > 0) {
        result.locationUris = locationRefs.map((ref) => ref.uri);
        result.locationCids = locationRefs.map((ref) => ref.cid);
      }

      // Step 3: Create rights record
      const { uri: rightsUri, cid: rightsCid } = await this.createRightsRecord(
        params.rights,
        createdAt,
        params.onProgress,
      );
      result.rightsUri = rightsUri;
      result.rightsCid = rightsCid;

      // Step 4: Build contributors data for embedding (if provided)
      const contributorsData = await this.processContributors(params.contributions, params.onProgress);

      // Step 5: Create hypercert record (with embedded locations, rights, and contributors)
      const { uri: hypercertUri, cid: hypercertCid } = await this.createHypercertRecord(
        params,
        rightsUri,
        rightsCid,
        imageBlobRef,
        locationRefs,
        contributorsData,
        createdAt,
        params.onProgress,
      );
      result.hypercertUri = hypercertUri;
      result.hypercertCid = hypercertCid;

      // Step 6: Add attachment records if provided
      if (params.attachments && params.attachments.length > 0) {
        try {
          result.attachmentUris = await this.createAttachmentsWithProgress(
            hypercertUri,
            params.attachments,
            params.onProgress,
          );
        } catch {
          // Error already logged and progress emitted
        }
      }

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to create hypercert: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Updates an existing hypercert record.
   *
   * @param params - Update parameters
   * @param params.uri - AT-URI of the hypercert to update
   * @param params.updates - Partial record with fields to update
   * @param params.image - New image blob, `null` to remove, `undefined` to keep existing
   * @returns Promise resolving to update result
   * @throws {@link ValidationError} if the URI format is invalid or record fails validation
   * @throws {@link NetworkError} if the update fails
   *
   * @remarks
   * This is a partial update - only specified fields are changed.
   * The `createdAt` and `rights` fields cannot be changed.
   *
   * @example Update title and description
   * ```typescript
   * await repo.hypercerts.update({
   *   uri: "at://did:plc:abc/org.hypercerts.hypercert/xyz",
   *   updates: {
   *     title: "Updated Title",
   *     description: "New description",
   *   },
   * });
   * ```
   *
   * @example Update with new image
   * ```typescript
   * await repo.hypercerts.update({
   *   uri: hypercertUri,
   *   updates: { title: "New Title" },
   *   image: newImageBlob,
   * });
   * ```
   *
   * @example Remove image
   * ```typescript
   * await repo.hypercerts.update({
   *   uri: hypercertUri,
   *   updates: {},
   *   image: null,  // Explicitly remove image
   * });
   * ```
   */
  async update(params: { uri: string; updates: UpdateHypercertParams; image?: Blob | null }): Promise<UpdateResult> {
    try {
      const { record: existingRecord, collection, rkey } = await this.fetchRecord<HypercertClaim>(params.uri);

      const recordForUpdate: Record<string, unknown> = {
        ...existingRecord,
        ...params.updates,
        createdAt: existingRecord.createdAt,
        rights: existingRecord.rights,
      };

      // Handle image update
      delete (recordForUpdate as { image?: unknown }).image;
      if (params.image !== undefined) {
        if (params.image === null) {
          // Remove image
        } else {
          const uploadResult = await this.blobs.upload(params.image);
          recordForUpdate.image = {
            $type: "org.hypercerts.defs#smallImage",
            image: uploadResult,
          };
        }
      } else if (existingRecord.image) {
        // Preserve existing image
        recordForUpdate.image = existingRecord.image;
      }

      const validation = validate(recordForUpdate, collection, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid hypercert record: ${validation.error?.message}`);
      }

      const result = await this.saveRecord(collection, rkey, recordForUpdate);

      this.emit("recordUpdated", { uri: result.uri, cid: result.cid });
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to update hypercert: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Gets a hypercert by its AT-URI.
   *
   * @param uri - AT-URI of the hypercert (e.g., "at://did:plc:abc/org.hypercerts.hypercert/xyz")
   * @returns Promise resolving to hypercert URI, CID, and parsed record
   * @throws {@link ValidationError} if the URI format is invalid or record doesn't match schema
   * @throws {@link NetworkError} if the record cannot be fetched
   *
   * @example
   * ```typescript
   * const { uri, cid, record } = await repo.hypercerts.get(hypercertUri);
   * console.log(`${record.title}: ${record.description}`);
   * ```
   */
  async get(uri: string): Promise<{ uri: string; cid: string; record: HypercertClaim }> {
    try {
      const { uri: resultUri, cid, record } = await this.fetchRecord<HypercertClaim>(uri);
      return { uri: resultUri, cid, record };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get hypercert: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Lists hypercerts in the repository with pagination.
   *
   * @param params - Optional pagination parameters
   * @returns Promise resolving to paginated list of hypercerts
   * @throws {@link NetworkError} if the list operation fails
   *
   * @example
   * ```typescript
   * // Get first page
   * const { records, cursor } = await repo.hypercerts.list({ limit: 20 });
   *
   * // Get next page
   * if (cursor) {
   *   const nextPage = await repo.hypercerts.list({ limit: 20, cursor });
   * }
   * ```
   */
  async list(params?: ListParams): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertClaim }>> {
    try {
      const result = await this.agent.com.atproto.repo.listRecords({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.CLAIM,
        limit: params?.limit,
        cursor: params?.cursor,
      });

      if (!result.success) {
        throw new NetworkError("Failed to list hypercerts");
      }

      return {
        records:
          result.data.records?.map((r) => ({
            uri: r.uri,
            cid: r.cid,
            record: r.value as HypercertClaim,
          })) || [],
        cursor: result.data.cursor ?? undefined,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to list hypercerts: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Deletes a hypercert record.
   *
   * @param uri - AT-URI of the hypercert to delete
   * @throws {@link ValidationError} if the URI format is invalid
   * @throws {@link NetworkError} if the deletion fails
   *
   * @remarks
   * This only deletes the hypercert record itself. Related records
   * (rights, locations, contributions) are not automatically deleted.
   *
   * @example
   * ```typescript
   * await repo.hypercerts.delete(hypercertUri);
   * ```
   */
  async delete(uri: string): Promise<void> {
    try {
      const { collection, rkey } = this.parseUri(uri);

      const result = await this.agent.com.atproto.repo.deleteRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to delete hypercert");
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to delete hypercert: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Attaches a location to an existing hypercert.
   *
   * @param hypercertUri - AT-URI of the hypercert to attach location to
   * @param location - Location data
   * @param location.value - Location value (address, coordinates, or description)
   * @param location.name - Optional human-readable name
   * @param location.description - Optional description
   * @param location.srs - Spatial Reference System (e.g., "EPSG:4326")
   * @param location.geojson - Optional GeoJSON blob for precise boundaries
   * @returns Promise resolving to location record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Simple location
   * ```typescript
   * await repo.hypercerts.attachLocation(hypercertUri, {
   *   value: "San Francisco, CA",
   *   name: "SF Bay Area",
   *   srs: "EPSG:4326",
   * });
   * ```
   *
   * @example Location with GeoJSON
   * ```typescript
   * const geojsonBlob = new Blob([JSON.stringify(geojson)], {
   *   type: "application/geo+json"
   * });
   *
   * await repo.hypercerts.attachLocation(hypercertUri, {
   *   value: "Custom Region",
   *   srs: "EPSG:4326",
   *   geojson: geojsonBlob,
   * });
   * ```
   */
  async attachLocation(hypercertUri: string, location: LocationParams): Promise<CreateResult> {
    try {
      // Get existing hypercert to preserve current locations
      const existing = await this.get(hypercertUri);
      const resolvedLocation = await this.resolveLocation(location);

      // Build new locations array: existing + new location
      const existingLocations = existing.record.locations || [];
      const newLocations = [
        ...existingLocations,
        {
          $type: "com.atproto.repo.strongRef",
          uri: resolvedLocation.uri,
          cid: resolvedLocation.cid,
        } as StrongRef,
      ];

      await this.update({
        uri: hypercertUri,
        updates: {
          locations: newLocations,
        },
      });

      this.emit("locationAttached", {
        uri: resolvedLocation.uri,
        cid: resolvedLocation.cid,
        hypercertUri,
      });
      return { uri: resolvedLocation.uri, cid: resolvedLocation.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to attach location: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Generic helper to resolve string | Blob into a URI or blob reference.
   *
   * @param content - Either a URI string or a Blob to upload
   * @param fallbackMimeType - MIME type to use if Blob.type is empty
   * @returns Promise resolving to either a URI ref or blob ref
   * @internal
   */
  private async resolveUriOrBlob(content: string | Blob, _fallbackMimeType: string) {
    if (typeof content === "string") {
      const uriRef = {
        $type: "org.hypercerts.defs#uri",
        uri: content,
      } satisfies $Typed<OrgHypercertsDefs.Uri>;
      return uriRef;
    }

    const uploadResult = await this.blobs.upload(content);
    return {
      $type: "org.hypercerts.defs#smallBlob" as const,
      blob: uploadResult,
    };
  }

  private async resolveCollectionImageInput(input: string | Blob): Promise<NonNullable<HypercertCollection["avatar"]>>;
  private async resolveCollectionImageInput(
    input: string | Blob,
    isBanner: true,
  ): Promise<NonNullable<HypercertCollection["banner"]>>;
  private async resolveCollectionImageInput(input: string | Blob, isBanner: boolean = false) {
    if (typeof input === "string") {
      return { $type: "org.hypercerts.defs#uri" as const, uri: input };
    }

    const uploadResult = await this.blobs.upload(input);
    if (isBanner) {
      return { $type: "org.hypercerts.defs#largeImage" as const, image: uploadResult };
    }

    return { $type: "org.hypercerts.defs#smallImage" as const, image: uploadResult };
  }

  /**
   * Resolves a location value to the appropriate lexicon format.
   *
   * Handles three input formats:
   * - **string** - Wrapped in `{ $type: "org.hypercerts.defs#uri", uri: ... }`
   *   This supports both free-form text ("New York, NY") and URLs
   * - **Blob** - Uploaded and wrapped in `{ $type: "org.hypercerts.defs#smallBlob", blob: ... }`
   * - **Structured object** - Passed through unchanged (already in lexicon format)
   *
   * @param location - Location value in any supported format
   * @returns Promise resolving to lexicon-compliant location value
   * @internal
   */
  private async resolveLocationValue(location: string | Blob | HypercertLocation["location"]) {
    if (typeof location === "string" || location instanceof Blob) {
      return this.resolveUriOrBlob(location, "application/geo+json");
    }

    return location;
  }

  /**
   * Check if an AttachLocationParams is the object form (not a StrongRef or string or Blob).
   * @internal
   */
  private isLocationObject(location: LocationParams): location is CreateLocationParams {
    return (
      typeof location === "object" &&
      !("uri" in location) &&
      !("cid" in location) &&
      location !== null &&
      !Array.isArray(location) &&
      !(location instanceof Blob)
    );
  }

  /**
   * Helper to resolve a location reference to a StrongRef.
   * Uses resolveToStrongRef for string and StrongRef inputs.
   *
   * @param location - Location parameter (StrongRef, string URI, or location object)
   * @returns Promise resolving to a StrongRef
   * @throws {ValidationError} When string input doesn't match AT-URI pattern or input is invalid
   * @throws {NetworkError} When getRecord fails or returns no CID
   * @internal
   */
  private async resolveLocation(location: LocationParams): Promise<StrongRef> {
    // If it's an object with location data, create new record
    if (this.isLocationObject(location)) {
      return this.createLocationRecord(location);
    }

    // Otherwise it's RefUri, resolve to StrongRef
    return this.resolveToStrongRef(location);
  }

  private async resolveStrongRefFromUri(uri: string): Promise<StrongRef> {
    // fetchRecord already validates CID presence and throws NetworkError if absent
    const fetchResult = await this.fetchRecord(uri);
    return { $type: "com.atproto.repo.strongRef" as const, uri, cid: fetchResult.cid };
  }

  /**
   * Resolves a string URI or StrongRef to a StrongRef.
   * If input is already a StrongRef, returns it as-is.
   * If input is a string URI, fetches the record to get the CID.
   *
   * @param input - String AT-URI or existing StrongRef
   * @returns Promise resolving to a StrongRef with $type, uri, and cid
   * @throws {@link ValidationError} When input is invalid or URI format is incorrect
   * @throws {@link NetworkError} When getRecord fails
   * @internal
   */
  private async resolveToStrongRef(input: RefUri): Promise<StrongRef> {
    // Check if already a StrongRef
    if (typeof input === "object" && "uri" in input && "cid" in input) {
      return {
        $type: "com.atproto.repo.strongRef" as const,
        uri: input.uri,
        cid: input.cid,
      };
    }

    // Must be a string URI
    if (typeof input === "string") {
      return this.resolveStrongRefFromUri(input);
    }

    throw new ValidationError("Invalid input: expected string URI or StrongRef");
  }

  /**
   * Resolves attachment subjects to an array of StrongRefs.
   * Accepts single or multiple subjects and normalizes to StrongRef array.
   *
   * @param subjectsInput - Single subject or array of subjects (URI strings or StrongRefs)
   * @returns Promise resolving to array of StrongRefs
   * @throws {@link ValidationError} if subject format is invalid
   * @throws {@link NetworkError} if fetching subject record fails
   * @internal
   */
  private async resolveAttachmentSubjects(subjectsInput: RefUri | RefUri[]): Promise<StrongRef[]> {
    const subjectsArray = Array.isArray(subjectsInput) ? subjectsInput : [subjectsInput];

    return await Promise.all(subjectsArray.map((subject) => this.resolveToStrongRef(subject)));
  }

  /**
   * Resolves attachment content items to an array of URI or Blob references.
   * Accepts single or multiple content items and normalizes to array.
   * Uploads Blob content and formats URI content.
   *
   * @param contentInput - Single content item or array (URI strings or Blobs)
   * @returns Promise resolving to array of URI refs or Blob refs
   * @throws {@link ValidationError} if a string content item is not a valid URI
   * @throws {@link NetworkError} if blob upload fails
   * @internal
   */
  private async resolveAttachmentContent(contentInput: string | Blob | Array<string | Blob>) {
    const contentArray = Array.isArray(contentInput) ? contentInput : [contentInput];

    // Validate that all string content items are valid URIs before resolving
    for (const item of contentArray) {
      if (typeof item === "string" && !isValidUri(item)) {
        throw new ValidationError(
          `Invalid URI: "${item}". Content must be a valid URI with a scheme (e.g., https://example.com)`,
        );
      }
    }

    return await Promise.all(contentArray.map((item) => this.resolveUriOrBlob(item, "application/octet-stream")));
  }

  /**
   * Builds an attachment record from resolved components.
   *
   * @param subjects - Resolved subject StrongRefs
   * @param content - Resolved content items (URI or Blob refs)
   * @param locationRef - Optional resolved location StrongRef
   * @param rest - Remaining attachment parameters (title, description, etc.)
   * @returns Fully constructed attachment record
   * @internal
   */
  private buildAttachmentRecord(
    subjects: StrongRef[],
    content: Awaited<ReturnType<typeof this.resolveAttachmentContent>>,
    locationRef: StrongRef | undefined,
    rest: Omit<CreateAttachmentParams, "subjects" | "content" | "location">,
  ): HypercertAttachment {
    const createdAt = new Date().toISOString();

    return {
      ...rest,
      $type: rest.$type ?? HYPERCERT_COLLECTIONS.ATTACHMENT,
      createdAt: rest.createdAt ?? createdAt,
      subjects,
      content,
      ...(locationRef && { location: locationRef }),
    } as HypercertAttachment;
  }

  /**
   * Adds an attachment to any subject record.
   *
   * Attachments provide commentary, context, evidence, or documentary material
   * related to hypercert records.
   *
   * @param attachment - Attachment parameters
   * @returns Promise resolving to attachment record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Single subject with URI content
   * ```typescript
   * await repo.hypercerts.addAttachment({
   *   subjects: "at://did:plc:u7h3dstby64di67bxaotzxcz/org.hypercerts.claim.activity/3mbvv5d7ixh2g",
   *   content: "https://example.com/report.pdf",
   *   title: "Impact Report",
   *   contentType: "report"
   * });
   * ```
   *
   * @example Multiple subjects with mixed content
   * ```typescript
   * await repo.hypercerts.addAttachment({
   *   subjects: [
   *     "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
   *     { uri: "at://...", cid: "..." }
   *   ],
   *   content: [
   *     "https://example.com/report.pdf",
   *     new Blob(["data"], { type: "application/pdf" })
   *   ],
   *   title: "Multi-source Evidence",
   *   location: { uri: "at://...", cid: "..." }
   * });
   * ```
   */
  async addAttachment(attachment: CreateAttachmentParams): Promise<UpdateResult> {
    try {
      const { subjects: subjectsInput, content: contentInput, location: locationInput, ...rest } = attachment;

      if (!contentInput) {
        throw new ValidationError("content is required for attachments");
      }
      const [subjects, content, locationRef] = await Promise.all([
        this.resolveAttachmentSubjects(subjectsInput),
        this.resolveAttachmentContent(contentInput),
        locationInput ? this.resolveLocation(locationInput) : Promise.resolve(undefined),
      ]);
      const attachmentRecord = this.buildAttachmentRecord(subjects, content, locationRef, rest);
      const validation = validate(attachmentRecord, HYPERCERT_COLLECTIONS.ATTACHMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid attachment record: ${validation.error?.message}`);
      }
      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.ATTACHMENT,
        record: attachmentRecord,
      });

      if (!result.success) {
        throw new NetworkError(`Failed to add attachment`);
      }
      this.emit("attachmentAdded", { uri: result.data.uri, cid: result.data.cid });

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to add attachment: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Processes location parameters, creating location records if necessary.
   *
   * @param locationParams - Location parameters array from create request
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of location StrongRefs or undefined
   * @internal
   */
  private async processLocations(
    locationParams: LocationParams[] | undefined,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<Array<{ uri: string; cid: string }> | undefined> {
    if (!locationParams || locationParams.length === 0) return undefined;

    try {
      this.emitProgress(onProgress, { name: "createLocation", status: "start" });
      const locationRefs = await Promise.all(locationParams.map((loc) => this.resolveLocation(loc)));
      this.emitProgress(onProgress, {
        name: "createLocation",
        status: "success",
        data: { count: locationRefs.length },
      });
      return locationRefs;
    } catch (error) {
      this.emitProgress(onProgress, { name: "createLocation", status: "error", error: error as Error });
      this.logger?.warn(`Failed to create location: ${error instanceof Error ? error.message : "Unknown"}`);
      // Re-throw to fail the operation - swallowing would change rKey on retry
      throw error;
    }
  }

  /**
   * Applies updates to an existing measurement record, preserving immutable fields.
   *
   * @param existing - The existing measurement record
   * @param updates - The updates to apply
   * @returns Promise resolving to the updated measurement record
   * @internal
   */
  private async applyMeasurementUpdates(
    existing: HypercertMeasurement,
    updates: UpdateMeasurementParams,
  ): Promise<HypercertMeasurement> {
    const record: HypercertMeasurement = {
      ...existing,
      // Preserve immutable fields
      $type: existing.$type,
      subject: existing.subject,
      createdAt: existing.createdAt,
    };

    if (updates.metric !== undefined) record.metric = updates.metric;
    if (updates.unit !== undefined) record.unit = updates.unit;
    if (updates.value !== undefined) record.value = updates.value;
    if (updates.startDate !== undefined) record.startDate = updates.startDate;
    if (updates.endDate !== undefined) record.endDate = updates.endDate;
    if (updates.methodType !== undefined) record.methodType = updates.methodType;
    if (updates.methodURI !== undefined) record.methodURI = updates.methodURI;
    if (updates.evidenceURI !== undefined) record.evidenceURI = updates.evidenceURI;
    if (updates.measurers !== undefined) record.measurers = updates.measurers;
    if (updates.comment !== undefined) record.comment = updates.comment;
    if (updates.commentFacets !== undefined) record.commentFacets = updates.commentFacets;

    if (updates.locations !== undefined) {
      record.locations = await this.processLocations(updates.locations);
    }

    return record;
  }

  /**
   * Processes contribution parameters, creating contributor/contribution records if necessary.
   *
   * @param contributions - Array of contribution parameters
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to flattened array of contributor data for embedding
   * @internal
   */
  private async processContributors(
    contributions:
      | Array<{
          contributors: Array<ContributorIdentityParams>;
          contributionDetails: ContributionDetailsParams;
          weight?: string;
        }>
      | undefined,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<
    | Array<{
        contributorIdentity: RefUri;
        contributionWeight?: string;
        contributionDetails?: RefUri;
      }>
    | undefined
  > {
    if (!contributions || contributions.length === 0) return undefined;

    const contributorPromises = contributions.map((contrib) =>
      this.buildContributorEntries(contrib.contributors, contrib.contributionDetails, contrib.weight, onProgress),
    );

    const nestedContributors = await Promise.all(contributorPromises);
    return nestedContributors.flat();
  }

  /**
   * Creates a standalone contributionDetails record.
   * @internal
   */
  private async createContributionDetailsRecord(params: {
    role: string;
    contributionDescription?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  }): Promise<CreateResult> {
    const createdAt = new Date().toISOString();
    const { role, contributionDescription, startDate, endDate, ...extraProps } = params;
    const contributionRecord: HypercertContributionDetails = {
      $type: HYPERCERT_COLLECTIONS.CONTRIBUTION_DETAILS,
      role,
      createdAt,
      contributionDescription,
      startDate,
      endDate,
      ...extraProps,
    };

    const validation = validate(contributionRecord, HYPERCERT_COLLECTIONS.CONTRIBUTION_DETAILS, "main", false);
    if (!validation.success) {
      throw new ValidationError(`Invalid contribution details record: ${validation.error?.message}`);
    }

    const result = await this.agent.com.atproto.repo.createRecord({
      repo: this.repoDid,
      collection: HYPERCERT_COLLECTIONS.CONTRIBUTION_DETAILS,
      record: contributionRecord as Record<string, unknown>,
    });

    if (!result.success) {
      throw new NetworkError("Failed to create contribution details");
    }

    return { uri: result.data.uri, cid: result.data.cid };
  }

  /**
   * Resolves ContributionDetailsParams to a RefUri.
   * Creates a record if CreateContributionDetailsParams is provided.
   * @internal
   */
  private async resolveContributionDetails(
    details: ContributionDetailsParams,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<RefUri> {
    if (typeof details === "string") {
      // Inline role string
      return details;
    } else if ("uri" in details && "cid" in details && !("role" in details)) {
      // StrongRef to existing record
      return { uri: details.uri as string, cid: details.cid as string, $type: "com.atproto.repo.strongRef" };
    } else if ("role" in details) {
      // CreateContributionDetailsParams - auto-create record
      try {
        this.emitProgress(onProgress, { name: "createContribution", status: "start" });
        const result = await this.createContributionDetailsRecord(details);
        this.emitProgress(onProgress, {
          name: "createContribution",
          status: "success",
          data: result,
        });
        return { uri: result.uri, cid: result.cid, $type: "com.atproto.repo.strongRef" };
      } catch (error) {
        this.emitProgress(onProgress, {
          name: "createContribution",
          status: "error",
          error: error as Error,
        });
        throw error;
      }
    }
    throw new ValidationError("Invalid contributionDetails format");
  }

  /**
   * Resolves ContributorIdentityParams to a RefUri.
   * Creates a contributorInformation record if CreateContributorInformationParams is provided.
   * @internal
   */
  private async resolveContributorIdentity(
    identity: ContributorIdentityParams,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<RefUri> {
    if (typeof identity === "string") {
      // we still store as contributorInformation since it can't directly be a string
      const result = await this.addContributorInformation({ identifier: identity });
      return { uri: result.uri, cid: result.cid, $type: "com.atproto.repo.strongRef" };
    } else if ("uri" in identity && "cid" in identity && !("identifier" in identity)) {
      // StrongRef to existing record
      return { $type: "com.atproto.repo.strongRef", uri: identity.uri as string, cid: identity.cid as string };
    } else if ("identifier" in identity) {
      // CreateContributorInformationParams - auto-create record
      try {
        this.emitProgress(onProgress, { name: "createContributorInformation", status: "start" });
        const { identifier, displayName, image, ...extraProps } = identity as {
          identifier: string;
          displayName?: string;
          image?: string | Blob;
          [key: string]: unknown;
        };

        // Handle image upload if it's a Blob
        let imageRef: BlobRef | string | undefined;
        if (image instanceof Blob) {
          const uploadResult = await this.uploadImageBlob(image, onProgress);
          imageRef = uploadResult;
        } else {
          imageRef = image;
        }

        const result = await this.addContributorInformation({
          identifier,
          displayName,
          image: imageRef,
          ...extraProps,
        });
        this.emitProgress(onProgress, {
          name: "createContributorInformation",
          status: "success",
          data: result,
        });
        return { $type: "com.atproto.repo.strongRef", uri: result.uri, cid: result.cid };
      } catch (error) {
        this.emitProgress(onProgress, {
          name: "createContributorInformation",
          status: "error",
          error: error as Error,
        });
        throw error;
      }
    }
    throw new ValidationError("Invalid contributorIdentity format");
  }

  /**
   * Builds contributor entries from parameters by resolving identities and details.
   *
   * This helper resolves contributor identities and contribution details,
   * creating records as needed, then assembles them into the contributor entry
   * format used in hypercert records.
   *
   * @param contributorParams - Array of contributor identity params (DID, StrongRef, or create params)
   * @param detailsParams - Contribution details (inline role, StrongRef, or create params)
   * @param weight - Optional contribution weight
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of contributor entries ready for embedding
   * @internal
   * @protected
   */
  protected async buildContributorEntries(
    contributorParams: Array<ContributorIdentityParams>,
    detailsParams: ContributionDetailsParams,
    weight?: string,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<
    Array<{
      contributorIdentity: RefUri;
      contributionWeight?: string;
      contributionDetails?: RefUri;
    }>
  > {
    const detailsRef = await this.resolveContributionDetails(detailsParams, onProgress);
    const resolvedIdentities = await Promise.all(
      contributorParams.map((identity) => this.resolveContributorIdentity(identity, onProgress)),
    );
    return resolvedIdentities.map((identity) => ({
      contributorIdentity: identity,
      contributionWeight: weight,
      contributionDetails: detailsRef,
    }));
  }

  /**
   * Attaches contributor entries to a hypercert by appending to its contributors array.
   *
   * Fetches the existing hypercert, merges new contributors with existing ones,
   * and updates the hypercert record.
   *
   * @param hypercertUri - URI of the hypercert to update
   * @param newContributors - Array of contributor entries to add
   * @returns Promise resolving to update result with new URI and CID
   * @throws {@link ValidationError} if URI format is invalid or validation fails
   * @throws {@link NetworkError} if fetching or updating fails
   * @internal
   * @protected
   */
  protected async attachContributorsToHypercert(
    hypercertUri: string,
    newContributors: Array<{
      contributorIdentity: RefUri;
      contributionWeight?: string;
      contributionDetails?: RefUri;
    }>,
  ): Promise<UpdateResult> {
    const existing = await this.get(hypercertUri);
    const existingContributors = existing.record.contributors || [];
    const updatedContributors = [...existingContributors, ...newContributors];

    return await this.update({
      uri: hypercertUri,
      updates: {
        contributors: updatedContributors,
      },
    });
  }

  /**
   * Adds contributors to an existing hypercert.
   *
   * This method creates or references contribution records and updates the hypercert
   * to include the new contributors in its contributors array.
   *
   * @param params - Contribution parameters
   * @returns Promise resolving to updated hypercert URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Add multiple contributors with inline role
   * ```typescript
   * await repo.hypercerts.addContribution({
   *   hypercertUri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
   *   contributors: ["did:plc:user1", "did:plc:user2"],
   *   contributionDetails: "Developer",
   *   weight: "1.0"
   * });
   * ```
   *
   * @example Add contributor with detailed contribution record
   * ```typescript
   * await repo.hypercerts.addContribution({
   *   hypercertUri: hypercertUri,
   *   contributors: [{
   *     identifier: "did:plc:coordinator",
   *     displayName: "Alice",
   *     image: avatarBlob
   *   }],
   *   contributionDetails: {
   *     role: "Project Coordinator",
   *     contributionDescription: "Led coordination efforts",
   *     startDate: "2024-01-01",
   *     endDate: "2024-06-30"
   *   },
   *   weight: "2.0"
   * });
   * ```
   */
  async addContribution(params: {
    hypercertUri: string;
    contributors: Array<ContributorIdentityParams>;
    contributionDetails: ContributionDetailsParams;
    weight?: string;
    onProgress?: (step: ProgressStep) => void;
  }): Promise<UpdateResult> {
    try {
      const newContributors = await this.buildContributorEntries(
        params.contributors,
        params.contributionDetails,
        params.weight,
        params.onProgress,
      );
      const result = await this.attachContributorsToHypercert(params.hypercertUri, newContributors);
      this.emit("contributionCreated", { uri: result.uri, cid: result.cid });

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to add contribution: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Creates a contributor information record.
   *
   * This creates a contributor profile record that can be referenced
   * from an activity's `contributors` array via a strong reference.
   *
   * @param params - Contributor parameters
   * @param params.identifier - DID or URI of the contributor
   * @param params.displayName - Display name of the contributor
   * @param params.image - Optional image URI or blob ref
   * @returns Promise resolving to contributor information record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addContributorInformation({
   *   identifier: "did:plc:contributor123",
   *   displayName: "Alice",
   * });
   * ```
   */
  async addContributorInformation(params: {
    identifier: string;
    displayName?: string;
    image?: BlobRef | string;
    [key: string]: unknown;
  }): Promise<CreateResult> {
    try {
      const createdAt = new Date().toISOString();
      const { identifier, displayName, image, ...extraProps } = params;

      // Resolve image to proper lexicon type if provided
      let resolvedImage: HypercertContributorInformation["image"];
      if (image) {
        if (typeof image === "string") {
          // URI string - wrap in typed object
          resolvedImage = { $type: "org.hypercerts.defs#uri", uri: image } as HypercertContributorInformation["image"];
        } else {
          // BlobRef from upload - wrap in smallImage
          resolvedImage = {
            $type: "org.hypercerts.defs#smallImage",
            image: image,
          } as HypercertContributorInformation["image"];
        }
      }

      const contributorRecord = {
        $type: HYPERCERT_COLLECTIONS.CONTRIBUTOR_INFORMATION,
        identifier,
        displayName,
        image: resolvedImage,
        createdAt,
        ...extraProps,
      } as HypercertContributorInformation;

      const validation = validate(contributorRecord, HYPERCERT_COLLECTIONS.CONTRIBUTOR_INFORMATION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid contributor information record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.CONTRIBUTOR_INFORMATION,
        record: contributorRecord as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create contributor information");
      }

      this.emit("contributorCreated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to add contributor information: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Creates a measurement record for a hypercert or other subject.
   *
   * Measurements quantify the impact claimed with specific metrics,
   * values, and units.
   *
   * @param params - Measurement parameters (see {@link CreateMeasurementParams})
   * @returns Promise resolving to measurement record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Basic measurement
   * ```typescript
   * await repo.hypercerts.addMeasurement({
   *   subject: hypercertUri,
   *   metric: "Carbon Offset",
   *   unit: "tons CO2e",
   *   value: "150",
   * });
   * ```
   *
   * @example Full measurement with all options
   * ```typescript
   * await repo.hypercerts.addMeasurement({
   *   subject: "at://...",
   *   metric: "Forest Area",
   *   unit: "hectares",
   *   value: "500",
   *   startDate: "2024-01-01T00:00:00Z",
   *   endDate: "2024-12-31T23:59:59Z",
   *   locations: [{ uri: "at://...", cid: "..." }],
   *   measurers: ["did:plc:auditor"],
   *   methodType: "satellite-imagery",
   *   methodURI: "https://example.com/methodology",
   *   evidenceURI: ["https://example.com/audit-report"],
   *   comment: "Verified via satellite imagery",
   * });
   * ```
   */
  async addMeasurement(params: CreateMeasurementParams): Promise<CreateResult> {
    try {
      const subject = await this.resolveToStrongRef(params.subject);
      const createdAt = new Date().toISOString();

      const locationRefs = await this.processLocations(params.locations);

      const measurementRecord: HypercertMeasurement = {
        $type: HYPERCERT_COLLECTIONS.MEASUREMENT,
        subject: { uri: subject.uri, cid: subject.cid },
        metric: params.metric,
        unit: params.unit,
        value: params.value,
        createdAt,
        startDate: params.startDate,
        endDate: params.endDate,
        locations: locationRefs,
        methodType: params.methodType,
        methodURI: params.methodURI,
        evidenceURI: params.evidenceURI,
        measurers: params.measurers,
        comment: params.comment,
        commentFacets: params.commentFacets,
      };

      const validation = validate(measurementRecord, HYPERCERT_COLLECTIONS.MEASUREMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid measurement record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.MEASUREMENT,
        record: measurementRecord,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create measurement");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to add measurement: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Updates a measurement record.
   *
   * Note: The `subject` field is immutable and cannot be changed after creation.
   *
   * @param uri - AT-URI of the measurement to update
   * @param updates - Fields to update (subject is excluded as it's immutable)
   * @returns Promise resolving to updated measurement URI and CID
   * @throws {@link ValidationError} if validation fails or URI format is invalid
   * @throws {@link NetworkError} if the measurement is not found or update fails
   *
   * @example Updating a measurement value
   * ```typescript
   * await repo.hypercerts.updateMeasurement(
   *   "at://did:plc:test/org.hypercerts.claim.measurement/xyz",
   *   { value: "200", comment: "Re-verified measurement" }
   * );
   * ```
   */
  async updateMeasurement(uri: string, updates: UpdateMeasurementParams): Promise<UpdateResult> {
    try {
      const { collection, rkey } = this.parseUri(uri);

      if (collection !== HYPERCERT_COLLECTIONS.MEASUREMENT) {
        throw new ValidationError(
          `URI must target a measurement collection. Expected '${HYPERCERT_COLLECTIONS.MEASUREMENT}', got '${collection}'`,
        );
      }

      const { record: existingRecord } = await this.fetchRecord<HypercertMeasurement>(uri);

      const recordForUpdate = await this.applyMeasurementUpdates(existingRecord, updates);

      const validation = validate(recordForUpdate, HYPERCERT_COLLECTIONS.MEASUREMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid measurement record: ${validation.error?.message}`);
      }

      const result = await this.saveRecord(collection, rkey, recordForUpdate);

      this.emit("measurementUpdated", { uri: result.uri, cid: result.cid });
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to update measurement: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Creates an evaluation record for a hypercert or other subject.
   *
   * Evaluations provide third-party assessments of impact claims.
   *
   * @param params - Evaluation parameters
   * @param params.subjectUri - AT-URI of the record being evaluated
   * @param params.evaluators - DIDs of evaluating entities
   * @param params.summary - Summary of the evaluation findings
   * @returns Promise resolving to evaluation record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addEvaluation({
   *   subjectUri: hypercertUri,
   *   evaluators: ["did:plc:evaluator-org"],
   *   summary: "Verified impact claims through site visit and data analysis",
   * });
   * ```
   */
  async addEvaluation(params: { subjectUri: string; evaluators: string[]; summary: string }): Promise<CreateResult> {
    try {
      const subject = await this.get(params.subjectUri);
      const createdAt = new Date().toISOString();

      const evaluationRecord: HypercertEvaluation = {
        $type: HYPERCERT_COLLECTIONS.EVALUATION,
        subject: { uri: subject.uri, cid: subject.cid },
        evaluators: params.evaluators.map((evaluator) => ({ did: evaluator })),
        summary: params.summary,
        createdAt,
      };

      const validation = validate(evaluationRecord, HYPERCERT_COLLECTIONS.EVALUATION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid evaluation record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.EVALUATION,
        record: evaluationRecord as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create evaluation");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to add evaluation: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Creates a collection of hypercerts.
   *
   * Collections group related hypercerts with optional weights
   * for relative importance. Collections can have visual branding
   * with avatar (icon/logo) and banner (cover) images.
   *
   * @param params - Collection parameters
   * @param params.title - Collection title
   * @param params.items - Array of hypercert references with weights
   * @param params.shortDescription - Optional short description
   * @param params.description - Optional full description
   * @param params.avatar - Optional avatar image (icon/logo) for the collection.
   *   Can be a Blob, URI string, or image record object. Recommended: square aspect ratio.
   * @param params.banner - Optional banner image (cover) for the collection.
   *   Can be a Blob, URI string, or image record object. Recommended: 3:1 aspect ratio.
   * @param params.location - Optional location reference or inline location data
   * @returns Promise resolving to collection record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Basic collection with items
   * ```typescript
   * const collection = await repo.hypercerts.createCollection({
   *   title: "Climate Projects 2024",
   *   shortDescription: "Our climate impact portfolio",
   *   items: [
   *     { itemIdentifier: { uri: hypercert1Uri, cid: hypercert1Cid }, itemWeight: "0.5" },
   *     { itemIdentifier: { uri: hypercert2Uri, cid: hypercert2Cid }, itemWeight: "0.3" },
   *     { itemIdentifier: { uri: hypercert3Uri, cid: hypercert3Cid }, itemWeight: "0.2" },
   *   ],
   * });
   * ```
   *
   * @example Collection with avatar and banner images
   * ```typescript
   * const collection = await repo.hypercerts.createCollection({
   *   title: "Reforestation Initiative",
   *   shortDescription: "Tree planting projects worldwide",
   *   description: "A collection of verified reforestation hypercerts...",
   *   avatar: logoBlob,    // Square icon/logo image
   *   banner: coverBlob,   // Wide cover/banner image
   *   items: [...],
   * });
   * ```
   *
   * @example Collection with location
   * ```typescript
   * const collection = await repo.hypercerts.createCollection({
   *   title: "Amazon Basin Projects",
   *   items: [...],
   *   location: { value: "Amazon Rainforest, Brazil", name: "Amazon Basin" },
   * });
   * ```
   */
  async createCollection(params: CreateCollectionParams): Promise<CreateCollectionResult> {
    const createdAt = new Date().toISOString();

    let locationResult: { uri: string; cid: string } | undefined;

    const collectionRecord: HypercertCollection = {
      $type: HYPERCERT_COLLECTIONS.COLLECTION,
      title: params.title,
      items: [],
      createdAt,
    };

    if (params.type) {
      collectionRecord.type = params.type;
    }

    if (params.shortDescription) {
      collectionRecord.shortDescription = params.shortDescription;
    }

    if (params.description) {
      collectionRecord.description = params.description;
    }

    if (params.avatar) {
      collectionRecord.avatar = await this.resolveCollectionImageInput(params.avatar);
    }

    if (params.banner) {
      collectionRecord.banner = await this.resolveCollectionImageInput(params.banner, true);
    }

    if (params.items !== undefined) {
      collectionRecord.items = params.items;
    }

    if (params.location) {
      locationResult = await this.resolveLocation(params.location);
      collectionRecord.location = locationResult;
    }

    const validation = validate(collectionRecord, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
    if (!validation.success) {
      throw new ValidationError(`Invalid collection record: ${validation.error?.message}`);
    }

    const result = await this.agent.com.atproto.repo.createRecord({
      repo: this.repoDid,
      collection: HYPERCERT_COLLECTIONS.COLLECTION,
      record: collectionRecord,
    });

    if (!result.success) {
      throw new NetworkError("Failed to create collection");
    }

    const createCollectionResult: CreateCollectionResult = {
      uri: result.data.uri,
      cid: result.data.cid,
      record: collectionRecord,
      locationUri: locationResult?.uri,
    };
    this.emit("collectionCreated", createCollectionResult);
    return createCollectionResult;
  }

  /**
   * Gets a collection by its AT-URI.
   *
   * @param uri - AT-URI of the collection
   * @returns Promise resolving to collection URI, CID, and parsed record
   * @throws {@link ValidationError} if the URI format is invalid or record doesn't match schema
   * @throws {@link NetworkError} if the record cannot be fetched
   *
   * @example
   * ```typescript
   * const { record } = await repo.hypercerts.getCollection(collectionUri);
   * console.log(`Collection: ${record.title}`);
   * console.log(`Contains ${record.claims.length} hypercerts`);
   * ```
   */
  async getCollection(uri: string): Promise<{ uri: string; cid: string; record: HypercertCollection }> {
    try {
      const { uri: resultUri, cid, record } = await this.fetchRecord<HypercertCollection>(uri);

      // Validate with lexicon registry (more lenient - doesn't require $type)
      const validation = validate(record, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid collection record format: ${validation.error?.message}`);
      }

      return { uri: resultUri, cid, record };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get collection: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Lists collections in the repository with pagination.
   *
   * @param params - Optional pagination parameters
   * @returns Promise resolving to paginated list of collections
   * @throws {@link NetworkError} if the list operation fails
   * * @example
   * ```typescript
   * const { records } = await repo.hypercerts.listCollections();
   * for (const { record } of records) {
   *   console.log(`${record.title}: ${record.claims.length} claims`);
   * }
   * ```
   */
  async listCollections(
    params?: ListParams,
  ): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertCollection }>> {
    try {
      const result = await this.agent.com.atproto.repo.listRecords({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.COLLECTION,
        limit: params?.limit,
        cursor: params?.cursor,
      });

      if (!result.success) {
        throw new NetworkError("Failed to list collections");
      }

      return {
        records:
          result.data.records?.map((r) => ({
            uri: r.uri,
            cid: r.cid,
            record: r.value as HypercertCollection,
          })) || [],
        cursor: result.data.cursor ?? undefined,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to list collections: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Creates a new project that organizes multiple hypercert activities.
   *
   * A project is a collection with type='project' and optional location sidecar.
   * This method delegates to createCollection and adds the type field.
   *
   * @param params - Project creation parameters
   * @returns Promise resolving to created project URI and CID with optional location URI
   *
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Basic project with items
   * ```typescript
   * const result = await repo.hypercerts.createProject({
   *   title: "Climate Impact 2024",
   *   shortDescription: "Year-long climate initiative",
   *   items: [
   *     { itemIdentifier: { uri: activity1Uri, cid: activity1Cid }, itemWeight: "0.6" },
   *     { itemIdentifier: { uri: activity2Uri, cid: activity2Cid }, itemWeight: "0.4" }
   *   ]
   * });
   * console.log(`Created project: ${result.uri}`);
   * ```
   *
   * @example Project with avatar and banner
   * ```typescript
   * const result = await repo.hypercerts.createProject({
   *   title: "Ocean Cleanup Initiative",
   *   shortDescription: "Removing plastic from oceans",
   *   avatar: logoBlob,    // Square icon/logo for the project
   *   banner: coverBlob,   // Wide cover/banner image
   *   items: [...],
   * });
   * ```
   *
   * @example Project with location
   * ```typescript
   * const result = await repo.hypercerts.createProject({
   *   title: "Amazon Reforestation",
   *   items: [...],
   *   location: { value: "Amazon Basin, Brazil", name: "Amazon Rainforest" },
   * });
   * ```
   */
  async createProject(params: CreateProjectParams): Promise<CreateProjectResult> {
    const result = await this.createCollection({
      ...params,
      type: "project",
    });

    this.emit("projectCreated", { uri: result.uri, cid: result.cid });
    return result;
  }

  /**
   * Gets a project by its AT-URI.
   *
   * Projects are collections with `type='project'`.
   *
   * @param uri - AT-URI of the project
   * @returns Promise resolving to project data (as collection)
   *
   * @example
   * ```typescript
   * const { record } = await repo.hypercerts.getProject(projectUri);
   * console.log(`${record.title}: ${record.items?.length || 0} activities`);
   * ```
   */
  async getProject(uri: string): Promise<{ uri: string; cid: string; record: HypercertCollection }> {
    try {
      const { uri: resultUri, cid, record } = await this.fetchRecord<HypercertCollection>(uri);

      // Validate as collection
      const validation = validate(record, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid project record format: ${validation.error?.message}`);
      }

      // Verify it's actually a project (collection with type='project')
      if (record.type !== "project") {
        throw new ValidationError(`Record is not a project (type='${record.type}')`);
      }

      return { uri: resultUri, cid, record };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get project: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Lists all projects with optional pagination.
   *
   * Projects are collections with `type='project'`. This method filters
   * collections to only return those with type='project'.
   *
   * @param params - Optional pagination parameters
   * @returns Promise resolving to paginated list of projects
   *
   * @example
   * ```typescript
   * const { records } = await repo.hypercerts.listProjects();
   * for (const { record } of records) {
   *   console.log(`${record.title}: ${record.shortDescription}`);
   * }
   * ```
   */
  async listProjects(
    params?: ListParams,
  ): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertCollection }>> {
    try {
      const limit = params?.limit;
      let cursor = params?.cursor;
      const allRecords: Array<{ uri: string; cid: string; record: HypercertCollection }> = [];

      // Loop-fetch until we have enough projects or no more cursor
      while (!cursor || allRecords.length < (limit ?? Infinity)) {
        const result = await this.agent.com.atproto.repo.listRecords({
          repo: this.repoDid,
          collection: HYPERCERT_COLLECTIONS.COLLECTION,
          limit: limit ?? 50,
          cursor,
        });

        if (!result.success) {
          throw new NetworkError("Failed to list projects");
        }

        // Filter and collect project records
        for (const r of result.data.records ?? []) {
          const record = r.value as HypercertCollection;
          if (record.type === "project") {
            allRecords.push({ uri: r.uri, cid: r.cid, record });
          }
          // Stop if we've collected enough
          if (limit && allRecords.length >= limit) break;
        }

        // Update cursor; break if no more pages
        cursor = result.data.cursor;
        if (!cursor) break;
      }

      return { records: allRecords, cursor };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to list projects: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Updates an existing project.
   *
   * A project is a collection with type='project'. This method delegates to
   * updateCollection after verifying the record is a project.
   *
   * @param uri - AT-URI of the project to update
   * @param updates - Fields to update (partial)
   * @returns Promise resolving to updated project URI and CID
   *
   * @throws {@link ValidationError} if the URI format is invalid or record is not a project
   * @throws {@link NetworkError} if the project is not found or update fails
   *
   * @example Basic update
   * ```typescript
   * const result = await repo.hypercerts.updateProject(projectUri, {
   *   title: "Updated Project Title",
   *   shortDescription: "New description",
   * });
   * ```
   *
   * @example Update avatar and banner images
   * ```typescript
   * const result = await repo.hypercerts.updateProject(projectUri, {
   *   avatar: newLogoBlob,   // Square icon/logo image
   *   banner: newCoverBlob,  // Wide cover/banner image
   * });
   * ```
   */
  async updateProject(uri: string, updates: UpdateProjectParams): Promise<UpdateResult> {
    // Verify it's a project before updating
    const fetchResult = await this.fetchRecord<HypercertCollection>(uri);

    if (fetchResult.record.type !== "project") {
      throw new ValidationError(`Record is not a project (type='${fetchResult.record.type}')`);
    }

    // Pass pre-fetched record to avoid a second fetch in updateCollectionRecord
    const result = await this.updateCollectionRecord(fetchResult, updates);

    this.emit("projectUpdated", { uri: result.uri, cid: result.cid });
    return result;
  }

  /**
   * Deletes a project.
   *
   * A project is a collection with type='project'. This method delegates to
   * deleteCollection after verifying the record is a project.
   *
   * @param uri - AT-URI of the project to delete
   *
   * @example
   * ```typescript
   * await repo.hypercerts.deleteProject(projectUri);
   * console.log("Project deleted");
   * ```
   */
  async deleteProject(uri: string): Promise<void> {
    const { record } = await this.fetchRecord<HypercertCollection>(uri);

    if (record.type !== "project") {
      throw new ValidationError(`Record is not a project (type='${record.type}')`);
    }

    await this.deleteCollection(uri);
    this.emit("projectDeleted", { uri });
  }

  /**
   * Updates a collection.
   *
   * Performs a partial update on an existing collection, merging the provided
   * updates with the existing record. Only specified fields are updated; omitted
   * fields retain their current values.
   *
   * **Note:** The collection `type` field cannot be changed after creation.
   *
   * @param uri - AT-URI of the collection to update
   * @param updates - Fields to update (partial)
   * @returns Promise resolving to updated collection URI and CID
   *
   * @throws {@link ValidationError} if the URI format is invalid or type change attempted
   * @throws {@link NetworkError} if the collection is not found or update fails
   *
   * @example Basic update
   * ```typescript
   * const result = await repo.hypercerts.updateCollection(collectionUri, {
   *   title: "Updated Collection Title",
   *   shortDescription: "New description for the collection",
   * });
   * ```
   *
   * @example Update avatar and banner images
   * ```typescript
   * const result = await repo.hypercerts.updateCollection(collectionUri, {
   *   avatar: newLogoBlob,   // Square icon/logo image
   *   banner: newCoverBlob,  // Wide cover/banner image
   * });
   * ```
   *
   * @example Add location to existing collection
   * ```typescript
   * const result = await repo.hypercerts.updateCollection(collectionUri, {
   *   location: { value: "Berlin, Germany", name: "Berlin HQ" },
   * });
   * ```
   */
  async updateCollection(uri: string, updates: UpdateCollectionParams): Promise<UpdateResult> {
    const fetchResult = await this.fetchRecord<HypercertCollection>(uri);
    const result = await this.updateCollectionRecord(fetchResult, updates);
    this.emit("collectionUpdated", { uri: result.uri, cid: result.cid });
    return result;
  }

  /**
   * Core collection update logic operating on a pre-fetched record.
   *
   * Extracted so that callers like {@link updateProject} can fetch once,
   * validate the type, and then delegate here without a redundant fetch.
   *
   * @param fetchResult - The pre-fetched record, collection, and rkey
   * @param updates - Fields to update (partial)
   * @returns Promise resolving to updated URI and CID
   * @internal
   */
  private async updateCollectionRecord(
    fetchResult: { record: HypercertCollection; collection: string; rkey: string },
    updates: UpdateCollectionParams,
  ): Promise<UpdateResult> {
    try {
      const { record: existingRecord, collection, rkey } = fetchResult;

      const recordForUpdate: Record<string, unknown> = {
        ...existingRecord,
        createdAt: existingRecord.createdAt,
        type: existingRecord.type,
      };

      if (updates.title !== undefined) recordForUpdate.title = updates.title;
      if (updates.shortDescription !== undefined) recordForUpdate.shortDescription = updates.shortDescription;
      if (updates.description !== undefined) recordForUpdate.description = updates.description;

      // Explicitly reject type changes
      if (updates.type !== undefined && updates.type !== existingRecord.type) {
        throw new ValidationError(`Cannot change collection type from '${existingRecord.type}' to '${updates.type}'`);
      }

      delete (recordForUpdate as { avatar?: unknown }).avatar;
      if (updates.avatar !== undefined) {
        if (updates.avatar === null) {
          // Remove avatar
        } else {
          recordForUpdate.avatar = await this.resolveCollectionImageInput(updates.avatar);
        }
      } else if (existingRecord.avatar) {
        recordForUpdate.avatar = existingRecord.avatar;
      }

      delete (recordForUpdate as { banner?: unknown }).banner;
      if (updates.banner !== undefined) {
        if (updates.banner === null) {
          // Remove banner
        } else {
          recordForUpdate.banner = await this.resolveCollectionImageInput(updates.banner, true);
        }
      } else if (existingRecord.banner) {
        recordForUpdate.banner = existingRecord.banner;
      }

      delete (recordForUpdate as { location?: unknown }).location;
      if (updates.location !== undefined) {
        if (updates.location === null) {
          // Remove location
        } else {
          const resolvedLocation = await this.resolveLocation(updates.location);
          if (!resolvedLocation) {
            throw new ValidationError("resolveLocation: failed to resolve location");
          }
          recordForUpdate.location = resolvedLocation;
        }
      } else if (existingRecord.location) {
        recordForUpdate.location = existingRecord.location;
      }

      if (updates.items) {
        recordForUpdate.items = updates.items;
      } else if (existingRecord.items) {
        recordForUpdate.items = existingRecord.items;
      }

      const validation = validate(recordForUpdate, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid collection record: ${validation.error?.message}`);
      }

      const result = await this.saveRecord(collection, rkey, recordForUpdate);
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to update collection: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Deletes a collection.
   *
   * @param uri - AT-URI of the collection to delete
   */
  async deleteCollection(uri: string): Promise<void> {
    try {
      const { collection, rkey } = this.parseUri(uri);

      const result = await this.agent.com.atproto.repo.deleteRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to delete collection");
      }

      this.emit("collectionDeleted", { uri });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to delete collection: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Attaches a location to a collection.
   *
   * @param uri - AT-URI of the collection
   * @param location - Location data
   * @returns Promise resolving to location record result
   */
  async attachLocationToCollection(uri: string, location: LocationParams): Promise<CreateResult> {
    try {
      const { record, collection, rkey } = await this.fetchRecord<HypercertCollection>(uri);

      const resolvedLocation = await this.resolveLocation(location);
      if (!resolvedLocation) {
        throw new ValidationError("attachLocationToCollection: failed to resolve location");
      }

      const recordForUpdate: Record<string, unknown> = {
        ...record,
        location: resolvedLocation,
      };

      await this.saveRecord(collection, rkey, recordForUpdate);

      this.emit("locationAttachedToCollection", {
        uri: resolvedLocation.uri,
        cid: resolvedLocation.cid,
        collectionUri: uri,
      });
      return { uri: resolvedLocation.uri, cid: resolvedLocation.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to attach location: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Removes a location from a collection.
   *
   * @param uri - AT-URI of the collection
   */
  async removeLocationFromCollection(uri: string): Promise<void> {
    try {
      const { record, collection, rkey } = await this.fetchRecord<HypercertCollection>(uri);

      const recordForUpdate = { ...record } as Record<string, unknown>;
      delete (recordForUpdate as { location?: unknown }).location;

      await this.saveRecord(collection, rkey, recordForUpdate);

      this.emit("locationRemovedFromCollection", { collectionUri: uri });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to remove location: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Attaches a location to a project.
   *
   * @param uri - AT-URI of the project
   * @param location - Location data
   * @returns Promise resolving to location record result
   */
  async attachLocationToProject(uri: string, location: LocationParams): Promise<CreateResult> {
    // Validate it's actually a project
    await this.getProject(uri);

    const result = await this.attachLocationToCollection(uri, location);
    this.emit("locationAttachedToProject", {
      uri: result.uri,
      cid: result.cid,
      projectUri: uri,
    });
    return result;
  }

  /**
   * Removes a location from a project.
   *
   * @param uri - AT-URI of the project
   */
  async removeLocationFromProject(uri: string): Promise<void> {
    // Validate it's actually a project
    await this.getProject(uri);

    await this.removeLocationFromCollection(uri);
    this.emit("locationRemovedFromProject", { projectUri: uri });
  }

  // ============================================================================
  // Acknowledgement Operations
  // ============================================================================

  /**
   * Creates an acknowledgement record.
   *
   * An acknowledgement records a user's explicit decision to acknowledge
   * or reject the inclusion of a `subject` record within a `context` record
   * (e.g., acknowledging that an activity belongs to a collection).
   *
   * @param params - Acknowledgement parameters (see {@link CreateAcknowledgementParams})
   * @returns Promise resolving to acknowledgement record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example Acknowledge inclusion
   * ```typescript
   * await repo.hypercerts.createAcknowledgement({
   *   subject: { uri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz", cid: "bafyrei..." },
   *   context: { uri: "at://did:plc:abc/org.hypercerts.claim.collection/col", cid: "bafyrei..." },
   *   acknowledged: true,
   *   comment: "Confirmed participation in this collection.",
   * });
   * ```
   *
   * @example Reject inclusion
   * ```typescript
   * await repo.hypercerts.createAcknowledgement({
   *   subject: { uri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz", cid: "bafyrei..." },
   *   context: { uri: "at://did:plc:abc/org.hypercerts.claim.collection/col", cid: "bafyrei..." },
   *   acknowledged: false,
   *   comment: "Did not participate in this project.",
   * });
   * ```
   */
  async createAcknowledgement(params: CreateAcknowledgementParams): Promise<CreateResult> {
    try {
      const createdAt = params.createdAt ?? new Date().toISOString();

      const record: HypercertAcknowledgement = {
        ...params,
        $type: params.$type ?? HYPERCERT_COLLECTIONS.ACKNOWLEDGEMENT,
        createdAt,
      };

      const validation = validate(record, HYPERCERT_COLLECTIONS.ACKNOWLEDGEMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid acknowledgement record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.ACKNOWLEDGEMENT,
        record: record as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create acknowledgement");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to create acknowledgement: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Gets an acknowledgement record by AT-URI.
   *
   * @param uri - AT-URI of the acknowledgement record
   * @returns Promise resolving to the acknowledgement record, or null if not found
   * @throws {@link ValidationError} if the URI format is invalid
   * @throws {@link NetworkError} if the fetch fails for reasons other than not-found
   *
   * @example
   * ```typescript
   * const ack = await repo.hypercerts.getAcknowledgement(ackUri);
   * if (ack) {
   *   console.log(`Acknowledged: ${ack.acknowledged}`);
   * }
   * ```
   */
  async getAcknowledgement(uri: string): Promise<HypercertAcknowledgement | null> {
    try {
      const { record } = await this.fetchRecord<HypercertAcknowledgement>(uri);
      return record;
    } catch (error) {
      // Return null for not-found errors to match the interface contract
      if (error instanceof NetworkError) {
        return null;
      }
      if (error instanceof ValidationError) throw error;
      throw new NetworkError(
        `Failed to get acknowledgement: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Updates an existing acknowledgement record.
   *
   * @param uri - AT-URI of the acknowledgement to update
   * @param updates - Fields to update (partial)
   * @returns Promise resolving to updated acknowledgement URI and CID
   * @throws {@link ValidationError} if validation fails or URI format is invalid
   * @throws {@link NetworkError} if the record is not found or update fails
   *
   * @example Change the decision
   * ```typescript
   * await repo.hypercerts.updateAcknowledgement(ackUri, {
   *   acknowledged: true,
   *   comment: "On reflection, participation is confirmed.",
   * });
   * ```
   */
  async updateAcknowledgement(uri: string, updates: UpdateAcknowledgementParams): Promise<UpdateResult> {
    try {
      const { record: existingRecord, collection, rkey } = await this.fetchRecord<HypercertAcknowledgement>(uri);

      const recordForUpdate: HypercertAcknowledgement = {
        ...existingRecord,
        ...updates,
        // Preserve immutable fields
        $type: existingRecord.$type,
        createdAt: existingRecord.createdAt,
        subject: existingRecord.subject,
        context: existingRecord.context,
      };

      const validation = validate(recordForUpdate, HYPERCERT_COLLECTIONS.ACKNOWLEDGEMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid acknowledgement record: ${validation.error?.message}`);
      }

      return await this.saveRecord(collection, rkey, recordForUpdate as Record<string, unknown>);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to update acknowledgement: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Deletes an acknowledgement record.
   *
   * @param uri - AT-URI of the acknowledgement to delete
   * @throws {@link ValidationError} if the URI format is invalid
   * @throws {@link NetworkError} if the deletion fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.deleteAcknowledgement(ackUri);
   * ```
   */
  async deleteAcknowledgement(uri: string): Promise<void> {
    try {
      const { collection, rkey } = this.parseUri(uri);

      const result = await this.agent.com.atproto.repo.deleteRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to delete acknowledgement");
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to delete acknowledgement: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Creates an app.certified.location record.
   *
   * The `location` field in the params accepts multiple formats:
   * - **Simple string** - Free-form text like "New York, NY, USA" (wrapped in URI ref)
   * - **URL string** - External location data like "https://example.com/location.geojson"
   * - **Blob** - Binary data (e.g., GeoJSON file) that will be uploaded
   * - **Structured object** - Full lexicon-defined location object
   *
   * @param location - Location parameters (see {@link CreateLocationParams})
   * @returns Promise resolving to StrongRef with location record URI and CID
   *
   * @example Simple text location
   * ```typescript
   * const ref = await this.createLocationRecord({
   *   lpVersion: "1.0.0",
   *   srs: "EPSG:4326",
   *   locationType: "coordinate-decimal",
   *   location: "San Francisco, CA, USA",  // Wrapped in URI ref
   *   name: "Project Site",
   * });
   * ```
   *
   * @example GeoJSON blob upload
   * ```typescript
   * const geojsonBlob = new Blob([JSON.stringify(geojson)], { type: "application/geo+json" });
   * const ref = await this.createLocationRecord({
   *   lpVersion: "1.0.0",
   *   srs: "EPSG:4326",
   *   locationType: "geojson",
   *   location: geojsonBlob,  // Uploaded and stored as blob ref
   *   name: "Protected Area",
   * });
   * ```
   *
   * @internal
   */
  private async createLocationRecord(location: CreateLocationParams): Promise<StrongRef> {
    if (!location.srs) {
      throw new ValidationError(
        "srs (Spatial Reference System) is required. Example: 'EPSG:4326' for WGS84 coordinates, or 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' for CRS84.",
      );
    }

    const { $type, createdAt, location: locationValue, lpVersion, ...rest } = location;
    if (locationValue === undefined) {
      throw new ValidationError("location is required to create a location record.");
    }
    const resolvedLocationValue = await this.resolveLocationValue(locationValue);

    const locationRecord: HypercertLocation = {
      ...rest,
      lpVersion: lpVersion ?? "1.0",
      $type: $type ?? HYPERCERT_COLLECTIONS.LOCATION,
      createdAt: createdAt ?? new Date().toISOString(),
      location: resolvedLocationValue,
    };

    const validation = validate(locationRecord, HYPERCERT_COLLECTIONS.LOCATION, "main", false);
    if (!validation.success) {
      throw new ValidationError(`Invalid location record: ${validation.error?.message}`);
    }

    const result = await this.agent.com.atproto.repo.createRecord({
      repo: this.repoDid,
      collection: HYPERCERT_COLLECTIONS.LOCATION,
      record: locationRecord,
    });

    if (!result.success) {
      throw new NetworkError("Failed to create location record");
    }

    return { uri: result.data.uri, cid: result.data.cid };
  }
}
