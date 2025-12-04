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
import { EventEmitter } from "eventemitter3";
import { NetworkError, ValidationError } from "../core/errors.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { LexiconRegistry } from "./LexiconRegistry.js";
import {
  HYPERCERT_COLLECTIONS,
  type BlobRef,
  type HypercertEvidence,
  type HypercertClaim,
  type HypercertRights,
  type HypercertContribution,
  type HypercertMeasurement,
  type HypercertEvaluation,
  type HypercertCollection,
  type HypercertLocation,
} from "../services/hypercerts/types.js";
import type {
  HypercertOperations,
  HypercertEvents,
  CreateHypercertParams,
  CreateHypercertResult,
} from "./interfaces.js";
import type { CreateResult, UpdateResult, PaginatedList, ListParams, ProgressStep } from "./types.js";

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
   * @param lexiconRegistry - Registry for record validation
   * @param logger - Optional logger for debugging
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
    private lexiconRegistry: LexiconRegistry,
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
   * will still exist. The result object will contain URIs for all
   * successfully created records.
   *
   * **Progress Steps**:
   * - `uploadImage`: Image blob upload
   * - `createRights`: Rights record creation
   * - `createHypercert`: Main hypercert record creation
   * - `attachLocation`: Location record creation
   * - `createContributions`: Contribution records creation
   *
   * @example Minimal hypercert
   * ```typescript
   * const result = await repo.hypercerts.create({
   *   title: "My Impact",
   *   description: "Description of impact work",
   *   workScope: "Education",
   *   workTimeframeFrom: "2024-01-01",
   *   workTimeframeTo: "2024-06-30",
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
   *   workTimeframeFrom: "2024-01-01",
   *   workTimeframeTo: "2024-12-31",
   *   rights: { name: "Open", type: "impact", description: "..." },
   *   image: coverImageBlob,
   *   location: { value: "Amazon, Brazil", name: "Amazon Basin" },
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
      let imageBlobRef: BlobRef | undefined;
      if (params.image) {
        this.emitProgress(params.onProgress, { name: "uploadImage", status: "start" });
        try {
          const arrayBuffer = await params.image.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
            encoding: params.image.type || "image/jpeg",
          });
          if (uploadResult.success) {
            imageBlobRef = {
              $type: "blob",
              ref: { $link: uploadResult.data.blob.ref.toString() },
              mimeType: uploadResult.data.blob.mimeType,
              size: uploadResult.data.blob.size,
            };
          }
          this.emitProgress(params.onProgress, {
            name: "uploadImage",
            status: "success",
            data: { size: params.image.size },
          });
        } catch (error) {
          this.emitProgress(params.onProgress, { name: "uploadImage", status: "error", error: error as Error });
          throw new NetworkError(
            `Failed to upload image: ${error instanceof Error ? error.message : "Unknown"}`,
            error,
          );
        }
      }

      // Step 2: Create rights record
      this.emitProgress(params.onProgress, { name: "createRights", status: "start" });
      const rightsRecord: HypercertRights = {
        $type: HYPERCERT_COLLECTIONS.RIGHTS,
        rightsName: params.rights.name,
        rightsType: params.rights.type,
        rightsDescription: params.rights.description,
        createdAt,
      };

      const rightsValidation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.RIGHTS, rightsRecord);
      if (!rightsValidation.valid) {
        throw new ValidationError(`Invalid rights record: ${rightsValidation.error}`);
      }

      const rightsResult = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.RIGHTS,
        record: rightsRecord as Record<string, unknown>,
      });

      if (!rightsResult.success) {
        throw new NetworkError("Failed to create rights record");
      }

      result.rightsUri = rightsResult.data.uri;
      result.rightsCid = rightsResult.data.cid;
      this.emit("rightsCreated", { uri: result.rightsUri, cid: result.rightsCid });
      this.emitProgress(params.onProgress, {
        name: "createRights",
        status: "success",
        data: { uri: result.rightsUri },
      });

      // Step 3: Create hypercert record
      this.emitProgress(params.onProgress, { name: "createHypercert", status: "start" });
      const hypercertRecord: Record<string, unknown> = {
        $type: HYPERCERT_COLLECTIONS.CLAIM,
        title: params.title,
        description: params.description,
        workScope: params.workScope,
        workTimeframeFrom: params.workTimeframeFrom,
        workTimeframeTo: params.workTimeframeTo,
        rights: { uri: result.rightsUri, cid: result.rightsCid },
        createdAt,
      };

      if (params.shortDescription) {
        hypercertRecord.shortDescription = params.shortDescription;
      }

      if (imageBlobRef) {
        hypercertRecord.image = imageBlobRef;
      }

      if (params.evidence && params.evidence.length > 0) {
        hypercertRecord.evidence = params.evidence;
      }

      const hypercertValidation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.CLAIM, hypercertRecord);
      if (!hypercertValidation.valid) {
        throw new ValidationError(`Invalid hypercert record: ${hypercertValidation.error}`);
      }

      const hypercertResult = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.CLAIM,
        record: hypercertRecord,
      });

      if (!hypercertResult.success) {
        throw new NetworkError("Failed to create hypercert record");
      }

      result.hypercertUri = hypercertResult.data.uri;
      result.hypercertCid = hypercertResult.data.cid;
      this.emit("recordCreated", { uri: result.hypercertUri, cid: result.hypercertCid });
      this.emitProgress(params.onProgress, {
        name: "createHypercert",
        status: "success",
        data: { uri: result.hypercertUri },
      });

      // Step 4: Attach location if provided
      if (params.location) {
        this.emitProgress(params.onProgress, { name: "attachLocation", status: "start" });
        try {
          const locationResult = await this.attachLocation(result.hypercertUri, params.location);
          result.locationUri = locationResult.uri;
          this.emitProgress(params.onProgress, {
            name: "attachLocation",
            status: "success",
            data: { uri: result.locationUri },
          });
        } catch (error) {
          this.emitProgress(params.onProgress, { name: "attachLocation", status: "error", error: error as Error });
          this.logger?.warn(`Failed to attach location: ${error instanceof Error ? error.message : "Unknown"}`);
        }
      }

      // Step 5: Create contributions if provided
      if (params.contributions && params.contributions.length > 0) {
        this.emitProgress(params.onProgress, { name: "createContributions", status: "start" });
        result.contributionUris = [];
        try {
          for (const contrib of params.contributions) {
            const contribResult = await this.addContribution({
              hypercertUri: result.hypercertUri,
              contributors: contrib.contributors,
              role: contrib.role,
              description: contrib.description,
            });
            result.contributionUris.push(contribResult.uri);
          }
          this.emitProgress(params.onProgress, {
            name: "createContributions",
            status: "success",
            data: { count: result.contributionUris.length },
          });
        } catch (error) {
          this.emitProgress(params.onProgress, { name: "createContributions", status: "error", error: error as Error });
          this.logger?.warn(`Failed to create contributions: ${error instanceof Error ? error.message : "Unknown"}`);
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
    updates: Partial<Omit<HypercertClaim, "$type" | "createdAt" | "rights">>;
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

      const validation = this.lexiconRegistry.validate(collection, recordForUpdate);
      if (!validation.valid) {
        throw new ValidationError(`Invalid hypercert record: ${validation.error}`);
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

      // Validate with lexicon registry (more lenient - doesn't require $type)
      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.CLAIM, result.data.value);
      if (!validation.valid) {
        throw new ValidationError(`Invalid hypercert record format: ${validation.error}`);
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
  async attachLocation(
    hypercertUri: string,
    location: { value: string; name?: string; description?: string; srs?: string; geojson?: Blob },
  ): Promise<CreateResult> {
    try {
      // Validate required srs field
      if (!location.srs) {
        throw new ValidationError(
          "srs (Spatial Reference System) is required. Example: 'EPSG:4326' for WGS84 coordinates, or 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' for CRS84.",
        );
      }

      // Validate that hypercert exists (unused but confirms hypercert is valid)
      await this.get(hypercertUri);
      const createdAt = new Date().toISOString();

      // Determine location type and prepare location data
      let locationData: { $type: string; uri: string } | BlobRef;
      let locationType: string;

      if (location.geojson) {
        // Upload GeoJSON as a blob
        const arrayBuffer = await location.geojson.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
          encoding: location.geojson.type || "application/geo+json",
        });
        if (uploadResult.success) {
          locationData = {
            $type: "blob",
            ref: { $link: uploadResult.data.blob.ref.toString() },
            mimeType: uploadResult.data.blob.mimeType,
            size: uploadResult.data.blob.size,
          };
          locationType = "geojson-point";
        } else {
          throw new NetworkError("Failed to upload GeoJSON blob");
        }
      } else {
        // Use value as a URI reference
        locationData = {
          $type: "app.certified.defs#uri",
          uri: location.value,
        };
        locationType = "coordinate-decimal";
      }

      // Build location record according to app.certified.location lexicon
      const locationRecord: HypercertLocation = {
        $type: HYPERCERT_COLLECTIONS.LOCATION,
        lpVersion: "1.0",
        srs: location.srs,
        locationType,
        location: locationData,
        createdAt,
        name: location.name,
        description: location.description,
      };

      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.LOCATION, locationRecord);
      if (!validation.valid) {
        throw new ValidationError(`Invalid location record: ${validation.error}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.LOCATION,
        record: locationRecord as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to attach location");
      }

      this.emit("locationAttached", { uri: result.data.uri, cid: result.data.cid, hypercertUri });
      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to attach location: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Adds evidence to an existing hypercert.
   *
   * @param hypercertUri - AT-URI of the hypercert
   * @param evidence - Array of evidence items to add
   * @returns Promise resolving to update result
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @remarks
   * Evidence is appended to existing evidence, not replaced.
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addEvidence(hypercertUri, [
   *   { uri: "https://example.com/report.pdf", description: "Impact report" },
   *   { uri: "https://example.com/data.csv", description: "Raw data" },
   * ]);
   * ```
   */
  async addEvidence(hypercertUri: string, evidence: HypercertEvidence[]): Promise<UpdateResult> {
    try {
      const existing = await this.get(hypercertUri);
      const existingEvidence = existing.record.evidence || [];
      const updatedEvidence = [...existingEvidence, ...evidence];

      const result = await this.update({
        uri: hypercertUri,
        updates: { evidence: updatedEvidence },
      });

      this.emit("evidenceAdded", { uri: result.uri, cid: result.cid });
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to add evidence: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  /**
   * Creates a contribution record.
   *
   * @param params - Contribution parameters
   * @param params.hypercertUri - Optional hypercert to link (can be standalone)
   * @param params.contributors - Array of contributor DIDs
   * @param params.role - Role of the contributors (e.g., "coordinator", "implementer")
   * @param params.description - Optional description of the contribution
   * @returns Promise resolving to contribution record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * await repo.hypercerts.addContribution({
   *   hypercertUri: hypercertUri,
   *   contributors: ["did:plc:alice", "did:plc:bob"],
   *   role: "implementer",
   *   description: "On-ground implementation team",
   * });
   * ```
   */
  async addContribution(params: {
    hypercertUri?: string;
    contributors: string[];
    role: string;
    description?: string;
  }): Promise<CreateResult> {
    try {
      const createdAt = new Date().toISOString();
      const contributionRecord: HypercertContribution = {
        $type: HYPERCERT_COLLECTIONS.CONTRIBUTION,
        contributors: params.contributors,
        role: params.role,
        createdAt,
        description: params.description,
        hypercert: { uri: "", cid: "" }, // Will be set below if hypercertUri provided
      };

      if (params.hypercertUri) {
        const hypercert = await this.get(params.hypercertUri);
        contributionRecord.hypercert = { uri: hypercert.uri, cid: hypercert.cid };
      }

      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.CONTRIBUTION, contributionRecord);
      if (!validation.valid) {
        throw new ValidationError(`Invalid contribution record: ${validation.error}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.CONTRIBUTION,
        record: contributionRecord as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create contribution");
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

      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.MEASUREMENT, measurementRecord);
      if (!validation.valid) {
        throw new ValidationError(`Invalid measurement record: ${validation.error}`);
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

      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.EVALUATION, evaluationRecord);
      if (!validation.valid) {
        throw new ValidationError(`Invalid evaluation record: ${validation.error}`);
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
   * @param params.claims - Array of hypercert references with weights
   * @param params.shortDescription - Optional short description
   * @param params.coverPhoto - Optional cover image blob
   * @returns Promise resolving to collection record URI and CID
   * @throws {@link ValidationError} if validation fails
   * @throws {@link NetworkError} if the operation fails
   *
   * @example
   * ```typescript
   * const collection = await repo.hypercerts.createCollection({
   *   title: "Climate Projects 2024",
   *   shortDescription: "Our climate impact portfolio",
   *   claims: [
   *     { uri: hypercert1Uri, cid: hypercert1Cid, weight: "0.5" },
   *     { uri: hypercert2Uri, cid: hypercert2Cid, weight: "0.3" },
   *     { uri: hypercert3Uri, cid: hypercert3Cid, weight: "0.2" },
   *   ],
   *   coverPhoto: coverImageBlob,
   * });
   * ```
   */
  async createCollection(params: {
    title: string;
    claims: Array<{ uri: string; cid: string; weight: string }>;
    shortDescription?: string;
    coverPhoto?: Blob;
  }): Promise<CreateResult> {
    try {
      const createdAt = new Date().toISOString();

      let coverPhotoRef: BlobRef | undefined;
      if (params.coverPhoto) {
        const arrayBuffer = await params.coverPhoto.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
          encoding: params.coverPhoto.type || "image/jpeg",
        });
        if (uploadResult.success) {
          coverPhotoRef = {
            $type: "blob",
            ref: { $link: uploadResult.data.blob.ref.toString() },
            mimeType: uploadResult.data.blob.mimeType,
            size: uploadResult.data.blob.size,
          };
        }
      }

      const collectionRecord: Record<string, unknown> = {
        $type: HYPERCERT_COLLECTIONS.COLLECTION,
        title: params.title,
        claims: params.claims.map((c) => ({ claim: { uri: c.uri, cid: c.cid }, weight: c.weight })),
        createdAt,
      };

      if (params.shortDescription) {
        collectionRecord.shortDescription = params.shortDescription;
      }

      if (coverPhotoRef) {
        collectionRecord.coverPhoto = coverPhotoRef;
      }

      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.COLLECTION, collectionRecord);
      if (!validation.valid) {
        throw new ValidationError(`Invalid collection record: ${validation.error}`);
      }

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.COLLECTION,
        record: collectionRecord,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create collection");
      }

      this.emit("collectionCreated", { uri: result.data.uri, cid: result.data.cid });
      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to create collection: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
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
      const validation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.COLLECTION, result.data.value);
      if (!validation.valid) {
        throw new ValidationError(`Invalid collection record format: ${validation.error}`);
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
}
