import { NodeOAuthClient, JoseKey, type NodeSavedSession } from "@atproto/oauth-client-node";
import type { SessionStore, StateStore, LoggerInterface } from "../core/interfaces.js";
import type { ATProtoSDKConfig } from "../core/config.js";
import { AuthenticationError, NetworkError } from "../core/errors.js";
import { InMemorySessionStore } from "../storage/InMemorySessionStore.js";
import { InMemoryStateStore } from "../storage/InMemoryStateStore.js";

/**
 * Options for authorization
 */
interface AuthorizeOptions {
  /**
   * OAuth scope string (overrides config default)
   */
  scope?: string;
}

/**
 * OAuth client wrapper for ATProto authentication
 * Handles DPoP-bound tokens and automatic session management
 */
export class OAuthClient {
  private client: NodeOAuthClient | null = null;
  private clientPromise: Promise<NodeOAuthClient>;
  private config: ATProtoSDKConfig;
  private logger?: LoggerInterface;

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
   * Initialize the NodeOAuthClient (async)
   * This is called lazily on first use
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
   * Get the OAuth client instance, initializing if needed
   */
  private async getClient(): Promise<NodeOAuthClient> {
    return this.clientPromise;
  }

  /**
   * Build client metadata from config
   */
  private buildClientMetadata() {
    const clientIdUrl = new URL(this.config.oauth.clientId);
    return {
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
  }

  /**
   * Create fetch handler with timeout
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
   * Create state store adapter from interface
   */
  private createStateStoreAdapter(store: StateStore): import("@atproto/oauth-client-node").NodeSavedStateStore {
    return {
      get: (key: string) => store.get(key),
      set: (key: string, value: import("@atproto/oauth-client-node").NodeSavedState) => store.set(key, value),
      del: (key: string) => store.del(key),
    };
  }

  /**
   * Create session store adapter from interface
   */
  private createSessionStoreAdapter(store: SessionStore): import("@atproto/oauth-client-node").NodeSavedSessionStore {
    return {
      get: (did: string) => store.get(did),
      set: (did: string, session: NodeSavedSession) => store.set(did, session),
      del: (did: string) => store.del(did),
    };
  }

  /**
   * Initiate OAuth authorization flow
   * @param identifier - ATProto identifier (handle, DID, or PDS URL)
   * @param options - Authorization options
   * @returns Authorization URL to redirect user to
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
   * Handle OAuth callback and exchange authorization code for tokens
   * @param params - URL search parameters from callback
   * @returns OAuth session
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
   * Restore OAuth session by DID
   * Automatically refreshes expired tokens
   * @param did - User DID
   * @returns OAuth session or null if not found
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
   * Revoke OAuth session
   * @param did - User DID
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
