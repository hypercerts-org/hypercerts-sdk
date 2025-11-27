/**
 * HypercertOperationsImpl - High-level hypercert operations
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { EventEmitter } from "eventemitter3";
import { NetworkError, ValidationError } from "../core/errors.js";
import type { LoggerInterface } from "../core/interfaces.js";
import { HYPERCERT_COLLECTIONS } from "../lexicons/hypercerts/index.js";
import type { LexiconRegistry } from "./LexiconRegistry.js";
import type {
  BlobRef,
  CollectionRecord,
  ContributionRecord,
  EvaluationRecord,
  HypercertEvidence,
  HypercertRecord,
  LocationRecord,
  MeasurementRecord,
  RightsRecord,
} from "../services/hypercerts/types.js";
import { HypercertRecordSchema, CollectionRecordSchema } from "../services/hypercerts/schemas.js";
import type {
  HypercertOperations,
  HypercertEvents,
  CreateHypercertParams,
  CreateHypercertResult,
} from "./interfaces.js";
import type { CreateResult, UpdateResult, PaginatedList, ListParams, ProgressStep } from "./types.js";

export class HypercertOperationsImpl extends EventEmitter<HypercertEvents> implements HypercertOperations {
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
    private lexiconRegistry: LexiconRegistry,
    private logger?: LoggerInterface,
  ) {
    super();
  }

  private emitProgress(onProgress: ((step: ProgressStep) => void) | undefined, step: ProgressStep): void {
    if (onProgress) {
      try {
        onProgress(step);
      } catch (err) {
        this.logger?.error(`Error in progress handler: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
  }

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
              ref: uploadResult.data.blob.ref,
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
      const rightsRecord: RightsRecord = {
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

      const hypercertValidation = this.lexiconRegistry.validate(HYPERCERT_COLLECTIONS.RECORD, hypercertRecord);
      if (!hypercertValidation.valid) {
        throw new ValidationError(`Invalid hypercert record: ${hypercertValidation.error}`);
      }

      const hypercertResult = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.RECORD,
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

  async update(params: {
    uri: string;
    updates: Partial<Omit<HypercertRecord, "createdAt" | "rights">>;
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
      // TypeScript ensures type safety through the HypercertRecord interface
      const existingRecord = existing.data.value as HypercertRecord;

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

  async get(uri: string): Promise<{ uri: string; cid: string; record: HypercertRecord }> {
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

      // Parse and validate with Zod schema
      const parseResult = HypercertRecordSchema.safeParse(result.data.value);
      if (!parseResult.success) {
        throw new ValidationError(`Invalid hypercert record format: ${parseResult.error.message}`);
      }

      return {
        uri: result.data.uri,
        cid: result.data.cid ?? "",
        record: parseResult.data as HypercertRecord,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get hypercert: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  async list(params?: ListParams): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertRecord }>> {
    try {
      const result = await this.agent.com.atproto.repo.listRecords({
        repo: this.repoDid,
        collection: HYPERCERT_COLLECTIONS.RECORD,
        limit: params?.limit,
        cursor: params?.cursor,
      });

      if (!result.success) {
        throw new NetworkError("Failed to list hypercerts");
      }

      return {
        records:
          result.data.records?.map((r) => {
            const parseResult = HypercertRecordSchema.safeParse(r.value);
            return {
              uri: r.uri,
              cid: r.cid,
              record: parseResult.success ? (parseResult.data as HypercertRecord) : (r.value as HypercertRecord),
            };
          }) || [],
        cursor: result.data.cursor ?? undefined,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to list hypercerts: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

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

  async attachLocation(
    hypercertUri: string,
    location: { value: string; name?: string; description?: string; srs?: string; geojson?: Blob },
  ): Promise<CreateResult> {
    try {
      // Get hypercert to get CID
      const hypercert = await this.get(hypercertUri);
      const createdAt = new Date().toISOString();

      let locationValue: string | BlobRef = location.value;
      if (location.geojson) {
        const arrayBuffer = await location.geojson.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
          encoding: location.geojson.type || "application/geo+json",
        });
        if (uploadResult.success) {
          locationValue = {
            $type: "blob",
            ref: uploadResult.data.blob.ref,
            mimeType: uploadResult.data.blob.mimeType,
            size: uploadResult.data.blob.size,
          };
        }
      }

      const locationRecord: LocationRecord = {
        hypercert: { uri: hypercert.uri, cid: hypercert.cid },
        value: locationValue,
        createdAt,
        name: location.name,
        description: location.description,
        srs: location.srs,
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

  async addContribution(params: {
    hypercertUri?: string;
    contributors: string[];
    role: string;
    description?: string;
  }): Promise<CreateResult> {
    try {
      const createdAt = new Date().toISOString();
      const contributionRecord: ContributionRecord = {
        contributors: params.contributors,
        role: params.role,
        createdAt,
        description: params.description,
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

      const measurementRecord: MeasurementRecord = {
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

  async addEvaluation(params: { subjectUri: string; evaluators: string[]; summary: string }): Promise<CreateResult> {
    try {
      const subject = await this.get(params.subjectUri);
      const createdAt = new Date().toISOString();

      const evaluationRecord: EvaluationRecord = {
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
            ref: uploadResult.data.blob.ref,
            mimeType: uploadResult.data.blob.mimeType,
            size: uploadResult.data.blob.size,
          };
        }
      }

      const collectionRecord: Record<string, unknown> = {
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

  async getCollection(uri: string): Promise<{ uri: string; cid: string; record: CollectionRecord }> {
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

      // Parse and validate with Zod schema
      const parseResult = CollectionRecordSchema.safeParse(result.data.value);
      if (!parseResult.success) {
        throw new ValidationError(`Invalid collection record format: ${parseResult.error.message}`);
      }

      return {
        uri: result.data.uri,
        cid: result.data.cid ?? "",
        record: parseResult.data as CollectionRecord,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get collection: ${error instanceof Error ? error.message : "Unknown"}`, error);
    }
  }

  async listCollections(
    params?: ListParams,
  ): Promise<PaginatedList<{ uri: string; cid: string; record: CollectionRecord }>> {
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
          result.data.records?.map((r) => {
            const parseResult = CollectionRecordSchema.safeParse(r.value);
            return {
              uri: r.uri,
              cid: r.cid,
              record: parseResult.success ? (parseResult.data as CollectionRecord) : (r.value as CollectionRecord),
            };
          }) || [],
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
