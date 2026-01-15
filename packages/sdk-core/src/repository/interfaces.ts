/**
 * Repository interfaces - Operation contracts for repository functionality.
 *
 * This module defines the interfaces for all repository operations,
 * providing clear contracts for record management, blob handling,
 * profile management, and domain-specific operations.
 *
 * @packageDocumentation
 */

import type { EventEmitter } from "eventemitter3";
import type { HypercertClaim, HypercertCollection } from "../services/hypercerts/types.js";
import type {
  CreateResult,
  HypercertEvidenceInput,
  ListParams,
  OrganizationInfo,
  PaginatedList,
  ProgressStep,
  RepositoryAccessGrant,
  RepositoryRole,
  UpdateResult,
} from "./types.js";

// ============================================================================
// Hypercert Operation Types
// ============================================================================

/**
 * Parameters for creating a new hypercert.
 *
 * This interface defines all the data needed to create a hypercert
 * along with optional related records (location, contributions, evidence).
 *
 * @example Minimal hypercert
 * ```typescript
 * const params: CreateHypercertParams = {
 *   title: "Community Garden Project",
 *   description: "Established a 1-acre community garden serving 50 families",
 *   workScope: "Food Security",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-06-30",
 *   rights: {
 *     name: "Attribution",
 *     type: "license",
 *     description: "CC-BY-4.0",
 *   },
 * };
 * ```
 *
 * @example Full hypercert with all options
 * ```typescript
 * const params: CreateHypercertParams = {
 *   title: "Reforestation Initiative",
 *   description: "Planted 10,000 trees in deforested areas",
 *   shortDescription: "10K trees planted",
 *   workScope: "Environmental Restoration",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-12-31",
 *   rights: {
 *     name: "Open Impact",
 *     type: "impact-rights",
 *     description: "Transferable impact rights",
 *   },
 *   image: coverImageBlob,
 *   location: {
 *     value: "Amazon Rainforest, Brazil",
 *     name: "Amazon Basin",
 *     description: "Southern Amazon region",
 *   },
 *   contributions: [
 *     {
 *       contributors: ["did:plc:lead-org"],
 *       role: "coordinator",
 *       description: "Project coordination and funding",
 *     },
 *     {
 *       contributors: ["did:plc:local-partner"],
 *       role: "implementer",
 *       description: "On-ground planting and monitoring",
 *     },
 *   ],
 *   evidence: [
 *     {
 *       uri: "https://example.com/satellite-data",
 *       description: "Satellite imagery showing reforestation progress",
 *     },
 *   ],
 *   onProgress: (step) => console.log(`${step.name}: ${step.status}`),
 * };
 * ```
 */

export interface CreateHypercertParams {
  /**
   * Title of the hypercert.
   *
   * Should be concise but descriptive of the impact claim.
   */
  title: string;

  /**
   * Detailed description of the impact.
   *
   * Can include methodology, outcomes, and other relevant details.
   * Supports markdown formatting.
   */
  description: string;

  /**
   * Scope of work or impact area.
   * Logical scope of the work using label-based conditions. All labels in `withinAllOf` must apply; at least one label in `withinAnyOf` must apply if provided; no label in `withinNoneOf` may apply.
   *
   * @example "Climate Action", "Education", "Healthcare"
   */
  workScope?: {
    withinAllOf?: string[];
    withinAnyOf?: string[];
    withinNoneOf?: string[];
  };

  /**
   * Start date of the work period.
   *
   * ISO 8601 date format (YYYY-MM-DD).
   */
  startDate: string;

  /**
   * End date of the work period.
   *
   * ISO 8601 date format (YYYY-MM-DD).
   */
  endDate: string;

  /**
   * Rights associated with the hypercert.
   */
  rights: {
    /**
     * Name of the rights.
     *
     * @example "Attribution", "Impact Rights", "Public Domain"
     */
    name: string;

    /**
     * Type of rights.
     *
     * @example "license", "impact-rights", "ownership"
     */
    type: string;

    /**
     * Description of the rights terms.
     *
     * @example "CC-BY-4.0", "Transferable impact rights"
     */
    description: string;
  };

  /**
   * Short description for display in lists/cards.
   *
   * Required field. Should be under 300 characters.
   */
  shortDescription: string;

  /**
   * Optional cover image for the hypercert.
   *
   * Recommended size: 1200x630 pixels (social media preview ratio).
   */
  image?: Blob;

  /**
   * Optional geographic location of the impact.
   */
  location?: AttachLocationParams;

  /**
   * Optional list of contributions to the impact.
   *
   * Use this to credit multiple contributors with different roles.
   */
  contributions?: Array<{
    /**
     * DIDs of the contributors.
     */
    contributors: string[];

    /**
     * Role in the contribution.
     *
     * @example "coordinator", "implementer", "funder", "volunteer"
     */
    role: string;

    /**
     * Description of the contribution.
     */
    description?: string;
  }>;

  /**
   * Optional evidence supporting the impact claim.
   */
  evidence?: Array<Omit<HypercertEvidenceInput, "subjectUri">>;

  /**
   * Optional callback for progress updates during creation.
   *
   * Called for each step of the creation process (image upload,
   * record creation, attachment linking, etc.).
   */
  onProgress?: (step: ProgressStep) => void;
}

export interface CreateOrganizationParams {
  /**
   * Name of the organization
   */
  name: string;
  /**
   * The handle of the organization without attaching the SDS domain
   *
   * @example: "gainforest" for "gainforest.sds.hypercerts.org"
   */
  handlePrefix: string;
  /**
   * Optional description of the organization
   */
  description?: string;
}

/**
 * Parameters for attaching a location to a hypercert.
 *
 * @example Using a string location
 * ```typescript
 * const params: AttachLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: "https://locationuri.com",
 *   name: "San Francisco",
 *   description: "Project location in SF Bay Area",
 * };
 * ```
 *
 * @example Using a GeoJSON Blob
 * ```typescript
 * const geojsonBlob = new Blob(
 *   [JSON.stringify({ type: "Point", coordinates: [-122.4194, 37.7749] })],
 *   { type: "application/geo+json" }
 * );
 * const params: AttachLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "geojson-point",
 *   location: geojsonBlob,
 * };
 * ```
 */
export interface AttachLocationParams {
  /** The version of the Location Protocol */
  lpVersion: string;
  /** The Spatial Reference System URI (e.g., http://www.opengis.net/def/crs/OGC/1.3/CRS84) that defines the coordinate system. */
  srs: string;
  /** An identifier for the format of the location data (e.g., coordinate-decimal, geojson-point) */
  locationType: "coordinate-decimal" | "geojson-point" | (string & {});
  /** Location data as either a URL string or a GeoJSON Blob */
  location: string | Blob;
  /** Optional name for this location */
  name?: string;
  /** Optional description for this location */
  description?: string;
}

/**
 * Result of creating a hypercert.
 *
 * Contains URIs and CIDs for all created records.
 */
export interface CreateHypercertResult {
  /**
   * AT-URI of the main hypercert record.
   */
  hypercertUri: string;

  /**
   * AT-URI of the associated rights record.
   */
  rightsUri: string;

  /**
   * CID of the hypercert record.
   */
  hypercertCid: string;

  /**
   * CID of the rights record.
   */
  rightsCid: string;

  /**
   * AT-URI of the location record, if location was provided.
   */
  locationUri?: string;

  /**
   * AT-URIs of contribution records, if contributions were provided.
   */
  contributionUris?: string[];
}

// ============================================================================
// Operation Interfaces
// ============================================================================

/**
 * Low-level record operations for AT Protocol CRUD.
 *
 * Use this interface for direct access to AT Protocol records when
 * the high-level APIs don't meet your needs.
 *
 * @example
 * ```typescript
 * // Create a record
 * const { uri, cid } = await repo.records.create({
 *   collection: "org.example.mytype",
 *   record: { foo: "bar", createdAt: new Date().toISOString() },
 * });
 *
 * // Get a record
 * const { value } = await repo.records.get({
 *   collection: "org.example.mytype",
 *   rkey: "abc123",
 * });
 *
 * // Update a record
 * await repo.records.update({
 *   collection: "org.example.mytype",
 *   rkey: "abc123",
 *   record: { ...value, foo: "updated" },
 * });
 *
 * // List records
 * const { records, cursor } = await repo.records.list({
 *   collection: "org.example.mytype",
 *   limit: 50,
 * });
 *
 * // Delete a record
 * await repo.records.delete({
 *   collection: "org.example.mytype",
 *   rkey: "abc123",
 * });
 * ```
 */
export interface RecordOperations {
  /**
   * Creates a new record in a collection.
   *
   * @param params - Creation parameters
   * @param params.collection - NSID of the collection (e.g., "org.hypercerts.hypercert")
   * @param params.record - Record data (must conform to collection's lexicon)
   * @param params.rkey - Optional record key. Auto-generated if not provided.
   * @returns Promise resolving to the created record's URI and CID
   */
  create(params: { collection: string; record: unknown; rkey?: string }): Promise<CreateResult>;

  /**
   * Updates an existing record.
   *
   * @param params - Update parameters
   * @param params.collection - NSID of the collection
   * @param params.rkey - Record key to update
   * @param params.record - New record data (replaces entire record)
   * @returns Promise resolving to the updated record's URI and CID
   */
  update(params: { collection: string; rkey: string; record: unknown }): Promise<UpdateResult>;

  /**
   * Gets a single record by collection and key.
   *
   * @param params - Get parameters
   * @param params.collection - NSID of the collection
   * @param params.rkey - Record key
   * @returns Promise resolving to the record's URI, CID, and value
   */
  get(params: { collection: string; rkey: string }): Promise<{ uri: string; cid: string; value: unknown }>;

  /**
   * Lists records in a collection with pagination.
   *
   * @param params - List parameters
   * @param params.collection - NSID of the collection
   * @param params.limit - Maximum records to return (default varies by server)
   * @param params.cursor - Pagination cursor from previous response
   * @returns Promise resolving to paginated list of records
   */
  list(params: {
    collection: string;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedList<{ uri: string; cid: string; value: unknown }>>;

  /**
   * Deletes a record.
   *
   * @param params - Delete parameters
   * @param params.collection - NSID of the collection
   * @param params.rkey - Record key to delete
   */
  delete(params: { collection: string; rkey: string }): Promise<void>;
}

/**
 * Blob operations for binary data handling.
 *
 * Blobs are used for images, files, and other binary content.
 * They are referenced from records using blob references.
 *
 * @example
 * ```typescript
 * // Upload an image
 * const imageBlob = new Blob([imageData], { type: "image/jpeg" });
 * const { ref, mimeType, size } = await repo.blobs.upload(imageBlob);
 *
 * // Use the ref in a record
 * await repo.records.create({
 *   collection: "org.example.post",
 *   record: {
 *     text: "Hello!",
 *     image: ref,  // { $link: "bafyrei..." }
 *   },
 * });
 *
 * // Retrieve a blob
 * const { data, mimeType } = await repo.blobs.get(ref.$link);
 * ```
 */
export interface BlobOperations {
  /**
   * Uploads a blob to the server.
   *
   * @param blob - The blob to upload
   * @returns Promise resolving to blob reference and metadata
   */
  upload(blob: Blob): Promise<{
    /**
     * Blob reference to use in records.
     *
     * Contains `$link` property with the CID.
     */
    ref: { $link: string };

    /**
     * MIME type of the uploaded blob.
     */
    mimeType: string;

    /**
     * Size of the blob in bytes.
     */
    size: number;
  }>;

  /**
   * Retrieves a blob by its CID.
   *
   * @param cid - Content Identifier of the blob
   * @returns Promise resolving to blob data and MIME type
   */
  get(cid: string): Promise<{
    /**
     * Raw blob data as Uint8Array.
     */
    data: Uint8Array;

    /**
     * MIME type of the blob.
     */
    mimeType: string;
  }>;
}

/**
 * Profile operations for user profile management.
 *
 * @example
 * ```typescript
 * // Get profile
 * const profile = await repo.profile.get();
 * console.log(profile.displayName);
 *
 * // Update profile
 * await repo.profile.update({
 *   displayName: "New Name",
 *   description: "Updated bio",
 * });
 *
 * // Update avatar
 * await repo.profile.update({
 *   avatar: new Blob([avatarData], { type: "image/png" }),
 * });
 *
 * // Clear a field by passing null
 * await repo.profile.update({
 *   website: null,  // Removes website
 * });
 * ```
 */
export interface ProfileOperations {
  /**
   * Gets the repository's profile.
   *
   * @returns Promise resolving to profile data
   */
  get(): Promise<{
    /**
     * User's handle (e.g., "alice.bsky.social").
     */
    handle: string;

    /**
     * Display name.
     */
    displayName?: string;

    /**
     * Profile description/bio.
     */
    description?: string;

    /**
     * Avatar image URL or blob reference.
     */
    avatar?: string;

    /**
     * Banner image URL or blob reference.
     */
    banner?: string;

    /**
     * Website URL.
     */
    website?: string;
  }>;

  /**
   * Updates the repository's profile.
   *
   * Pass `null` to clear a field. Omitted fields are unchanged.
   *
   * @param params - Fields to update
   * @returns Promise resolving to update result
   */
  update(params: {
    displayName?: string | null;
    description?: string | null;
    avatar?: Blob | null;
    banner?: Blob | null;
    website?: string | null;
  }): Promise<UpdateResult>;
}

/**
 * Events emitted by hypercert operations.
 *
 * Use these to track progress of complex operations or react
 * to record changes.
 */
export interface HypercertEvents {
  /**
   * Emitted when a hypercert record is created.
   */
  recordCreated: { uri: string; cid: string };

  /**
   * Emitted when a hypercert record is updated.
   */
  recordUpdated: { uri: string; cid: string };

  /**
   * Emitted when a rights record is created.
   */
  rightsCreated: { uri: string; cid: string };

  /**
   * Emitted when a location is attached to a hypercert.
   */
  locationAttached: { uri: string; cid: string; hypercertUri: string };

  /**
   * Emitted when a contribution record is created.
   */
  contributionCreated: { uri: string; cid: string };

  /**
   * Emitted when evidence is added to a hypercert.
   */
  evidenceAdded: { uri: string; cid: string };

  /**
   * Emitted when a collection is created.
   */
  collectionCreated: { uri: string; cid: string };
}

/**
 * High-level hypercert operations.
 *
 * Provides a convenient API for creating and managing hypercerts
 * with automatic handling of related records (rights, locations,
 * contributions, etc.).
 *
 * Extends EventEmitter to provide progress events.
 *
 * @example Basic usage
 * ```typescript
 * // Create a hypercert
 * const result = await repo.hypercerts.create({
 *   title: "Impact Project",
 *   description: "Description...",
 *   workScope: "Climate",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-12-31",
 *   rights: { name: "CC-BY", type: "license", description: "..." },
 * });
 *
 * // List hypercerts
 * const { records } = await repo.hypercerts.list({ limit: 20 });
 *
 * // Get a specific hypercert
 * const hypercert = await repo.hypercerts.get(result.hypercertUri);
 * ```
 *
 * @example With events
 * ```typescript
 * repo.hypercerts.on("recordCreated", ({ uri }) => {
 *   console.log(`Created: ${uri}`);
 * });
 * ```
 */
export interface HypercertOperations extends EventEmitter<HypercertEvents> {
  /**
   * Creates a new hypercert with all related records.
   *
   * @param params - Creation parameters
   * @returns Promise resolving to URIs and CIDs of created records
   */
  create(params: CreateHypercertParams): Promise<CreateHypercertResult>;

  /**
   * Updates an existing hypercert.
   *
   * @param params - Update parameters
   * @param params.uri - AT-URI of the hypercert to update
   * @param params.updates - Fields to update
   * @param params.image - New image, or `null` to remove
   * @returns Promise resolving to update result
   */
  update(params: {
    uri: string;
    updates: Partial<Omit<HypercertClaim, "$type" | "createdAt" | "rights">>;
    image?: Blob | null;
  }): Promise<UpdateResult>;

  /**
   * Gets a hypercert by URI.
   *
   * @param uri - AT-URI of the hypercert
   * @returns Promise resolving to hypercert data
   */
  get(uri: string): Promise<{ uri: string; cid: string; record: HypercertClaim }>;

  /**
   * Lists hypercerts with pagination.
   *
   * @param params - Optional pagination parameters
   * @returns Promise resolving to paginated list
   */
  list(params?: ListParams): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertClaim }>>;

  /**
   * Deletes a hypercert.
   *
   * Note: This does not automatically delete related records
   * (rights, locations, contributions).
   *
   * @param uri - AT-URI of the hypercert to delete
   */
  delete(uri: string): Promise<void>;

  /**
   * Attaches a location to an existing hypercert.
   *
   * @param uri - AT-URI of the hypercert
   * @param location - Location data
   * @param location.value - Location value (address, coordinates, or description)
   * @param location.srs - Spatial Reference System (required). Use 'EPSG:4326' for WGS84 lat/lon coordinates.
   * @param location.name - Optional human-readable location name
   * @param location.description - Optional description of the location
   * @param location.geojson - Optional GeoJSON blob for precise boundaries
   * @returns Promise resolving to location record result
   */
  attachLocation(uri: string, location: AttachLocationParams): Promise<CreateResult>;

  /**
   * Adds evidence to an existing hypercert.
   *
   * @param evidence - Evidence item to add
   * @returns Promise resolving to update result
   */
  addEvidence(evidence: HypercertEvidenceInput): Promise<UpdateResult>;

  /**
   * Creates a contribution record.
   *
   * @param params - Contribution parameters
   * @returns Promise resolving to contribution record result
   */
  addContribution(params: {
    hypercertUri?: string;
    contributors: string[];
    role: string;
    description?: string;
  }): Promise<CreateResult>;

  /**
   * Creates a measurement record for a hypercert.
   *
   * @param params - Measurement parameters
   * @returns Promise resolving to measurement record result
   */
  addMeasurement(params: {
    hypercertUri: string;
    measurers: string[];
    metric: string;
    value: string;
    methodUri?: string;
    evidenceUris?: string[];
  }): Promise<CreateResult>;

  /**
   * Creates an evaluation record.
   *
   * @param params - Evaluation parameters
   * @returns Promise resolving to evaluation record result
   */
  addEvaluation(params: { subjectUri: string; evaluators: string[]; summary: string }): Promise<CreateResult>;

  /**
   * Creates a collection of hypercerts.
   *
   * @param params - Collection parameters
   * @returns Promise resolving to collection record result
   */
  createCollection(params: {
    title: string;
    claims: Array<{ uri: string; cid: string; weight: string }>;
    shortDescription?: string;
    coverPhoto?: Blob;
  }): Promise<CreateResult>;

  /**
   * Gets a collection by URI.
   *
   * @param uri - AT-URI of the collection
   * @returns Promise resolving to collection data
   */
  getCollection(uri: string): Promise<{ uri: string; cid: string; record: HypercertCollection }>;

  /**
   * Lists collections with pagination.
   *
   * @param params - Optional pagination parameters
   * @returns Promise resolving to paginated list
   */
  listCollections(
    params?: ListParams,
  ): Promise<PaginatedList<{ uri: string; cid: string; record: HypercertCollection }>>;
}

/**
 * Collaborator operations for SDS access control.
 *
 * **SDS Only**: These operations are only available on Shared Data Servers.
 *
 * @example
 * ```typescript
 * // Grant access
 * await repo.collaborators.grant({
 *   userDid: "did:plc:new-user",
 *   role: "editor",
 * });
 *
 * // List collaborators
 * const collaborators = await repo.collaborators.list();
 *
 * // Check access
 * const hasAccess = await repo.collaborators.hasAccess("did:plc:someone");
 * const role = await repo.collaborators.getRole("did:plc:someone");
 *
 * // Get current user permissions
 * const permissions = await repo.collaborators.getPermissions();
 * if (permissions.admin) {
 *   // Can manage collaborators
 * }
 *
 * // Transfer ownership
 * await repo.collaborators.transferOwnership({
 *   newOwnerDid: "did:plc:new-owner",
 * });
 *
 * // Revoke access
 * await repo.collaborators.revoke({ userDid: "did:plc:former-user" });
 * ```
 */

export interface GrantAccessParams {
  /**
   * DID of the user to grant access to
   */
  userDid: string;
  /**
   * Role to assign
   */
  role: RepositoryRole;
}
export interface CollaboratorOperations {
  /**
   * Grants repository access to a user.
   *
   * @param params - Grant parameters
   * @param params.userDid - DID of the user to grant access to
   * @param params.role - Role to assign
   */
  grant(params: GrantAccessParams): Promise<void>;

  /**
   * Revokes repository access from a user.
   *
   * @param params - Revoke parameters
   * @param params.userDid - DID of the user to revoke access from
   */
  revoke(params: { userDid: string }): Promise<void>;

  /**
   * Lists all collaborators on the repository.
   *
   * @param params - Optional pagination parameters
   * @param params.limit - Maximum number of results (1-100, default 50)
   * @param params.cursor - Pagination cursor from previous response
   * @returns Promise resolving to collaborators and optional cursor
   */
  list(params?: { limit?: number; cursor?: string }): Promise<{
    collaborators: RepositoryAccessGrant[];
    cursor?: string;
  }>;

  /**
   * Checks if a user has any access to the repository.
   *
   * @param userDid - DID to check
   * @returns Promise resolving to boolean
   */
  hasAccess(userDid: string): Promise<boolean>;

  /**
   * Gets the role assigned to a user.
   *
   * @param userDid - DID to check
   * @returns Promise resolving to role, or `null` if no access
   */
  getRole(userDid: string): Promise<RepositoryRole | null>;

  /**
   * Gets the current user's permissions for this repository.
   *
   * @returns Promise resolving to permission flags
   */
  getPermissions(): Promise<import("../core/types.js").CollaboratorPermissions>;

  /**
   * Transfers repository ownership to another user.
   *
   * **WARNING**: This action is irreversible. The new owner will have
   * full control of the repository.
   *
   * @param params - Transfer parameters
   * @param params.newOwnerDid - DID of the user to transfer ownership to
   */
  transferOwnership(params: { newOwnerDid: string }): Promise<void>;
}

/**
 * Organization operations for SDS organization management.
 *
 * **SDS Only**: These operations are only available on Shared Data Servers.
 *
 * @example
 * ```typescript
 * // Create an organization
 * const org = await repo.organizations.create({
 *   name: "My Team",
 *   description: "A team for impact projects",
 * });
 *
 * // List organizations
 * const orgs = await repo.organizations.list();
 *
 * // Get organization details
 * const orgInfo = await repo.organizations.get(org.did);
 * ```
 */
export interface OrganizationOperations {
  /**
   * Creates a new organization.
   *
   * @param params - Organization creation parameters
   * @returns Promise resolving to organization info
   */
  create(params: CreateOrganizationParams): Promise<OrganizationInfo>;

  /**
   * Gets an organization by DID.
   *
   * @param did - Organization DID
   * @returns Promise resolving to organization info, or `null` if not found
   */
  get(did: string): Promise<OrganizationInfo | null>;

  /**
   * Lists organizations the current user has access to.
   *
   * @param params - Optional pagination parameters
   * @param params.limit - Maximum number of results (1-100, default 50)
   * @param params.cursor - Pagination cursor from previous response
   * @returns Promise resolving to organizations and optional cursor
   */
  list(params?: { limit?: number; cursor?: string }): Promise<{
    organizations: OrganizationInfo[];
    cursor?: string;
  }>;
}
