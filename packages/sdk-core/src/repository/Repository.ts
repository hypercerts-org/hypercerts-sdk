/**
 * Repository - Unified fluent API for ATProto repository operations.
 *
 * This module provides the main interface for interacting with AT Protocol
 * data servers (PDS and SDS) through a consistent, fluent API.
 *
 * @packageDocumentation
 */

import { SDSRequiredError } from "../core/errors.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { Session } from "../core/types.js";
import { ConfigurableAgent } from "../agent/ConfigurableAgent.js";
import { LexiconRegistry } from "./LexiconRegistry.js";
import type { Agent } from "@atproto/api";

// Types
export type {
  RepositoryOptions,
  CreateResult,
  UpdateResult,
  PaginatedList,
  ListParams,
  RepositoryRole,
  RepositoryAccessGrant,
  OrganizationInfo,
  ProgressStep,
} from "./types.js";

// Interfaces
export type {
  RecordOperations,
  BlobOperations,
  ProfileOperations,
  HypercertOperations,
  HypercertEvents,
  CollaboratorOperations,
  OrganizationOperations,
  CreateHypercertParams,
  CreateHypercertResult,
} from "./interfaces.js";

// Implementations
import { RecordOperationsImpl } from "./RecordOperationsImpl.js";
import { BlobOperationsImpl } from "./BlobOperationsImpl.js";
import { ProfileOperationsImpl } from "./ProfileOperationsImpl.js";
import { HypercertOperationsImpl } from "./HypercertOperationsImpl.js";
import { CollaboratorOperationsImpl } from "./CollaboratorOperationsImpl.js";
import { OrganizationOperationsImpl } from "./OrganizationOperationsImpl.js";

import type {
  RecordOperations,
  BlobOperations,
  ProfileOperations,
  HypercertOperations,
  CollaboratorOperations,
  OrganizationOperations,
} from "./interfaces.js";

/**
 * Repository provides a fluent API for AT Protocol data operations.
 *
 * This class is the primary interface for working with data in the AT Protocol
 * ecosystem. It provides organized access to:
 *
 * - **Records**: Low-level CRUD operations for any AT Protocol record type
 * - **Blobs**: Binary data upload and retrieval (images, files)
 * - **Profile**: User profile management
 * - **Hypercerts**: High-level hypercert creation and management
 * - **Collaborators**: Access control for shared repositories (SDS only)
 * - **Organizations**: Organization management (SDS only)
 *
 * @remarks
 * The Repository uses lazy initialization for operation handlers - they are
 * created only when first accessed. This improves performance when you only
 * need a subset of operations.
 *
 * **PDS vs SDS:**
 * - **PDS (Personal Data Server)**: User's own data storage. All operations
 *   except collaborators and organizations are available.
 * - **SDS (Shared Data Server)**: Collaborative data storage with access
 *   control. All operations including collaborators and organizations.
 *
 * @example Basic usage
 * ```typescript
 * // Get a repository from the SDK
 * const repo = sdk.repository(session);
 *
 * // Access user profile
 * const profile = await repo.profile.get();
 *
 * // Create a hypercert
 * const result = await repo.hypercerts.create({
 *   title: "My Impact",
 *   description: "Description of the impact",
 *   workScope: "Climate Action",
 *   workTimeframeFrom: "2024-01-01",
 *   workTimeframeTo: "2024-12-31",
 *   rights: {
 *     name: "Attribution",
 *     type: "license",
 *     description: "CC-BY-4.0",
 *   },
 * });
 * ```
 *
 * @example Working with a different user's repository
 * ```typescript
 * // Get the current user's repo
 * const myRepo = sdk.repository(session);
 *
 * // Get another user's repo (read-only for most operations)
 * const otherRepo = myRepo.repo("did:plc:other-user-did");
 * const theirProfile = await otherRepo.profile.get();
 * ```
 *
 * @example SDS operations
 * ```typescript
 * // Get SDS repository for collaborator features
 * const sdsRepo = sdk.repository(session, { server: "sds" });
 *
 * // Manage collaborators
 * await sdsRepo.collaborators.grant({
 *   userDid: "did:plc:collaborator",
 *   role: "editor",
 * });
 *
 * // List organizations
 * const orgs = await sdsRepo.organizations.list();
 * ```
 *
 * @see {@link ATProtoSDK.repository} for creating Repository instances
 */
export class Repository {
  private session: Session;
  private serverUrl: string;
  private repoDid: string;
  private logger?: LoggerInterface;
  private agent: Agent;
  private _isSDS: boolean;
  private lexiconRegistry: LexiconRegistry;

  // Lazily initialized operations
  private _records?: RecordOperationsImpl;
  private _blobs?: BlobOperationsImpl;
  private _profile?: ProfileOperationsImpl;
  private _hypercerts?: HypercertOperationsImpl;
  private _collaborators?: CollaboratorOperationsImpl;
  private _organizations?: OrganizationOperationsImpl;

  /**
   * Creates a new Repository instance.
   *
   * @param session - Authenticated OAuth session
   * @param serverUrl - Base URL of the AT Protocol server
   * @param repoDid - DID of the repository to operate on
   * @param isSDS - Whether this is a Shared Data Server
   * @param logger - Optional logger for debugging
   * @param lexiconRegistry - Registry for custom lexicon management
   *
   * @remarks
   * This constructor is typically not called directly. Use
   * {@link ATProtoSDK.repository} to create Repository instances.
   *
   * @internal
   */
  constructor(
    session: Session,
    serverUrl: string,
    repoDid: string,
    isSDS: boolean,
    logger?: LoggerInterface,
    lexiconRegistry?: LexiconRegistry,
  ) {
    this.session = session;
    this.serverUrl = serverUrl;
    this.repoDid = repoDid;
    this._isSDS = isSDS;
    this.logger = logger;
    this.lexiconRegistry = lexiconRegistry || new LexiconRegistry();

    // Create a ConfigurableAgent that routes requests to the specified server URL
    // This allows routing to PDS, SDS, or any custom server while maintaining
    // the OAuth session's authentication
    this.agent = new ConfigurableAgent(session, serverUrl);
  }

  /**
   * The DID (Decentralized Identifier) of this repository.
   *
   * This is the user or organization that owns the repository data.
   *
   * @example
   * ```typescript
   * console.log(`Working with repo: ${repo.did}`);
   * // Output: Working with repo: did:plc:abc123xyz...
   * ```
   */
  get did(): string {
    return this.repoDid;
  }

  /**
   * Whether this repository is on a Shared Data Server (SDS).
   *
   * SDS servers support additional features like collaborators and
   * organizations. Attempting to use these features on a PDS will
   * throw {@link SDSRequiredError}.
   *
   * @example
   * ```typescript
   * if (repo.isSDS) {
   *   const collaborators = await repo.collaborators.list();
   * }
   * ```
   */
  get isSDS(): boolean {
    return this._isSDS;
  }

  /**
   * Gets the server URL this repository connects to.
   *
   * @returns The base URL of the AT Protocol server
   *
   * @example
   * ```typescript
   * console.log(repo.getServerUrl());
   * // Output: https://bsky.social or https://sds.hypercerts.org
   * ```
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Creates a Repository instance for a different DID on the same server.
   *
   * This allows you to read data from other users' repositories while
   * maintaining your authenticated session.
   *
   * @param did - The DID of the repository to access
   * @returns A new Repository instance for the specified DID
   *
   * @remarks
   * Write operations on another user's repository will typically fail
   * unless you have been granted collaborator access (SDS only).
   *
   * @example
   * ```typescript
   * // Read another user's profile
   * const otherRepo = repo.repo("did:plc:other-user");
   * const profile = await otherRepo.profile.get();
   *
   * // List their public hypercerts
   * const hypercerts = await otherRepo.hypercerts.list();
   * ```
   */
  repo(did: string): Repository {
    return new Repository(this.session, this.serverUrl, did, this._isSDS, this.logger, this.lexiconRegistry);
  }

  /**
   * Gets the LexiconRegistry instance for managing custom lexicons.
   *
   * The registry is shared across all operations in this repository and
   * enables validation of custom record types.
   *
   * @returns The {@link LexiconRegistry} instance
   *
   * @example
   * ```typescript
   * // Access the registry
   * const registry = repo.getLexiconRegistry();
   *
   * // Register a custom lexicon
   * registry.register({
   *   lexicon: 1,
   *   id: "org.myapp.evaluation",
   *   defs: {
   *     main: {
   *       type: "record",
   *       key: "tid",
   *       record: {
   *         type: "object",
   *         required: ["$type", "score"],
   *         properties: {
   *           "$type": { type: "string", const: "org.myapp.evaluation" },
   *           score: { type: "integer", minimum: 0, maximum: 100 }
   *         }
   *       }
   *     }
   *   }
   * });
   *
   * // Now create records using the custom lexicon
   * await repo.records.create({
   *   collection: "org.myapp.evaluation",
   *   record: {
   *     $type: "org.myapp.evaluation",
   *     score: 85
   *   }
   * });
   * ```
   */
  getLexiconRegistry(): LexiconRegistry {
    return this.lexiconRegistry;
  }

  /**
   * Low-level record operations for CRUD on any AT Protocol record type.
   *
   * Use this for direct access to AT Protocol records when the high-level
   * APIs don't meet your needs.
   *
   * @returns {@link RecordOperations} interface for record CRUD
   *
   * @example
   * ```typescript
   * // Create a custom record
   * const result = await repo.records.create({
   *   collection: "org.example.myRecord",
   *   record: { foo: "bar" },
   * });
   *
   * // List records in a collection
   * const list = await repo.records.list({
   *   collection: "org.example.myRecord",
   *   limit: 50,
   * });
   *
   * // Get a specific record
   * const record = await repo.records.get({
   *   collection: "org.example.myRecord",
   *   rkey: "abc123",
   * });
   * ```
   */
  get records(): RecordOperations {
    if (!this._records) {
      this._records = new RecordOperationsImpl(this.agent, this.repoDid, this.lexiconRegistry);
    }
    return this._records;
  }

  /**
   * Blob operations for uploading and retrieving binary data.
   *
   * Blobs are used for images, files, and other binary content associated
   * with records.
   *
   * @returns {@link BlobOperations} interface for blob management
   *
   * @example
   * ```typescript
   * // Upload an image
   * const imageBlob = new Blob([imageData], { type: "image/png" });
   * const uploadResult = await repo.blobs.upload(imageBlob);
   *
   * // The ref can be used in records
   * console.log(uploadResult.ref.$link);  // CID of the blob
   *
   * // Retrieve a blob by CID
   * const { data, mimeType } = await repo.blobs.get(cid);
   * ```
   */
  get blobs(): BlobOperations {
    if (!this._blobs) {
      this._blobs = new BlobOperationsImpl(this.agent, this.repoDid, this.serverUrl);
    }
    return this._blobs;
  }

  /**
   * Profile operations for managing user profiles.
   *
   * @returns {@link ProfileOperations} interface for profile management
   *
   * @example
   * ```typescript
   * // Get current profile
   * const profile = await repo.profile.get();
   * console.log(profile.displayName);
   *
   * // Update profile
   * await repo.profile.update({
   *   displayName: "New Name",
   *   description: "Updated bio",
   *   avatar: avatarBlob,  // Optional: update avatar image
   * });
   * ```
   */
  get profile(): ProfileOperations {
    if (!this._profile) {
      this._profile = new ProfileOperationsImpl(this.agent, this.repoDid, this.serverUrl);
    }
    return this._profile;
  }

  /**
   * High-level hypercert operations.
   *
   * Provides a convenient API for creating and managing hypercerts,
   * including related records like locations, contributions, and evidence.
   *
   * @returns {@link HypercertOperations} interface with EventEmitter capabilities
   *
   * @example Creating a hypercert
   * ```typescript
   * const result = await repo.hypercerts.create({
   *   title: "Climate Action Project",
   *   description: "Reduced carbon emissions by 1000 tons",
   *   workScope: "Climate Action",
   *   workTimeframeFrom: "2024-01-01",
   *   workTimeframeTo: "2024-06-30",
   *   rights: {
   *     name: "Public Domain",
   *     type: "license",
   *     description: "CC0 - No Rights Reserved",
   *   },
   *   image: imageBlob,  // Optional cover image
   *   location: {
   *     value: "San Francisco, CA",
   *     name: "SF Bay Area",
   *   },
   * });
   * console.log(`Created: ${result.hypercertUri}`);
   * ```
   *
   * @example Listening to events
   * ```typescript
   * repo.hypercerts.on("recordCreated", ({ uri, cid }) => {
   *   console.log(`Record created: ${uri}`);
   * });
   * ```
   */
  get hypercerts(): HypercertOperations {
    if (!this._hypercerts) {
      this._hypercerts = new HypercertOperationsImpl(
        this.agent,
        this.repoDid,
        this.serverUrl,
        this._isSDS,
        this.logger,
      );
    }
    return this._hypercerts;
  }

  /**
   * Collaborator operations for managing repository access.
   *
   * **SDS Only**: This property throws {@link SDSRequiredError} if accessed
   * on a PDS repository.
   *
   * @returns {@link CollaboratorOperations} interface for access control
   * @throws {@link SDSRequiredError} if not connected to an SDS server
   *
   * @example
   * ```typescript
   * // Ensure we're on SDS
   * const sdsRepo = sdk.repository(session, { server: "sds" });
   *
   * // Grant editor access
   * await sdsRepo.collaborators.grant({
   *   userDid: "did:plc:new-collaborator",
   *   role: "editor",
   * });
   *
   * // List all collaborators
   * const collaborators = await sdsRepo.collaborators.list();
   *
   * // Check access
   * const hasAccess = await sdsRepo.collaborators.hasAccess("did:plc:someone");
   *
   * // Revoke access
   * await sdsRepo.collaborators.revoke({ userDid: "did:plc:former-collaborator" });
   * ```
   */
  get collaborators(): CollaboratorOperations {
    if (!this._isSDS) {
      throw new SDSRequiredError("Collaborator operations are only available on SDS servers");
    }
    if (!this._collaborators) {
      this._collaborators = new CollaboratorOperationsImpl(this.session, this.repoDid, this.serverUrl);
    }
    return this._collaborators;
  }

  /**
   * Organization operations for creating and managing organizations.
   *
   * **SDS Only**: This property throws {@link SDSRequiredError} if accessed
   * on a PDS repository.
   *
   * @returns {@link OrganizationOperations} interface for organization management
   * @throws {@link SDSRequiredError} if not connected to an SDS server
   *
   * @example
   * ```typescript
   * // Ensure we're on SDS
   * const sdsRepo = sdk.repository(session, { server: "sds" });
   *
   * // Create an organization
   * const org = await sdsRepo.organizations.create({
   *   name: "My Organization",
   *   description: "A team working on impact certificates",
   *   handle: "my-org",  // Optional custom handle
   * });
   *
   * // List organizations you have access to
   * const orgs = await sdsRepo.organizations.list();
   *
   * // Get specific organization
   * const orgInfo = await sdsRepo.organizations.get(org.did);
   * ```
   */
  get organizations(): OrganizationOperations {
    if (!this._isSDS) {
      throw new SDSRequiredError("Organization operations are only available on SDS servers");
    }
    if (!this._organizations) {
      this._organizations = new OrganizationOperationsImpl(this.session, this.repoDid, this.serverUrl, this.logger);
    }
    return this._organizations;
  }
}
