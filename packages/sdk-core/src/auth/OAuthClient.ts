import { NodeOAuthClient, JoseKey, type NodeSavedSession } from "@atproto/oauth-client-node";
import type { SessionStore, StateStore, LoggerInterface } from "../core/interfaces.js";
import type { ATProtoSDKConfig } from "../core/config.js";
import { AuthenticationError, NetworkError } from "../core/errors.js";
import { InMemorySessionStore } from "../storage/InMemorySessionStore.js";
import { InMemoryStateStore } from "../storage/InMemoryStateStore.js";
import { parseScope, validateScope, ATPROTO_SCOPE } from "./permissions.js";

/**
 * Options for the OAuth authorization flow.
 *
 * @internal
 */
interface AuthorizeOptions {
  /**
   * OAuth scope string to request specific permissions.
   * Overrides the default scope from the SDK configuration.
   */
  scope?: string;
}

/**
 * OAuth 2.0 client for AT Protocol authentication with DPoP support.
 *
 * This class wraps the `@atproto/oauth-client-node` library to provide
 * OAuth 2.0 authentication with the following features:
 *
 * - **DPoP (Demonstrating Proof of Possession)**: Binds tokens to cryptographic keys
 *   to prevent token theft and replay attacks
 * - **PKCE (Proof Key for Code Exchange)**: Protects against authorization code interception
 * - **Automatic Token Refresh**: Transparently refreshes expired access tokens
 * - **Session Persistence**: Stores sessions in configurable storage backends
 *
 * @remarks
 * This class is typically used internally by {@link ATProtoSDK}. Direct usage
 * is only needed for advanced scenarios.
 *
 * The client uses lazy initialization - the underlying `NodeOAuthClient` is
 * created asynchronously on first use. This allows the constructor to return
 * synchronously while deferring async key parsing.
 *
 * @example Direct usage (advanced)
 * ```typescript
 * import { OAuthClient } from "@hypercerts-org/sdk";
 *
 * const client = new OAuthClient({
 *   oauth: {
 *     clientId: "https://my-app.com/client-metadata.json",
 *     redirectUri: "https://my-app.com/callback",
 *     scope: "atproto transition:generic",
 *     jwksUri: "https://my-app.com/.well-known/jwks.json",
 *     jwkPrivate: process.env.JWK_PRIVATE_KEY!,
 *   },
 *   servers: { pds: "https://bsky.social" },
 * });
 *
 * // Start authorization
 * const authUrl = await client.authorize("user.bsky.social");
 *
 * // Handle callback
 * const session = await client.callback(new URLSearchParams(callbackUrl.search));
 * ```
 *
 * @see {@link ATProtoSDK} for the recommended high-level API
 * @see https://atproto.com/specs/oauth for AT Protocol OAuth specification
 */
export class OAuthClient {
  /** The underlying NodeOAuthClient instance (lazily initialized) */
  private client: NodeOAuthClient | null = null;

  /** Promise that resolves to the initialized client */
  private clientPromise: Promise<NodeOAuthClient>;

  /** SDK configuration */
  private config: ATProtoSDKConfig;

  /** Optional logger for debugging */
  private logger?: LoggerInterface;

  /**
   * Creates a new OAuth client.
   *
   * @param config - SDK configuration including OAuth credentials and server URLs
   * @throws {@link AuthenticationError} if the JWK private key is not valid JSON
   *
   * @remarks
   * The constructor validates the JWK format synchronously but defers
   * the actual client initialization to the first API call.
   */
  constructor(config: ATProtoSDKConfig) {
    this.config = config;
    this.logger = config.logger;

    // Validate JWK format synchronously (before async initialization)
    try {
      JSON.parse(config.oauth.jwkPrivate);
    } catch (error) {
      throw new AuthenticationError("Failed to parse JWK private key. Ensure it is valid JSON.", error);
    }

    // Initialize client lazily (async initialization)
    this.clientPromise = this.initializeClient();
  }

  /**
   * Initializes the NodeOAuthClient asynchronously.
   *
   * This method is called lazily on first use. It:
   * 1. Parses the JWK private key(s)
   * 2. Builds OAuth client metadata
   * 3. Creates the underlying NodeOAuthClient
   *
   * @returns Promise resolving to the initialized client
   * @internal
   */
  private async initializeClient(): Promise<NodeOAuthClient> {
    if (this.client) {
      return this.client;
    }

    // Parse JWK private key (already validated in constructor)
    const privateJWK = JSON.parse(this.config.oauth.jwkPrivate) as {
      keys: Array<{ kid: string; [key: string]: unknown }>;
    };

    // Build client metadata
    const clientMetadata = this.buildClientMetadata();

    // Convert JWK keys to JoseKey instances (await here)
    const keyset = await Promise.all(
      privateJWK.keys.map((key) =>
        JoseKey.fromImportable(key as unknown as Parameters<typeof JoseKey.fromImportable>[0], key.kid),
      ),
    );

    // Create fetch with timeout
    const fetchWithTimeout = this.createFetchWithTimeout(this.config.timeouts?.pdsMetadata ?? 30000);

    // Use provided stores or fall back to in-memory implementations
    const stateStore = this.config.storage?.stateStore ?? new InMemoryStateStore();
    const sessionStore = this.config.storage?.sessionStore ?? new InMemorySessionStore();

    this.client = new NodeOAuthClient({
      clientMetadata,
      keyset,
      stateStore: this.createStateStoreAdapter(stateStore),
      sessionStore: this.createSessionStoreAdapter(sessionStore),
      handleResolver: this.config.servers?.pds,
      fetch: this.config.fetch ?? fetchWithTimeout,
    });

    return this.client;
  }

  /**
   * Gets the OAuth client instance, initializing if needed.
   *
   * @returns Promise resolving to the initialized client
   * @internal
   */
  private async getClient(): Promise<NodeOAuthClient> {
    return this.clientPromise;
  }

  /**
   * Builds OAuth client metadata from configuration.
   *
   * The metadata describes your application to the authorization server
   * and must match what's published at your `clientId` URL.
   *
   * @returns OAuth client metadata object
   * @internal
   *
   * @remarks
   * Key metadata fields:
   * - `client_id`: URL to your client metadata JSON
   * - `redirect_uris`: Where to redirect after auth (must match config)
   * - `dpop_bound_access_tokens`: Always true for AT Protocol
   * - `token_endpoint_auth_method`: Uses private_key_jwt for security
   */
  private buildClientMetadata() {
    const clientIdUrl = new URL(this.config.oauth.clientId);
    const metadata = {
      client_id: this.config.oauth.clientId,
      client_name: "ATProto SDK Client",
      client_uri: clientIdUrl.origin,
      redirect_uris: [this.config.oauth.redirectUri] as [string, ...string[]],
      scope: this.config.oauth.scope,
      grant_types: ["authorization_code", "refresh_token"] as ["authorization_code", "refresh_token"],
      response_types: ["code"] as ["code"],
      application_type: "web" as const,
      token_endpoint_auth_method: "private_key_jwt" as const,
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: this.config.oauth.jwksUri,
    } as const;

    // Validate scope before returning metadata
    this.validateClientMetadataScope(metadata.scope);

    return metadata;
  }

  /**
   * Validates the OAuth scope in client metadata and logs warnings/suggestions.
   *
   * This method:
   * 1. Checks if the scope is well-formed using permission utilities
   * 2. Detects mixing of transitional and granular permissions
   * 3. Logs warnings for missing `atproto` scope
   * 4. Suggests migration to granular permissions for transitional scopes
   *
   * @param scope - The OAuth scope string to validate
   * @internal
   */
  private validateClientMetadataScope(scope: string): void {
    // Parse the scope into individual permissions
    const permissions = parseScope(scope);

    // Validate well-formedness
    const validation = validateScope(scope);
    if (!validation.isValid) {
      this.logger?.error("Invalid OAuth scope detected", {
        invalidPermissions: validation.invalidPermissions,
        scope,
      });
    }

    // Check for atproto scope
    const hasAtproto = permissions.includes(ATPROTO_SCOPE);
    if (!hasAtproto) {
      this.logger?.warn("OAuth scope missing 'atproto' - basic API access may be limited", {
        scope,
        suggestion: "Add 'atproto' to your scope for basic API access",
      });
    }

    // Detect transitional scopes
    const transitionalScopes = permissions.filter((p) => p.startsWith("transition:"));
    const granularScopes = permissions.filter(
      (p) =>
        p.startsWith("account:") ||
        p.startsWith("repo:") ||
        p.startsWith("blob") ||
        p.startsWith("rpc:") ||
        p.startsWith("identity:") ||
        p.startsWith("include:"),
    );

    // Log info about transitional scopes
    if (transitionalScopes.length > 0) {
      this.logger?.info("Using transitional OAuth scopes (legacy)", {
        transitionalScopes,
        note: "Transitional scopes are supported but granular permissions are recommended",
      });

      // Suggest migration to granular permissions
      if (transitionalScopes.includes("transition:email")) {
        this.logger?.info("Consider migrating 'transition:email' to granular permissions", {
          suggestion: "Use: account:email?action=read",
          example: "import { ScopePresets } from '@hypercerts-org/sdk-core'; scope: ScopePresets.EMAIL_READ",
        });
      }
      if (transitionalScopes.includes("transition:generic")) {
        this.logger?.info("Consider migrating 'transition:generic' to granular permissions", {
          suggestion: "Use specific permissions like: repo:* account:repo?action=read",
          example: "import { ScopePresets } from '@hypercerts-org/sdk-core'; scope: ScopePresets.FULL_ACCESS",
        });
      }
    }

    // Warn if mixing transitional and granular
    if (transitionalScopes.length > 0 && granularScopes.length > 0) {
      this.logger?.warn("Mixing transitional and granular OAuth scopes", {
        transitionalScopes,
        granularScopes,
        note: "While supported, it's recommended to use either transitional or granular permissions consistently",
      });
    }
  }

  /**
   * Creates a fetch handler with timeout support.
   *
   * @param timeoutMs - Request timeout in milliseconds
   * @returns A fetch function that aborts after the timeout
   * @internal
   */
  private createFetchWithTimeout(timeoutMs: number): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new NetworkError(`Request timeout after ${timeoutMs}ms`, error);
        }
        throw new NetworkError("Network request failed", error);
      }
    };
  }

  /**
   * Creates a state store adapter compatible with NodeOAuthClient.
   *
   * @param store - The StateStore implementation to adapt
   * @returns An adapter compatible with NodeOAuthClient
   * @internal
   */
  private createStateStoreAdapter(store: StateStore): import("@atproto/oauth-client-node").NodeSavedStateStore {
    return {
      get: (key: string) => store.get(key),
      set: (key: string, value: import("@atproto/oauth-client-node").NodeSavedState) => store.set(key, value),
      del: (key: string) => store.del(key),
    };
  }

  /**
   * Creates a session store adapter compatible with NodeOAuthClient.
   *
   * @param store - The SessionStore implementation to adapt
   * @returns An adapter compatible with NodeOAuthClient
   * @internal
   */
  private createSessionStoreAdapter(store: SessionStore): import("@atproto/oauth-client-node").NodeSavedSessionStore {
    return {
      get: (did: string) => store.get(did),
      set: (did: string, session: NodeSavedSession) => store.set(did, session),
      del: (did: string) => store.del(did),
    };
  }

  /**
   * Initiates the OAuth authorization flow.
   *
   * This method resolves the user's identity from their identifier,
   * generates PKCE codes, creates OAuth state, and returns an
   * authorization URL to redirect the user to.
   *
   * @param identifier - The user's ATProto identifier. Accepts:
   *   - Handle (e.g., `"alice.bsky.social"`)
   *   - DID (e.g., `"did:plc:abc123..."`)
   *   - PDS URL (e.g., `"https://bsky.social"`)
   * @param options - Optional authorization settings
   * @returns A Promise resolving to the authorization URL
   * @throws {@link AuthenticationError} if authorization setup fails
   * @throws {@link NetworkError} if identity resolution fails
   *
   * @example
   * ```typescript
   * // Get authorization URL
   * const authUrl = await client.authorize("user.bsky.social");
   *
   * // Redirect user (in a web app)
   * window.location.href = authUrl;
   *
   * // Or return to client (in an API)
   * res.json({ authUrl });
   * ```
   */
  async authorize(identifier: string, options?: AuthorizeOptions): Promise<string> {
    try {
      this.logger?.debug("Initiating OAuth authorization", { identifier });

      const client = await this.getClient();
      const scope = options?.scope ?? this.config.oauth.scope;
      const authUrl = await client.authorize(identifier, { scope });

      this.logger?.debug("Authorization URL generated", { identifier });
      // Convert URL to string if needed
      return typeof authUrl === "string" ? authUrl : authUrl.toString();
    } catch (error) {
      this.logger?.error("Authorization failed", { identifier, error });
      if (error instanceof NetworkError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Failed to initiate authorization: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Handles the OAuth callback and exchanges the authorization code for tokens.
   *
   * Call this method when the user is redirected back to your application.
   * It validates the state, exchanges the code for tokens, and creates
   * a persistent session.
   *
   * @param params - URL search parameters from the callback. Expected parameters:
   *   - `code`: The authorization code
   *   - `state`: The state parameter (for CSRF protection)
   *   - `iss`: The issuer (authorization server URL)
   * @returns A Promise resolving to the authenticated OAuth session
   * @throws {@link AuthenticationError} if:
   *   - The callback contains an OAuth error
   *   - The state is invalid or expired
   *   - The code exchange fails
   *   - Session persistence fails
   *
   * @example
   * ```typescript
   * // In your callback route handler
   * app.get("/callback", async (req, res) => {
   *   const params = new URLSearchParams(req.url.split("?")[1]);
   *
   *   try {
   *     const session = await client.callback(params);
   *     // Store DID for session restoration
   *     req.session.userDid = session.sub;
   *     res.redirect("/dashboard");
   *   } catch (error) {
   *     res.redirect("/login?error=auth_failed");
   *   }
   * });
   * ```
   *
   * @remarks
   * After successful token exchange, this method verifies that the session
   * was properly persisted by attempting to restore it. This ensures the
   * storage backend is working correctly.
   */
  async callback(params: URLSearchParams): Promise<import("@atproto/oauth-client").OAuthSession> {
    try {
      this.logger?.debug("Processing OAuth callback");

      // Check for OAuth errors
      const error = params.get("error");
      if (error) {
        const errorDescription = params.get("error_description");
        throw new AuthenticationError(errorDescription || error);
      }

      const client = await this.getClient();
      const result = await client.callback(params);
      const session = result.session;
      const did = session.sub;

      this.logger?.info("OAuth callback successful", { did });

      // Verify session can be restored (validates persistence)
      try {
        const restored = await client.restore(did);
        if (!restored) {
          throw new AuthenticationError("OAuth session was not persisted");
        }
        this.logger?.debug("Session verified and restorable", { did });
      } catch (restoreError) {
        this.logger?.error("Failed to verify persisted session", {
          did,
          error: restoreError,
        });
        throw new AuthenticationError("Failed to persist OAuth session", restoreError);
      }

      return session;
    } catch (error) {
      this.logger?.error("OAuth callback failed", { error });
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Restores an OAuth session by DID.
   *
   * Use this method to restore a previously authenticated session.
   * The method automatically refreshes expired access tokens using
   * the stored refresh token.
   *
   * @param did - The user's Decentralized Identifier (e.g., `"did:plc:abc123..."`)
   * @returns A Promise resolving to the session, or `null` if not found
   * @throws {@link AuthenticationError} if session restoration fails (not for missing sessions)
   * @throws {@link NetworkError} if token refresh requires network and fails
   *
   * @example
   * ```typescript
   * // On application startup or request
   * const userDid = req.session.userDid;
   * if (userDid) {
   *   const session = await client.restore(userDid);
   *   if (session) {
   *     // Session restored, user is authenticated
   *     req.atprotoSession = session;
   *   } else {
   *     // No session found, user needs to log in
   *     delete req.session.userDid;
   *   }
   * }
   * ```
   *
   * @remarks
   * Token refresh is handled automatically by the underlying OAuth client.
   * If the refresh token has expired or been revoked, this method will
   * throw an {@link AuthenticationError}.
   */
  async restore(did: string): Promise<import("@atproto/oauth-client").OAuthSession | null> {
    try {
      this.logger?.debug("Restoring session", { did });

      const client = await this.getClient();
      const session = await client.restore(did);

      if (session) {
        this.logger?.debug("Session restored", { did });
      } else {
        this.logger?.debug("No session found", { did });
      }

      return session;
    } catch (error) {
      this.logger?.error("Failed to restore session", { did, error });
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new AuthenticationError(
        `Failed to restore session: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Revokes an OAuth session.
   *
   * This method invalidates the session's tokens both locally and
   * (if supported) on the authorization server. After revocation,
   * the session cannot be restored.
   *
   * @param did - The user's DID to revoke
   * @throws {@link AuthenticationError} if revocation fails
   *
   * @example
   * ```typescript
   * // Log out endpoint
   * app.post("/logout", async (req, res) => {
   *   const userDid = req.session.userDid;
   *   if (userDid) {
   *     await client.revoke(userDid);
   *     delete req.session.userDid;
   *   }
   *   res.redirect("/");
   * });
   * ```
   *
   * @remarks
   * Even if revocation fails on the server, the local session is
   * removed. The error is thrown to inform you that remote revocation
   * may not have succeeded.
   */
  async revoke(did: string): Promise<void> {
    try {
      this.logger?.debug("Revoking session", { did });

      const client = await this.getClient();
      await client.revoke(did);

      this.logger?.info("Session revoked", { did });
    } catch (error) {
      this.logger?.error("Failed to revoke session", { did, error });
      throw new AuthenticationError(
        `Failed to revoke session: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }
}
