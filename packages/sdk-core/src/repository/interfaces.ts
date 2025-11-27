/**
 * Repository interfaces - Operation contracts
 * @packageDocumentation
 */

import type { EventEmitter } from "eventemitter3";
import type {
  CollectionRecord,
  HypercertEvidence,
  HypercertRecord,
} from "../services/hypercerts/types.js";
import type {
  CreateResult,
  UpdateResult,
  PaginatedList,
  ListParams,
  RepositoryRole,
  RepositoryAccessGrant,
  OrganizationInfo,
  ProgressStep,
} from "./types.js";

// ============================================================================
// Hypercert Operation Types
// ============================================================================

/**
 * Create hypercert parameters
 */
export interface CreateHypercertParams {
  title: string;
  description: string;
  workScope: string;
  workTimeframeFrom: string;
  workTimeframeTo: string;
  rights: {
    name: string;
    type: string;
    description: string;
  };
  shortDescription?: string;
  image?: Blob;
  location?: {
    value: string;
    name?: string;
    description?: string;
    srs?: string;
    geojson?: Blob;
  };
  contributions?: Array<{
    contributors: string[];
    role: string;
    description?: string;
  }>;
  evidence?: HypercertEvidence[];
  onProgress?: (step: ProgressStep) => void;
}

/**
 * Create hypercert result
 */
export interface CreateHypercertResult {
  hypercertUri: string;
  rightsUri: string;
  hypercertCid: string;
  rightsCid: string;
  locationUri?: string;
  contributionUris?: string[];
}

// ============================================================================
// Operation Interfaces
// ============================================================================

/**
 * Record operations (low-level CRUD)
 */
export interface RecordOperations {
  create(params: { collection: string; record: unknown; rkey?: string }): Promise<CreateResult>;
  update(params: { collection: string; rkey: string; record: unknown }): Promise<UpdateResult>;
  get(params: { collection: string; rkey: string }): Promise<{ uri: string; cid: string; value: unknown }>;
  list(params: { collection: string; limit?: number; cursor?: string }): Promise<PaginatedList<{ uri: string; cid: string; value: unknown }>>;
  delete(params: { collection: string; rkey: string }): Promise<void>;
}

/**
 * Blob operations
 */
export interface BlobOperations {
  upload(blob: Blob): Promise<{ ref: { $link: string }; mimeType: string; size: number }>;
  get(cid: string): Promise<{ data: Uint8Array; mimeType: string }>;
}

/**
 * Profile operations
 */
export interface ProfileOperations {
  get(): Promise<{
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    website?: string;
  }>;
  update(params: {
    displayName?: string | null;
    description?: string | null;
    avatar?: Blob | null;
    banner?: Blob | null;
    website?: string | null;
  }): Promise<UpdateResult>;
}

/**
 * Hypercert operations events
 */
export interface HypercertEvents {
  recordCreated: { uri: string; cid: string };
  recordUpdated: { uri: string; cid: string };
  rightsCreated: { uri: string; cid: string };
  locationAttached: { uri: string; cid: string; hypercertUri: string };
  contributionCreated: { uri: string; cid: string };
  evidenceAdded: { uri: string; cid: string };
  collectionCreated: { uri: string; cid: string };
}

/**
 * Hypercert operations (high-level)
 */
export interface HypercertOperations extends EventEmitter<HypercertEvents> {
  create(params: CreateHypercertParams): Promise<CreateHypercertResult>;
  update(params: { uri: string; updates: Partial<Omit<HypercertRecord, "createdAt" | "rights">>; image?: Blob | null }): Promise<UpdateResult>;
  get(uri: string): Promise<{ uri: string; cid: string; record: HypercertRecord }>;
  list(params?: ListParams): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertRecord }>>;
  delete(uri: string): Promise<void>;

  attachLocation(uri: string, location: { value: string; name?: string; description?: string; srs?: string; geojson?: Blob }): Promise<CreateResult>;
  addEvidence(uri: string, evidence: HypercertEvidence[]): Promise<UpdateResult>;
  addContribution(params: { hypercertUri?: string; contributors: string[]; role: string; description?: string }): Promise<CreateResult>;
  addMeasurement(params: { hypercertUri: string; measurers: string[]; metric: string; value: string; methodUri?: string; evidenceUris?: string[] }): Promise<CreateResult>;
  addEvaluation(params: { subjectUri: string; evaluators: string[]; summary: string }): Promise<CreateResult>;

  createCollection(params: { title: string; claims: Array<{ uri: string; cid: string; weight: string }>; shortDescription?: string; coverPhoto?: Blob }): Promise<CreateResult>;
  getCollection(uri: string): Promise<{ uri: string; cid: string; record: CollectionRecord }>;
  listCollections(params?: ListParams): Promise<PaginatedList<{ uri: string; cid: string; record: CollectionRecord }>>;
}

/**
 * Collaborator operations (SDS only)
 */
export interface CollaboratorOperations {
  grant(params: { userDid: string; role: RepositoryRole }): Promise<void>;
  revoke(params: { userDid: string }): Promise<void>;
  list(): Promise<RepositoryAccessGrant[]>;
  hasAccess(userDid: string): Promise<boolean>;
  getRole(userDid: string): Promise<RepositoryRole | null>;
}

/**
 * Organization operations (SDS only)
 */
export interface OrganizationOperations {
  create(params: { name: string; description?: string; handle?: string }): Promise<OrganizationInfo>;
  get(did: string): Promise<OrganizationInfo | null>;
  list(): Promise<OrganizationInfo[]>;
}
