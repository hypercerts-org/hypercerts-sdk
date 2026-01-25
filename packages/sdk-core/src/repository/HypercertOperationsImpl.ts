/**
 * HypercertOperationsImpl - High-level hypercert operations.
 *
 * This module provides the implementation for creating and managing
 * hypercerts, including related records like rights, locations,
 * contributions, measurements, and evaluations.
 *
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { validate } from "@hypercerts-org/lexicon";
import { EventEmitter } from "eventemitter3";
import { NetworkError, ValidationError } from "../errors.js";
import type { LoggerInterface } from "../core/interfaces.js";
import {
  HYPERCERT_COLLECTIONS,
  type CreateCollectionParams,
  type CreateCollectionResult,
  type CreateProjectParams,
  type CreateProjectResult,
  type HypercertClaim,
  type HypercertCollection,
  type HypercertContributionDetails,
  type HypercertContributorInformation,
  type HypercertEvaluation,
  type HypercertAttachment,
  type HypercertLocation,
  type CreateLocationParams,
  type HypercertMeasurement,
  type HypercertRights,
  type JsonBlobRef,
  type OrgHypercertsDefs,
  type StrongRef,
  type UpdateCollectionParams,
  type UpdateProjectParams,
  type CreateMeasurementParams,
  type UpdateMeasurementParams,
  type CreateAttachmentParams,
} from "../services/hypercerts/types.js";
import type {
  BlobOperations,
  LocationParams,
  CreateHypercertParams,
  CreateHypercertResult,
  HypercertEvents,
  HypercertOperations,
  ContributionDetailsParams,
  ResolvedContributionDetails,
  ContributorIdentityParams,
  ResolvedContributorIdentity,
} from "./interfaces.js";
import type { CreateResult, ListParams, PaginatedList, ProgressStep, UpdateResult } from "./types.js";
import { uploadResultToBlobRef } from "./types.js";
import { $Typed } from "@atproto/api";
import { sha256Hash } from "../lib/crypto.js";

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
   * Converts a blob upload result to JsonBlobRef format.
   *
   * @param uploadResult - Result from BlobOperations.upload()
   * @returns JsonBlobRef formatted for records
   * @internal
   */
  private blobToJsonRef(uploadResult: { ref: { $link: string }; mimeType: string; size: number }): JsonBlobRef {
    return uploadResultToBlobRef(uploadResult);
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
  private async uploadImageBlob(
    image: Blob,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<JsonBlobRef | undefined> {
    this.emitProgress(onProgress, { name: "uploadImage", status: "start" });
    try {
      const uploadResult = await this.blobs.upload(image);
      this.emitProgress(onProgress, {
        name: "uploadImage",
        status: "success",
        data: { size: image.size },
      });
      return this.blobToJsonRef(uploadResult);
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
    imageBlobRef: JsonBlobRef | undefined,
    locationRefs: Array<{ uri: string; cid: string }> | undefined,
    contributorsData:
      | Array<{
          contributorIdentity: ResolvedContributorIdentity;
          contributionWeight?: string;
          contributionDetails?: ResolvedContributionDetails;
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
      hypercertRecord.image = imageBlobRef;
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
      // Image: extract CID string from blob ref (stable content hash)
      // JsonBlobRef can have ref.$link (upload result) or cid (existing record)
      imageRef: imageBlobRef
        ? "ref" in imageBlobRef && imageBlobRef.ref
          ? imageBlobRef.ref.$link
          : "cid" in imageBlobRef
            ? imageBlobRef.cid
            : undefined
        : undefined,
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
   * Creates contribution records with progress tracking.
   *
   * @param hypercertUri - URI of the hypercert
   * @param contributions - Array of contribution data
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of contribution URIs
   * @internal
   */
  private async createContributionsWithProgress(
    hypercertUri: string,
    contributions: Array<{
      contributors: Array<string | { uri: string; cid: string }>;
      role: string;
      description?: string;
      weight?: string;
    }>,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<string[]> {
    this.emitProgress(onProgress, { name: "createContributions", status: "start" });
    try {
      const contributionUris: string[] = [];
      for (const contrib of contributions) {
        const contribResult = await this.addContribution({
          hypercertUri,
          contributors: contrib.contributors.filter((c): c is string => typeof c === "string"),
          role: contrib.role,
          description: contrib.description,
        });
        contributionUris.push(contribResult.uri);
      }
      this.emitProgress(onProgress, {
        name: "createContributions",
        status: "success",
        data: { count: contributionUris.length },
      });
      return contributionUris;
    } catch (error) {
      this.emitProgress(onProgress, { name: "createContributions", status: "error", error: error as Error });
      this.logger?.warn(`Failed to create contributions: ${error instanceof Error ? error.message : "Unknown"}`);
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
  async update(params: {
    uri: string;
    updates: Partial<CreateHypercertParams>;
    image?: Blob | null;
  }): Promise<UpdateResult> {
    try {
      const uriMatch = params.uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${params.uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      // The existing record comes from ATProto, use it directly
      // TypeScript ensures type safety through the HypercertClaim interface
      const existingRecord = existing.data.value as HypercertClaim;

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
          recordForUpdate.image = this.blobToJsonRef(uploadResult);
        }
      } else if (existingRecord.image) {
        // Preserve existing image
        recordForUpdate.image = existingRecord.image;
      }

      const validation = validate(recordForUpdate, collection, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid hypercert record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: recordForUpdate,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update hypercert");
      }

      this.emit("recordUpdated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const result = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to get hypercert");
      }

      return {
        uri: result.data.uri,
        cid: result.data.cid ?? "",
        record: result.data.value as HypercertClaim,
      };
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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

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

    // Otherwise it's string | StrongRef, resolve to StrongRef
    return this.resolveToStrongRef(location);
  }

  private async resolveStrongRefFromUri(uri: string): Promise<StrongRef> {
    const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!uriMatch) {
      throw new ValidationError(`Invalid AT-URI format: "${uri}"`);
    }

    const [, repo, collection, rkey] = uriMatch;
    const record = await this.agent.com.atproto.repo.getRecord({ repo, collection, rkey });
    if (!record.success) {
      throw new NetworkError(`Failed to fetch record for repo=${repo}, collection=${collection}, rkey=${rkey}`);
    }
    if (!record.data.cid) {
      throw new NetworkError(`Record missing CID for repo=${repo}, collection=${collection}, rkey=${rkey}`);
    }

    return { $type: "com.atproto.repo.strongRef" as const, uri, cid: record.data.cid };
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
  private async resolveToStrongRef(input: string | StrongRef): Promise<StrongRef> {
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
  private async resolveAttachmentSubjects(
    subjectsInput: string | StrongRef | Array<string | StrongRef>,
  ): Promise<StrongRef[]> {
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
   * @throws {@link NetworkError} if blob upload fails
   * @internal
   */
  private async resolveAttachmentContent(contentInput: string | Blob | Array<string | Blob>) {
    const contentArray = Array.isArray(contentInput) ? contentInput : [contentInput];

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
        contributorIdentity: ResolvedContributorIdentity;
        contributionWeight?: string;
        contributionDetails?: ResolvedContributionDetails;
      }>
    | undefined
  > {
    if (!contributions || contributions.length === 0) return undefined;

    const contributorsPromises = contributions.map(async (contrib) => {
      // Resolve contributionDetails
      const detailsRef = await this.resolveContributionDetails(contrib.contributionDetails, onProgress);

      // Resolve each contributor identity
      const resolvedContributors = await Promise.all(
        contrib.contributors.map((identity) => this.resolveContributorIdentity(identity, onProgress)),
      );

      // Expand to one entry per contributor
      return resolvedContributors.map((identity) => ({
        contributorIdentity: identity,
        contributionWeight: contrib.weight,
        contributionDetails: detailsRef,
      }));
    });

    const nestedContributors = await Promise.all(contributorsPromises);
    return nestedContributors.flat();
  }

  /**
   * Resolves ContributionDetailsParams to a ResolvedContributionDetails.
   * Creates a record if CreateContributionDetailsParams is provided.
   * @internal
   */
  private async resolveContributionDetails(
    details: ContributionDetailsParams,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<ResolvedContributionDetails> {
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
        const { role, contributionDescription, startDate, endDate, ...extraProps } = details as {
          role: string;
          contributionDescription?: string;
          startDate?: string;
          endDate?: string;
          [key: string]: unknown;
        };
        const result = await this.addContribution({
          role,
          description: contributionDescription,
          startDate,
          endDate,
          ...extraProps,
        });
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
   * Resolves ContributorIdentityParams to a ResolvedContributorIdentity.
   * Creates a contributorInformation record if CreateContributorInformationParams is provided.
   * @internal
   */
  private async resolveContributorIdentity(
    identity: ContributorIdentityParams,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<ResolvedContributorIdentity> {
    if (typeof identity === "string") {
      // we still store as contribtorInformation since it cant directly be a string
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
        let imageRef: JsonBlobRef | string | undefined;
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
   * Creates a contribution details record.
   *
   * This creates a standalone contribution details record that can be referenced
   * from an activity's `contributors` array via a strong reference.
   *
   * @param params - Contribution parameters
   * @param params.hypercertUri - Optional hypercert (unused, kept for backward compatibility)
   * @param params.contributors - Array of contributor DIDs (unused, kept for backward compatibility)
   * @param params.role - Role of the contributor (e.g., "coordinator", "implementer")
   * @param params.description - Optional description of the contribution
   * @returns Promise resolving to contribution details record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @remarks
   * In the new lexicon structure, contributions are stored differently:
   * - Use `contributionDetails` for detailed contribution records (role, description, timeframe)
   * - Use `contributorInformation` for contributor profiles (identifier, displayName, image)
   * - Reference these from the activity's `contributors` array using strong refs
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addContribution({
   *   role: "implementer",
   *   description: "On-ground implementation team",
   * });
   * ```
   */
  async addContribution(params: {
    hypercertUri?: string;
    contributors?: string[];
    role: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  }): Promise<CreateResult> {
    try {
      const createdAt = new Date().toISOString();
      // Extract known fields, spread the rest
      const {
        hypercertUri: _hypercertUri,
        contributors: _contributors,
        role,
        description,
        startDate,
        endDate,
        ...extraProps
      } = params;
      const contributionRecord: HypercertContributionDetails = {
        $type: HYPERCERT_COLLECTIONS.CONTRIBUTION_DETAILS,
        role,
        createdAt,
        contributionDescription: description,
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

      this.emit("contributionCreated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
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
    image?: JsonBlobRef | string;
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
          // JsonBlobRef from upload - wrap in smallImage
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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      if (collection !== HYPERCERT_COLLECTIONS.MEASUREMENT) {
        throw new ValidationError(
          `URI must target a measurement collection. Expected '${HYPERCERT_COLLECTIONS.MEASUREMENT}', got '${collection}'`,
        );
      }

      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!existing.success) {
        throw new NetworkError(`Measurement not found: ${uri}`);
      }

      const recordForUpdate = await this.applyMeasurementUpdates(existing.data.value as HypercertMeasurement, updates);

      const validation = validate(recordForUpdate, HYPERCERT_COLLECTIONS.MEASUREMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid measurement record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: recordForUpdate,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update measurement");
      }

      this.emit("measurementUpdated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
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
        evaluators: params.evaluators,
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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const result = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to get collection");
      }

      // Validate with lexicon registry (more lenient - doesn't require $type)
      const validation = validate(result.data.value, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid collection record format: ${validation.error?.message}`);
      }

      return {
        uri: result.data.uri,
        cid: result.data.cid ?? "",
        record: result.data.value as HypercertCollection,
      };
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
   *
   * @example
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
      // Parse URI
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      // Fetch record
      const result = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to get project");
      }

      // Validate as collection
      const validation = validate(result.data.value, HYPERCERT_COLLECTIONS.COLLECTION, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid project record format: ${validation.error?.message}`);
      }

      // Verify it's actually a project (collection with type='project')
      const record = result.data.value as HypercertCollection;
      if (record.type !== "project") {
        throw new ValidationError(`Record is not a project (type='${record.type}')`);
      }

      return {
        uri: result.data.uri,
        cid: result.data.cid ?? "",
        record,
      };
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
    const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!uriMatch) {
      throw new ValidationError(`Invalid URI format: ${uri}`);
    }
    const [, , collection, rkey] = uriMatch;

    const existing = await this.agent.com.atproto.repo.getRecord({
      repo: this.repoDid,
      collection,
      rkey,
    });

    if (!existing.success) {
      throw new NetworkError(`Project not found: ${uri}`);
    }

    const record = existing.data.value as HypercertCollection;
    if (record.type !== "project") {
      throw new ValidationError(`Record is not a project (type='${record.type}')`);
    }

    // Delegate to updateCollection
    const result = await this.updateCollection(uri, updates);

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
    const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!uriMatch) {
      throw new ValidationError(`Invalid URI format: ${uri}`);
    }
    const [, , collection, rkey] = uriMatch;

    const existing = await this.agent.com.atproto.repo.getRecord({
      repo: this.repoDid,
      collection,
      rkey,
    });

    if (!existing.success) {
      throw new NetworkError(`Project not found: ${uri}`);
    }

    const record = existing.data.value as HypercertCollection;
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
    try {
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!existing.success) {
        throw new NetworkError(`Collection not found: ${uri}`);
      }

      const existingRecord = existing.data.value as HypercertCollection;

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

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: recordForUpdate,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update collection");
      }

      this.emit("collectionUpdated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!existing.success) {
        throw new NetworkError(`Collection not found: ${uri}`);
      }

      const resolvedLocation = await this.resolveLocation(location);
      if (!resolvedLocation) {
        throw new ValidationError("attachLocationToCollection: failed to resolve location");
      }

      const recordForUpdate: Record<string, unknown> = {
        ...existing.data.value,
        location: resolvedLocation,
      };

      const updateResult = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: recordForUpdate,
      });

      if (!updateResult.success) {
        throw new NetworkError("Failed to update collection with location");
      }

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
      const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!uriMatch) {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
      const [, , collection, rkey] = uriMatch;

      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey,
      });

      if (!existing.success) {
        throw new NetworkError(`Collection not found: ${uri}`);
      }

      const recordForUpdate = { ...existing.data.value };
      delete (recordForUpdate as { location?: unknown }).location;

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey,
        record: recordForUpdate,
      });

      if (!result.success) {
        throw new NetworkError("Failed to remove location from collection");
      }

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

  /**
   * Creates an app.certified.location record.
   *
   * @param location - Location parameters
   * @returns Promise resolving to location record URI and CID
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
      record: locationRecord as Record<string, unknown>,
    });

    if (!result.success) {
      throw new NetworkError("Failed to create location record");
    }

    return { uri: result.data.uri, cid: result.data.cid };
  }
}
