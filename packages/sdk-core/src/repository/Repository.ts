/**
 * Repository - Unified fluent API for ATProto repository operations
 * @packageDocumentation
 */

import { Agent } from "@atproto/api";
import { SDSRequiredError } from "../core/errors.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { Session } from "../core/types.js";
import { HYPERCERT_LEXICONS } from "../lexicons/hypercerts/index.js";
import type { LexiconRegistry } from "./LexiconRegistry.js";

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
 * Repository provides a fluent API for ATProto repository operations
 */
export class Repository {
  private session: Session;
  private serverUrl: string;
  private repoDid: string;
  private lexiconRegistry: LexiconRegistry;
  private logger?: LoggerInterface;
  private agent: Agent;
  private _isSDS: boolean;

  // Lazily initialized operations
  private _records?: RecordOperationsImpl;
  private _blobs?: BlobOperationsImpl;
  private _profile?: ProfileOperationsImpl;
  private _hypercerts?: HypercertOperationsImpl;
  private _collaborators?: CollaboratorOperationsImpl;
  private _organizations?: OrganizationOperationsImpl;

  constructor(
    session: Session,
    serverUrl: string,
    repoDid: string,
    lexiconRegistry: LexiconRegistry,
    isSDS: boolean,
    logger?: LoggerInterface,
  ) {
    this.session = session;
    this.serverUrl = serverUrl;
    this.repoDid = repoDid;
    this.lexiconRegistry = lexiconRegistry;
    this._isSDS = isSDS;
    this.logger = logger;

    // Create Agent with OAuth session
    this.agent = new Agent(session);
    this.lexiconRegistry.addToAgent(this.agent);

    // Register hypercert lexicons
    this.lexiconRegistry.registerMany(HYPERCERT_LEXICONS);
  }

  /**
   * The repository DID
   */
  get did(): string {
    return this.repoDid;
  }

  /**
   * Check if this is a Shared Data Server
   */
  get isSDS(): boolean {
    return this._isSDS;
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Get a repository for a different DID (same server)
   */
  repo(did: string): Repository {
    return new Repository(this.session, this.serverUrl, did, this.lexiconRegistry, this._isSDS, this.logger);
  }

  /**
   * Low-level record operations
   */
  get records(): RecordOperations {
    if (!this._records) {
      this._records = new RecordOperationsImpl(this.agent, this.repoDid, this.lexiconRegistry);
    }
    return this._records;
  }

  /**
   * Blob operations
   */
  get blobs(): BlobOperations {
    if (!this._blobs) {
      this._blobs = new BlobOperationsImpl(this.agent, this.repoDid, this.serverUrl);
    }
    return this._blobs;
  }

  /**
   * Profile operations
   */
  get profile(): ProfileOperations {
    if (!this._profile) {
      this._profile = new ProfileOperationsImpl(this.agent, this.repoDid, this.serverUrl);
    }
    return this._profile;
  }

  /**
   * Hypercert operations (high-level)
   */
  get hypercerts(): HypercertOperations {
    if (!this._hypercerts) {
      this._hypercerts = new HypercertOperationsImpl(
        this.agent,
        this.repoDid,
        this.serverUrl,
        this.lexiconRegistry,
        this.logger,
      );
    }
    return this._hypercerts;
  }

  /**
   * Collaborator operations (SDS only)
   * @throws SDSRequiredError if not an SDS server
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
   * Organization operations (SDS only)
   * @throws SDSRequiredError if not an SDS server
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
