import { z } from "zod";
import type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./interfaces.js";

/**
 * Zod schema for OAuth configuration validation.
 *
 * @remarks
 * All URLs must be valid and use HTTPS in production. The `jwkPrivate` field
 * should contain the private key in JWK (JSON Web Key) format as a string.
 */
export const OAuthConfigSchema = z.object({
  /**
   * URL to the OAuth client metadata JSON document.
   * This document describes your application to the authorization server.
   *
   * @see https://atproto.com/specs/oauth#client-metadata
   */
  clientId: z.string().url(),

  /**
   * URL where users are redirected after authentication.
   * Must match one of the redirect URIs in your client metadata.
   */
  redirectUri: z.string().url(),

  /**
   * OAuth scopes to request, space-separated.
   *
   * Can be a string of space-separated permissions or use the permission system:
   *
   * @example Using presets
   * ```typescript
   * import { ScopePresets } from '@hypercerts-org/sdk-core';
   * scope: ScopePresets.EMAIL_AND_PROFILE
   * ```
   *
   * @example Building custom scopes
   * ```typescript
   * import { PermissionBuilder, buildScope } from '@hypercerts-org/sdk-core';
   * scope: buildScope(
   *   new PermissionBuilder()
   *     .accountEmail('read')
   *     .repoWrite('app.bsky.feed.post')
   *     .build()
   * )
   * ```
   *
   * @example Legacy scopes
   * ```typescript
   * scope: "atproto transition:generic"
   * ```
   *
   * @see https://atproto.com/specs/permission for permission details
   */
  scope: z.string().min(1, "OAuth scope is required"),

  /**
   * URL to your public JWKS (JSON Web Key Set) endpoint.
   * Used by the authorization server to verify your client's signatures.
   */
  jwksUri: z.string().url(),

  /**
   * Private JWK (JSON Web Key) as a JSON string.
   * Used for signing DPoP proofs and client assertions.
   *
   * @remarks
   * This should be kept secret and never exposed to clients.
   * Typically loaded from environment variables or a secrets manager.
   */
  jwkPrivate: z.string(),
});

/**
 * Zod schema for server URL configuration.
 *
 * @remarks
 * At least one server (PDS or SDS) should be configured for the SDK to be useful.
 */
export const ServerConfigSchema = z.object({
  /**
   * Personal Data Server URL - the user's own AT Protocol server.
   * This is the primary server for user data operations.
   *
   * @example "https://bsky.social"
   */
  pds: z.string().url().optional(),

  /**
   * Shared Data Server URL - for collaborative data storage.
   * Required for collaborator and organization operations.
   *
   * @example "https://sds.hypercerts.org"
   */
  sds: z.string().url().optional(),
});

/**
 * Zod schema for timeout configuration.
 *
 * @remarks
 * All timeout values are in milliseconds.
 */
export const TimeoutConfigSchema = z.object({
  /**
   * Timeout for fetching PDS metadata during identity resolution.
   * @default 5000 (5 seconds, set by OAuthClient)
   */
  pdsMetadata: z.number().positive().optional(),

  /**
   * Timeout for general API requests to PDS/SDS.
   * @default 30000 (30 seconds)
   */
  apiRequests: z.number().positive().optional(),
});

/**
 * Zod schema for SDK configuration validation.
 *
 * @remarks
 * This schema validates only the primitive/serializable parts of the configuration.
 * Storage interfaces ({@link SessionStore}, {@link StateStore}) cannot be validated
 * with Zod as they are runtime objects.
 */
export const ATProtoSDKConfigSchema = z.object({
  oauth: OAuthConfigSchema,
  servers: ServerConfigSchema.optional(),
  timeouts: TimeoutConfigSchema.optional(),
});

/**
 * Configuration options for the ATProto SDK.
 *
 * This interface defines all configuration needed to initialize the SDK,
 * including OAuth credentials, server endpoints, and optional customizations.
 *
 * @example Minimal configuration
 * ```typescript
 * const config: ATProtoSDKConfig = {
 *   oauth: {
 *     clientId: "https://my-app.com/client-metadata.json",
 *     redirectUri: "https://my-app.com/callback",
 *     scope: "atproto transition:generic",
 *     jwksUri: "https://my-app.com/.well-known/jwks.json",
 *     jwkPrivate: process.env.JWK_PRIVATE_KEY!,
 *   },
 *   servers: {
 *     pds: "https://bsky.social",
 *   },
 * };
 * ```
 *
 * @example Full configuration with custom storage
 * ```typescript
 * const config: ATProtoSDKConfig = {
 *   oauth: { ... },
 *   servers: {
 *     pds: "https://bsky.social",
 *     sds: "https://sds.hypercerts.org",
 *   },
 *   storage: {
 *     sessionStore: new RedisSessionStore(redisClient),
 *     stateStore: new RedisStateStore(redisClient),
 *   },
 *   timeouts: {
 *     pdsMetadata: 5000,
 *     apiRequests: 30000,
 *   },
 *   logger: console,
 * };
 * ```
 */
export interface ATProtoSDKConfig {
  /**
   * OAuth 2.0 configuration for authentication.
   *
   * Required fields for the OAuth flow with DPoP (Demonstrating Proof of Possession).
   * Your application must host the client metadata and JWKS endpoints.
   *
   * @see https://atproto.com/specs/oauth for AT Protocol OAuth specification
   */
  oauth: z.infer<typeof OAuthConfigSchema>;

  /**
   * Server URLs for PDS and SDS connections.
   *
   * - **PDS**: Personal Data Server - user's own data storage
   * - **SDS**: Shared Data Server - collaborative storage with access control
   */
  servers?: z.infer<typeof ServerConfigSchema>;

  /**
   * Storage adapters for persisting OAuth sessions and state.
   *
   * If not provided, in-memory implementations are used automatically.
   * **Warning**: In-memory storage is lost on process restart - use persistent
   * storage (Redis, database, etc.) in production.
   *
   * @example
   * ```typescript
   * storage: {
   *   sessionStore: new RedisSessionStore(redis),
   *   stateStore: new RedisStateStore(redis),
   * }
   * ```
   */
  storage?: {
    /**
     * Persistent storage for OAuth sessions.
     * Sessions contain access tokens, refresh tokens, and DPoP keys.
     */
    sessionStore?: SessionStore;

    /**
     * Temporary storage for OAuth state during the authorization flow.
     * State is short-lived and used for PKCE and CSRF protection.
     */
    stateStore?: StateStore;
  };

  /**
   * Custom fetch implementation for HTTP requests.
   *
   * Use this to add custom headers, logging, or to use a different HTTP client.
   * Must be compatible with the standard Fetch API.
   *
   * @example
   * ```typescript
   * fetch: async (url, init) => {
   *   console.log(`Fetching: ${url}`);
   *   return globalThis.fetch(url, init);
   * }
   * ```
   */
  fetch?: typeof fetch;

  /**
   * Timeout configuration for network requests.
   * Values are in milliseconds.
   */
  timeouts?: z.infer<typeof TimeoutConfigSchema>;

  /**
   * Cache for profiles, metadata, and other frequently accessed data.
   *
   * Implementing caching can significantly reduce API calls and improve performance.
   * The SDK does not provide a default cache - you must implement {@link CacheInterface}.
   */
  cache?: CacheInterface;

  /**
   * Logger for debugging and observability.
   *
   * The logger receives debug, info, warn, and error messages from the SDK.
   * Compatible with `console` or any logger implementing {@link LoggerInterface}.
   *
   * @example
   * ```typescript
   * logger: console
   * // or
   * logger: pino()
   * // or
   * logger: winston.createLogger({ ... })
   * ```
   */
  logger?: LoggerInterface;
}
