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
  type HypercertEvaluation,
  type HypercertEvidence,
  type HypercertLocation,
  type CreateLocationParams,
  type HypercertMeasurement,
  type HypercertRights,
  type JsonBlobRef,
  type OrgHypercertsDefs,
  type StrongRef,
  type UpdateCollectionParams,
  type UpdateProjectParams,
} from "../services/hypercerts/types.js";
import type {
  CreateHypercertEvidenceParams,
  LocationParams,
  CreateHypercertParams,
  CreateHypercertResult,
  HypercertEvents,
  HypercertOperations,
} from "./interfaces.js";
import type { CreateResult, ListParams, PaginatedList, ProgressStep, UpdateResult } from "./types.js";
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
   * @param _serverUrl - Server URL (reserved for future use)
   * @param logger - Optional logger for debugging
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
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
   * Helper function to upload a blob to the repository, returns a blob reference
   *
   * @param content - Blob to upload
   * @param fallbackContentType | if content.type is empty,we use this
   * @returns BlobRef
   * @throws {@link NetworkError} if upload fails
   * @internal
   */

  private async handleBlobUpload(content: Blob, fallbackContentType: string) {
    const arrayBuffer = await content.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
      encoding: content.type || fallbackContentType,
    });
    if (!uploadResult.success) {
      throw new NetworkError("Failed to upload blob");
    }
    return uploadResult.data.blob;
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
      const arrayBuffer = await image.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
        encoding: image.type || "image/jpeg",
      });
      if (uploadResult.success) {
        const blobRef: JsonBlobRef = {
          $type: "blob",
          ref: { $link: uploadResult.data.blob.ref.toString() },
          mimeType: uploadResult.data.blob.mimeType,
          size: uploadResult.data.blob.size,
        };
        this.emitProgress(onProgress, {
          name: "uploadImage",
          status: "success",
          data: { size: image.size },
        });
        return blobRef;
      }
      throw new NetworkError("Image upload succeeded but returned no blob reference");
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
          contributorIdentity: string | { uri: string; cid: string };
          contributionWeight?: string;
          contributionDetails?: string | { uri: string; cid: string };
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
   * Creates evidence records with progress tracking.
   *
   * @param hypercertUri - URI of the hypercert
   * @param evidenceItems - Array of evidence data (without subjectUri)
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of evidence URIs
   * @internal
   */
  private async createEvidenceWithProgress(
    hypercertUri: string,
    evidenceItems: Array<Omit<CreateHypercertEvidenceParams, "subjectUri">>,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<string[]> {
    this.emitProgress(onProgress, { name: "addEvidence", status: "start" });
    try {
      const evidenceUris = await Promise.all(
        evidenceItems.map((evidence) =>
          this.addEvidence({
            subjectUri: hypercertUri,
            ...evidence,
          } as CreateHypercertEvidenceParams).then((result) => result.uri),
        ),
      );
      this.emitProgress(onProgress, {
        name: "addEvidence",
        status: "success",
        data: { count: evidenceUris.length },
      });
      return evidenceUris;
    } catch (error) {
      this.emitProgress(onProgress, { name: "addEvidence", status: "error", error: error as Error });
      this.logger?.warn(`Failed to create evidence: ${error instanceof Error ? error.message : "Unknown"}`);
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
   * - `addEvidence`: Evidence records creation
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
   *   evidence: [{ uri: "https://...", description: "Satellite data" }],
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

      // Step 6: Add evidence records if provided
      if (params.evidence && params.evidence.length > 0) {
        try {
          result.evidenceUris = await this.createEvidenceWithProgress(hypercertUri, params.evidence, params.onProgress);
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
          const arrayBuffer = await params.image.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
            encoding: params.image.type || "image/jpeg",
          });
          if (uploadResult.success) {
            recordForUpdate.image = {
              $type: "blob",
              ref: uploadResult.data.blob.ref,
              mimeType: uploadResult.data.blob.mimeType,
              size: uploadResult.data.blob.size,
            };
          }
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
  private async resolveUriOrBlob(content: string | Blob, fallbackMimeType: string) {
    if (typeof content === "string") {
      const uriRef = {
        $type: "org.hypercerts.defs#uri",
        uri: content,
      } satisfies $Typed<OrgHypercertsDefs.Uri>;
      return uriRef;
    }

    const uploadedBlob = await this.handleBlobUpload(content, fallbackMimeType);
    const blobRef = {
      $type: "org.hypercerts.defs#smallBlob",
      blob: uploadedBlob,
    } satisfies $Typed<OrgHypercertsDefs.SmallBlob>;
    return blobRef;
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

    const blob = await this.handleBlobUpload(input, "image/jpeg");
    if (isBanner) {
      return { $type: "org.hypercerts.defs#largeImage" as const, image: blob };
    }

    return { $type: "org.hypercerts.defs#smallImage" as const, image: blob };
  }

  private async resolveLocationValue(location: string | Blob | HypercertLocation["location"]) {
    if (typeof location === "string" || location instanceof Blob) {
      return this.resolveUriOrBlob(location, "application/geo+json");
    }

    return location;
  }

  /**
   * Check if an AttachLocationParams is the object form (not a StrongRef or string).
   * @internal
   */
  private isLocationObject(location: LocationParams): location is CreateLocationParams {
    return (
      typeof location === "object" &&
      !("uri" in location) &&
      !("cid" in location) &&
      location !== null &&
      !Array.isArray(location)
    );
  }

  /**
   * Helper to resolve a location reference to a StrongRef.
   *
   * @param location - Location parameter (StrongRef, string URI, or location object)
   * @returns Promise resolving to a StrongRef
   * @throws {ValidationError} When string input doesn't match AT-URI pattern
   * @throws {NetworkError} When getRecord fails or returns no CID
   * @internal
   */
  private async resolveLocation(location: LocationParams): Promise<StrongRef> {
    if (typeof location === "string") {
      return this.resolveStrongRefFromUri(location);
    }

    if (this.isLocationObject(location)) {
      return this.createLocationRecord(location);
    }

    if ("uri" in location && "cid" in location) {
      return { $type: "com.atproto.repo.strongRef" as const, uri: location.uri, cid: location.cid };
    }

    throw new ValidationError("resolveLocation: Unsupported location input.");
  }

  private async resolveStrongRefFromUri(uri: string): Promise<StrongRef> {
    const uriMatch = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!uriMatch) {
      throw new ValidationError(`resolveLocation: Invalid location AT-URI: "${uri}"`);
    }

    const [, repo, collection, rkey] = uriMatch;
    const record = await this.agent.com.atproto.repo.getRecord({ repo, collection, rkey });
    if (!record.success) {
      throw new NetworkError(
        `resolveLocation: getRecord failed for repo=${repo}, collection=${collection}, rkey=${rkey}`,
      );
    }
    if (!record.data.cid) {
      throw new NetworkError(
        `resolveLocation: getRecord returned no CID for repo=${repo}, collection=${collection}, rkey=${rkey}`,
      );
    }

    return { $type: "com.atproto.repo.strongRef" as const, uri, cid: record.data.cid };
  }

  /**
   * Adds evidence to any subject via the subject ref.
   *
   * @param evidence - HypercertEvidenceInput
   * @returns Promise resolving to update result
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addEvidence({
   *   subjectUri: "at://did:plc:u7h3dstby64di67bxaotzxcz/org.hypercerts.claim.activity/3mbvv5d7ixh2g"
   *   content: Blob,
   *   title: "Meeting Notes",
   *   shortDescription: "Meetings notes from the 3rd of December 2025",
   *   description: "The meeting with the board of directors and audience on 2025 in regards to the ecological landscape",
   *   relationType: "supports",
   * })
   * ```
   */
  async addEvidence(evidence: CreateHypercertEvidenceParams): Promise<UpdateResult> {
    try {
      const { subjectUri, content, ...rest } = evidence;
      const subject = await this.get(subjectUri);
      const createdAt = new Date().toISOString();

      const evidenceContent = await this.resolveUriOrBlob(content, "application/octet-stream");
      const evidenceRecord: HypercertEvidence = {
        ...rest,
        $type: HYPERCERT_COLLECTIONS.EVIDENCE,
        createdAt,
        content: evidenceContent,
        subject: { uri: subject.uri, cid: subject.cid },
      };
      const validation = validate(evidenceRecord, HYPERCERT_COLLECTIONS.EVIDENCE, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid evidence record: ${validation.error?.message}`);
      }
      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.EVIDENCE,
        record: evidenceRecord,
      });
      if (!result.success) {
        throw new NetworkError(`Failed to add evidence`);
      }
      this.emit("evidenceAdded", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to add evidence: ${error instanceof Error ? error.message : "Unknown"}`, error);
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
   * Processes contribution parameters, creating detailed contribution records if necessary.
   *
   * @param contributions - Array of contribution parameters
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to flattened array of contributor data for embedding
   * @internal
   */
  private async processContributors(
    contributions:
      | Array<{
          contributors: Array<string | { uri: string; cid: string }>;
          contributionDetails: string | { uri: string; cid: string } | { role: string; [key: string]: unknown };
          weight?: string;
        }>
      | undefined,
    onProgress?: (step: ProgressStep) => void,
  ): Promise<
    | Array<{
        contributorIdentity: string | { uri: string; cid: string };
        contributionWeight?: string;
        contributionDetails?: string | { uri: string; cid: string };
      }>
    | undefined
  > {
    if (!contributions || contributions.length === 0) return undefined;

    const contributorsPromises = contributions.map(async (contrib) => {
      let detailsRef: string | { uri: string; cid: string };
      const details = contrib.contributionDetails;

      // Determine the type of contributionDetails
      if (typeof details === "string") {
        // Inline role string
        detailsRef = details;
      } else if ("uri" in details && "cid" in details && !("role" in details)) {
        // StrongRef to existing record (has uri+cid but no role)
        detailsRef = { uri: details.uri as string, cid: details.cid as string };
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
          detailsRef = { uri: result.uri, cid: result.cid };
          this.emitProgress(onProgress, {
            name: "createContribution",
            status: "success",
            data: result,
          });
        } catch (error) {
          this.emitProgress(onProgress, {
            name: "createContribution",
            status: "error",
            error: error as Error,
          });
          throw error;
        }
      } else {
        // Fallback - shouldn't happen with proper types
        throw new Error("Invalid contributionDetails format");
      }

      // Expand to one entry per contributor (DID string or StrongRef)
      return contrib.contributors.map((identity) => ({
        contributorIdentity: identity,
        contributionWeight: contrib.weight,
        contributionDetails: detailsRef,
      }));
    });

    const nestedContributors = await Promise.all(contributorsPromises);
    return nestedContributors.flat();
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
   * Creates a measurement record for a hypercert.
   *
   * Measurements quantify the impact claimed in a hypercert with
   * specific metrics and values.
   *
   * @param params - Measurement parameters
   * @param params.hypercertUri - AT-URI of the hypercert being measured
   * @param params.measurers - DIDs of entities who performed the measurement
   * @param params.metric - Name of the metric (e.g., "CO2 Reduced", "Trees Planted")
   * @param params.value - Measured value with units (e.g., "100 tons", "10000")
   * @param params.methodUri - Optional URI describing the measurement methodology
   * @param params.evidenceUris - Optional URIs to supporting evidence
   * @returns Promise resolving to measurement record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addMeasurement({
   *   hypercertUri: hypercertUri,
   *   measurers: ["did:plc:auditor"],
   *   metric: "Carbon Offset",
   *   value: "150 tons CO2e",
   *   methodUri: "https://example.com/methodology",
   *   evidenceUris: ["https://example.com/audit-report"],
   * });
   * ```
   */
  async addMeasurement(params: {
    hypercertUri: string;
    measurers: string[];
    metric: string;
    value: string;
    methodUri?: string;
    evidenceUris?: string[];
  }): Promise<CreateResult> {
    try {
      const hypercert = await this.get(params.hypercertUri);
      const createdAt = new Date().toISOString();

      const measurementRecord: HypercertMeasurement = {
        $type: HYPERCERT_COLLECTIONS.MEASUREMENT,
        hypercert: { uri: hypercert.uri, cid: hypercert.cid },
        measurers: params.measurers,
        metric: params.metric,
        value: params.value,
        createdAt,
        measurementMethodURI: params.methodUri,
        evidenceURI: params.evidenceUris,
      };

      const validation = validate(measurementRecord, HYPERCERT_COLLECTIONS.MEASUREMENT, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid measurement record: ${validation.error?.message}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.MEASUREMENT,
        record: measurementRecord as Record<string, unknown>,
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
   * for relative importance.
   *
   * @param params - Collection parameters
   * @param params.title - Collection title
   * @param params.items - Array of hypercert references with weights
   * @param params.shortDescription - Optional short description
   * @param params.banner - Optional cover image blob
   * @returns Promise resolving to collection record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * const collection = await repo.hypercerts.createCollection({
   *   title: "Climate Projects 2024",
   *   shortDescription: "Our climate impact portfolio",
   *   items: [
   *     { itemIdentifier: { uri: hypercert1Uri, cid: hypercert1Cid }, itemWeight: "0.5" },
   *     { itemIdentifier: { uri: hypercert2Uri, cid: hypercert2Cid }, itemWeight: "0.3" },
   *     { itemIdentifier: { uri: hypercert3Uri, cid: hypercert3Cid }, itemWeight: "0.2" },
   *   ],
   *   banner: coverImageBlob,
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
   * @example
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
   * updateCollection and handles the avatar field.
   *
   * @param uri - AT-URI of the project to update
   * @param updates - Fields to update
   * @returns Promise resolving to updated project URI and CID
   *
   * @example
   * ```typescript
   * const result = await repo.hypercerts.updateProject(projectUri, {
   *   title: "Updated Project Title",
   *   shortDescription: "New description"
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
   * @param uri - AT-URI of the collection to update
   * @param updates - Fields to update
   * @returns Promise resolving to updated collection URI and CID
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
