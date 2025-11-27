import { OAuthClient } from "../auth/OAuthClient.js";
import { LexiconRegistry } from "../repository/LexiconRegistry.js";
import { Repository } from "../repository/Repository.js";
import type { RepositoryOptions } from "../repository/types.js";
import { InMemorySessionStore } from "../storage/InMemorySessionStore.js";
import { InMemoryStateStore } from "../storage/InMemoryStateStore.js";
import type { ATProtoSDKConfig } from "./config.js";
import { ATProtoSDKConfigSchema } from "./config.js";
import { ValidationError } from "./errors.js";
import type { Session } from "./types.js";

/**
 * Options for authorization
 */
export interface AuthorizeOptions {
  /**
   * OAuth scope string (overrides config default)
   */
  scope?: string;
}

/**
 * Main ATProto SDK class
 * Provides OAuth authentication and session management
 */
export class ATProtoSDK {
  private oauthClient: OAuthClient;
  private config: ATProtoSDKConfig;
  private logger?: ATProtoSDKConfig["logger"];
  private lexiconRegistry: LexiconRegistry;

  /**
   * Create a new ATProto SDK instance
   * @param config - SDK configuration
   */
  constructor(config: ATProtoSDKConfig) {
    // Validate configuration
    const validationResult = ATProtoSDKConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new ValidationError(`Invalid SDK configuration: ${validationResult.error.message}`, validationResult.error);
    }

    // Apply defaults for optional storage
    const configWithDefaults: ATProtoSDKConfig = {
      ...config,
      storage: {
        sessionStore: config.storage?.sessionStore ?? new InMemorySessionStore(),
        stateStore: config.storage?.stateStore ?? new InMemoryStateStore(),
      },
    };

    this.config = configWithDefaults;
    this.logger = config.logger;

    // Initialize OAuth client
    this.oauthClient = new OAuthClient(configWithDefaults);

    // Initialize lexicon registry
    this.lexiconRegistry = new LexiconRegistry();

    this.logger?.info("ATProto SDK initialized");
  }

  /**
   * Initiate OAuth authorization flow
   * @param identifier - ATProto identifier (handle, DID, or PDS URL)
   * @param options - Authorization options
   * @returns Authorization URL to redirect user to
   */
  async authorize(identifier: string, options?: AuthorizeOptions): Promise<string> {
    if (!identifier || !identifier.trim()) {
      throw new ValidationError("ATProto identifier is required");
    }

    return this.oauthClient.authorize(identifier.trim(), options);
  }

  /**
   * Handle OAuth callback and exchange authorization code for tokens
   * @param params - URL search parameters from callback
   * @returns OAuth session
   */
  async callback(params: URLSearchParams): Promise<Session> {
    return this.oauthClient.callback(params);
  }

  /**
   * Restore OAuth session by DID
   * Automatically refreshes expired tokens
   * @param did - User DID
   * @returns OAuth session or null if not found
   */
  async restoreSession(did: string): Promise<Session | null> {
    if (!did || !did.trim()) {
      throw new ValidationError("DID is required");
    }

    return this.oauthClient.restore(did.trim());
  }

  /**
   * Revoke OAuth session
   * @param did - User DID
   */
  async revokeSession(did: string): Promise<void> {
    if (!did || !did.trim()) {
      throw new ValidationError("DID is required");
    }

    return this.oauthClient.revoke(did.trim());
  }

  /**
   * Get a repository instance for a session
   * @param session - OAuth session
   * @param options - Repository options (server type or URL)
   * @returns Repository instance with fluent API
   *
   * @example
   * // Use default PDS
   * const repo = sdk.repository(session);
   *
   * // Use configured SDS
   * const sdsRepo = sdk.repository(session, { server: "sds" });
   *
   * // Use custom server URL
   * const customRepo = sdk.repository(session, { serverUrl: "https://custom.server" });
   */
  repository(session: Session, options?: RepositoryOptions): Repository {
    if (!session) {
      throw new ValidationError("Session is required");
    }

    // Determine server URL
    let serverUrl: string;
    let isSDS = false;

    if (options?.serverUrl) {
      // Custom URL provided
      serverUrl = options.serverUrl;
      // Check if it matches configured SDS
      isSDS = this.config.servers?.sds === serverUrl;
    } else if (options?.server === "sds") {
      // Use configured SDS
      if (!this.config.servers?.sds) {
        throw new ValidationError("SDS server URL not configured");
      }
      serverUrl = this.config.servers.sds;
      isSDS = true;
    } else if (options?.server === "pds" || !options?.server) {
      // Use configured PDS (default)
      if (!this.config.servers?.pds) {
        throw new ValidationError("PDS server URL not configured");
      }
      serverUrl = this.config.servers.pds;
      isSDS = false;
    } else {
      // Custom server string (treat as URL)
      serverUrl = options.server;
      isSDS = this.config.servers?.sds === serverUrl;
    }

    // Get repository DID (default to session DID)
    const repoDid = session.did || session.sub;

    return new Repository(session, serverUrl, repoDid, this.lexiconRegistry, isSDS, this.logger);
  }

  /**
   * Get the lexicon registry
   * @returns Lexicon registry instance
   */
  getLexiconRegistry(): LexiconRegistry {
    return this.lexiconRegistry;
  }

  /**
   * Get configured PDS URL
   */
  get pdsUrl(): string | undefined {
    return this.config.servers?.pds;
  }

  /**
   * Get configured SDS URL
   */
  get sdsUrl(): string | undefined {
    return this.config.servers?.sds;
  }
}

/**
 * Factory function to create an ATProto SDK instance
 * @param config - SDK configuration
 * @returns ATProto SDK instance
 */
export function createATProtoSDK(config: ATProtoSDKConfig): ATProtoSDK {
  return new ATProtoSDK(config);
}
