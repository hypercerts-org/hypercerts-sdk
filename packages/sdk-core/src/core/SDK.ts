import { OAuthClient } from "../auth/OAuthClient.js";
import { LexiconRegistry } from "../repository/LexiconRegistry.js";
import { Repository } from "../repository/Repository.js";
import type { RepositoryOptions } from "../repository/types.js";
import { InMemorySessionStore } from "../storage/InMemorySessionStore.js";
import { InMemoryStateStore } from "../storage/InMemoryStateStore.js";
import type { ATProtoSDKConfig } from "./config.js";
import { ATProtoSDKConfigSchema } from "./config.js";
import { ValidationError, NetworkError } from "./errors.js";
import type { Session } from "./types.js";

/**
 * Options for the OAuth authorization flow.
 */
export interface AuthorizeOptions {
  /**
   * OAuth scope string to request specific permissions.
   * Overrides the default scope configured in {@link ATProtoSDKConfig.oauth.scope}.
   *
   * Can use the permission system for type-safe scope building.
   *
   * @example Using presets
   * ```typescript
   * import { ScopePresets } from '@hypercerts-org/sdk-core';
   *
   * // Request email and profile access
   * await sdk.authorize("user.bsky.social", {
   *   scope: ScopePresets.EMAIL_AND_PROFILE
   * });
   *
   * // Request full posting capabilities
   * await sdk.authorize("user.bsky.social", {
   *   scope: ScopePresets.POSTING_APP
   * });
   * ```
   *
   * @example Building custom scopes
   * ```typescript
   * import { PermissionBuilder, buildScope } from '@hypercerts-org/sdk-core';
   *
   * const scope = buildScope(
   *   new PermissionBuilder()
   *     .accountEmail('read')
   *     .repoWrite('app.bsky.feed.post')
   *     .blob(['image/*'])
   *     .build()
   * );
   *
   * await sdk.authorize("user.bsky.social", { scope });
   * ```
   *
   * @example Legacy scopes
   * ```typescript
   * // Request read-only access
   * await sdk.authorize("user.bsky.social", { scope: "atproto" });
   *
   * // Request full access (legacy)
   * await sdk.authorize("user.bsky.social", {
   *   scope: "atproto transition:generic"
   * });
   * ```
   */
  scope?: string;
}

/**
 * Main ATProto SDK class providing OAuth authentication and repository access.
 *
 * This is the primary entry point for interacting with AT Protocol servers.
 * It handles the OAuth 2.0 flow with DPoP (Demonstrating Proof of Possession)
 * and provides access to repository operations for managing records, blobs,
 * and profiles.
 *
 * @example Basic usage with OAuth flow
 * ```typescript
 * import { ATProtoSDK, InMemorySessionStore, InMemoryStateStore } from "@hypercerts-org/sdk";
 *
 * const sdk = new ATProtoSDK({
 *   oauth: {
 *     clientId: "https://my-app.com/client-metadata.json",
 *     redirectUri: "https://my-app.com/callback",
 *     scope: "atproto transition:generic",
 *     jwksUri: "https://my-app.com/.well-known/jwks.json",
 *     jwkPrivate: process.env.JWK_PRIVATE_KEY!,
 *   },
 *   servers: {
 *     pds: "https://bsky.social",
 *     sds: "https://sds.hypercerts.org",
 *   },
 * });
 *
 * // Start OAuth flow - redirect user to this URL
 * const authUrl = await sdk.authorize("user.bsky.social");
 *
 * // After user returns, handle the callback
 * const session = await sdk.callback(new URLSearchParams(window.location.search));
 *
 * // Get a repository to work with data
 * const repo = sdk.repository(session);
 * ```
 *
 * @example Restoring an existing session
 * ```typescript
 * // Restore a previous session by DID
 * const session = await sdk.restoreSession("did:plc:abc123...");
 * if (session) {
 *   const repo = sdk.repository(session);
 *   // Continue working with the restored session
 * }
 * ```
 *
 * @see {@link ATProtoSDKConfig} for configuration options
 * @see {@link Repository} for data operations
 * @see {@link OAuthClient} for OAuth implementation details
 */
export class ATProtoSDK {
  private oauthClient: OAuthClient;
  private config: ATProtoSDKConfig;
  private logger?: ATProtoSDKConfig["logger"];
  private lexiconRegistry: LexiconRegistry;

  /**
   * Creates a new ATProto SDK instance.
   *
   * @param config - SDK configuration including OAuth credentials, server URLs, and optional storage adapters
   * @throws {@link ValidationError} if the configuration is invalid (e.g., malformed URLs, missing required fields)
   *
   * @remarks
   * If no storage adapters are provided, in-memory implementations are used.
   * These are suitable for development and testing but **not recommended for production**
   * as sessions will be lost on restart.
   *
   * @example
   * ```typescript
   * // Minimal configuration (uses in-memory storage)
   * const sdk = new ATProtoSDK({
   *   oauth: {
   *     clientId: "https://my-app.com/client-metadata.json",
   *     redirectUri: "https://my-app.com/callback",
   *     scope: "atproto",
   *     jwksUri: "https://my-app.com/.well-known/jwks.json",
   *     jwkPrivate: privateKeyJwk,
   *   },
   *   servers: { pds: "https://bsky.social" },
   * });
   * ```
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
   * Initiates the OAuth authorization flow.
   *
   * This method starts the OAuth 2.0 authorization flow by resolving the user's
   * identity and generating an authorization URL. The user should be redirected
   * to this URL to authenticate.
   *
   * @param identifier - The user's ATProto identifier. Can be:
   *   - A handle (e.g., `"user.bsky.social"`)
   *   - A DID (e.g., `"did:plc:abc123..."`)
   *   - A PDS URL (e.g., `"https://bsky.social"`)
   * @param options - Optional authorization settings
   * @returns A Promise resolving to the authorization URL to redirect the user to
   * @throws {@link ValidationError} if the identifier is empty or invalid
   * @throws {@link NetworkError} if the identity cannot be resolved
   *
   * @example
   * ```typescript
   * // Using a handle
   * const authUrl = await sdk.authorize("alice.bsky.social");
   *
   * // Using a DID directly
   * const authUrl = await sdk.authorize("did:plc:abc123xyz");
   *
   * // With custom scope
   * const authUrl = await sdk.authorize("alice.bsky.social", {
   *   scope: "atproto transition:generic"
   * });
   *
   * // Redirect user to authUrl
   * window.location.href = authUrl;
   * ```
   */
  async authorize(identifier: string, options?: AuthorizeOptions): Promise<string> {
    if (!identifier || !identifier.trim()) {
      throw new ValidationError("ATProto identifier is required");
    }

    return this.oauthClient.authorize(identifier.trim(), options);
  }

  /**
   * Handles the OAuth callback and exchanges the authorization code for tokens.
   *
   * Call this method when the user is redirected back to your application
   * after authenticating. It validates the OAuth state, exchanges the
   * authorization code for access/refresh tokens, and creates a session.
   *
   * @param params - URL search parameters from the callback URL
   * @returns A Promise resolving to the authenticated OAuth session
   * @throws {@link AuthenticationError} if the callback parameters are invalid or the code exchange fails
   * @throws {@link ValidationError} if required parameters are missing
   *
   * @example
   * ```typescript
   * // In your callback route handler
   * const params = new URLSearchParams(window.location.search);
   * // params contains: code, state, iss (issuer)
   *
   * const session = await sdk.callback(params);
   * console.log(`Authenticated as ${session.did}`);
   *
   * // Store the DID to restore the session later
   * localStorage.setItem("userDid", session.did);
   * ```
   */
  async callback(params: URLSearchParams): Promise<Session> {
    return this.oauthClient.callback(params);
  }

  /**
   * Restores an existing OAuth session by DID.
   *
   * Use this method to restore a previously authenticated session, typically
   * on application startup. The method retrieves the stored session and
   * automatically refreshes expired tokens if needed.
   *
   * @param did - The user's Decentralized Identifier (DID), e.g., `"did:plc:abc123..."`
   * @returns A Promise resolving to the restored session, or `null` if no session exists
   * @throws {@link ValidationError} if the DID is empty
   * @throws {@link SessionExpiredError} if the session cannot be refreshed
   *
   * @example
   * ```typescript
   * // On application startup
   * const savedDid = localStorage.getItem("userDid");
   * if (savedDid) {
   *   const session = await sdk.restoreSession(savedDid);
   *   if (session) {
   *     // User is still authenticated
   *     const repo = sdk.repository(session);
   *   } else {
   *     // Session not found, user needs to re-authenticate
   *     const authUrl = await sdk.authorize(savedDid);
   *   }
   * }
   * ```
   */
  async restoreSession(did: string): Promise<Session | null> {
    if (!did || !did.trim()) {
      throw new ValidationError("DID is required");
    }

    return this.oauthClient.restore(did.trim());
  }

  /**
   * Revokes an OAuth session, logging the user out.
   *
   * This method invalidates the session's tokens and removes it from storage.
   * After revocation, the session can no longer be used or restored.
   *
   * @param did - The user's DID to revoke the session for
   * @throws {@link ValidationError} if the DID is empty
   *
   * @example
   * ```typescript
   * // Log out the user
   * await sdk.revokeSession(session.did);
   * localStorage.removeItem("userDid");
   * ```
   */
  async revokeSession(did: string): Promise<void> {
    if (!did || !did.trim()) {
      throw new ValidationError("DID is required");
    }

    return this.oauthClient.revoke(did.trim());
  }

  /**
   * Gets the account email address from the authenticated session.
   *
   * This method retrieves the email address associated with the user's account
   * by calling the `com.atproto.server.getSession` endpoint. The email will only
   * be returned if the appropriate OAuth scope was granted during authorization.
   *
   * Required OAuth scopes:
   * - **Granular permissions**: `account:email?action=read` or `account:email`
   * - **Transitional permissions**: `transition:email`
   *
   * @param session - An authenticated OAuth session
   * @returns A Promise resolving to email info, or `null` if permission not granted
   * @throws {@link ValidationError} if the session is invalid
   * @throws {@link NetworkError} if the API request fails
   *
   * @example Using granular permissions
   * ```typescript
   * import { ScopePresets } from '@hypercerts-org/sdk-core';
   *
   * // Authorize with email scope
   * const authUrl = await sdk.authorize("user.bsky.social", {
   *   scope: ScopePresets.EMAIL_READ
   * });
   *
   * // After callback...
   * const emailInfo = await sdk.getAccountEmail(session);
   * if (emailInfo) {
   *   console.log(`Email: ${emailInfo.email}`);
   *   console.log(`Confirmed: ${emailInfo.emailConfirmed}`);
   * } else {
   *   console.log("Email permission not granted");
   * }
   * ```
   *
   * @example Using transitional permissions (legacy)
   * ```typescript
   * // Authorize with transition:email scope
   * const authUrl = await sdk.authorize("user.bsky.social", {
   *   scope: "atproto transition:email"
   * });
   *
   * // After callback...
   * const emailInfo = await sdk.getAccountEmail(session);
   * ```
   */
  async getAccountEmail(session: Session): Promise<{ email: string; emailConfirmed: boolean } | null> {
    if (!session) {
      throw new ValidationError("Session is required");
    }

    try {
      // Determine PDS URL from session or config
      const pdsUrl = this.config.servers?.pds;
      if (!pdsUrl) {
        throw new ValidationError("PDS server URL not configured");
      }

      // Call com.atproto.server.getSession endpoint using session's fetchHandler
      // which automatically includes proper authorization with DPoP
      const response = await session.fetchHandler("/xrpc/com.atproto.server.getSession", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new NetworkError(`Failed to get session info: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        email?: string;
        emailConfirmed?: boolean;
        did: string;
        handle: string;
      };

      // Return null if email not present (permission not granted)
      if (!data.email) {
        return null;
      }

      return {
        email: data.email,
        emailConfirmed: data.emailConfirmed ?? false,
      };
    } catch (error) {
      this.logger?.error("Failed to get account email", { error });
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to get account email: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Creates a repository instance for data operations.
   *
   * The repository provides a fluent API for working with AT Protocol data
   * including records, blobs, profiles, and domain-specific operations like
   * hypercerts and collaborators.
   *
   * @param session - An authenticated OAuth session
   * @param options - Repository configuration options
   * @returns A {@link Repository} instance configured for the specified server
   * @throws {@link ValidationError} if the session is invalid or server URL is not configured
   *
   * @remarks
   * - **PDS (Personal Data Server)**: User's own data storage, default for most operations
   * - **SDS (Shared Data Server)**: Shared data storage with collaborator support
   *
   * @example Using default PDS
   * ```typescript
   * const repo = sdk.repository(session);
   * const profile = await repo.profile.get();
   * ```
   *
   * @example Using configured SDS
   * ```typescript
   * const sdsRepo = sdk.repository(session, { server: "sds" });
   * const collaborators = await sdsRepo.collaborators.list();
   * ```
   *
   * @example Using custom server URL
   * ```typescript
   * const customRepo = sdk.repository(session, {
   *   serverUrl: "https://custom.atproto.server"
   * });
   * ```
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
   * Gets the lexicon registry for schema validation.
   *
   * The lexicon registry manages AT Protocol lexicon schemas used for
   * validating record data. You can register custom lexicons to extend
   * the SDK's capabilities.
   *
   * @returns The {@link LexiconRegistry} instance
   *
   * @example
   * ```typescript
   * const registry = sdk.getLexiconRegistry();
   *
   * // Register custom lexicons
   * registry.register(myCustomLexicons);
   *
   * // Check if a lexicon is registered
   * const hasLexicon = registry.has("org.example.myRecord");
   * ```
   */
  getLexiconRegistry(): LexiconRegistry {
    return this.lexiconRegistry;
  }

  /**
   * The configured PDS (Personal Data Server) URL.
   *
   * @returns The PDS URL if configured, otherwise `undefined`
   */
  get pdsUrl(): string | undefined {
    return this.config.servers?.pds;
  }

  /**
   * The configured SDS (Shared Data Server) URL.
   *
   * @returns The SDS URL if configured, otherwise `undefined`
   */
  get sdsUrl(): string | undefined {
    return this.config.servers?.sds;
  }
}

/**
 * Factory function to create an ATProto SDK instance.
 *
 * This is a convenience function equivalent to `new ATProtoSDK(config)`.
 *
 * @param config - SDK configuration
 * @returns A new {@link ATProtoSDK} instance
 *
 * @example
 * ```typescript
 * import { createATProtoSDK } from "@hypercerts-org/sdk";
 *
 * const sdk = createATProtoSDK({
 *   oauth: { ... },
 *   servers: { pds: "https://bsky.social" },
 * });
 * ```
 */
export function createATProtoSDK(config: ATProtoSDKConfig): ATProtoSDK {
  return new ATProtoSDK(config);
}
