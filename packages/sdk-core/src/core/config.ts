import { z } from "zod";
import type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./interfaces.js";

/**
 * Type for HTTP loopback URLs (localhost, 127.0.0.1, [::1])
 */
export type LoopbackUrl = `http://localhost${string}` | `http://127.0.0.1${string}` | `http://[::1]${string}`;

/**
 * Type for HTTPS URLs (production)
 */
export type HttpsUrl = `https://${string}`;

/**
 * Type for URLs that can be used in development or production
 */
export type DevelopmentOrProductionUrl = HttpsUrl | LoopbackUrl;

/**
 * Custom URL validator that allows HTTP loopback addresses for development.
 *
 * Accepts:
 * - Any HTTPS URL (production)
 * - http://localhost (with optional port and path)
 * - http://127.0.0.1 (with optional port and path)
 * - http://[::1] (with optional port and path) - IPv6 loopback
 *
 * Rejects:
 * - Other HTTP URLs (e.g., http://example.com)
 * - Invalid URLs
 *
 * @internal
 */
const urlOrLoopback = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);

      // Always allow HTTPS
      if (url.protocol === "https:") {
        return true;
      }

      // For HTTP, only allow loopback addresses
      if (url.protocol === "http:") {
        const hostname = url.hostname.toLowerCase();
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
      }

      return false;
    } catch {
      return false;
    }
  },
  {
    message: "Must be a valid HTTPS URL or HTTP loopback URL (localhost, 127.0.0.1, [::1])",
  },
);

/**
 * Zod schema for OAuth configuration validation.
 *
 * @remarks
 * All URLs must be valid and use HTTPS in production. For local development,
 * HTTP loopback URLs (localhost, 127.0.0.1, [::1]) are allowed.
 * The `jwkPrivate` field should contain the private key in JWK (JSON Web Key) format as a string.
 */
export const OAuthConfigSchema = z.object({
  /**
   * URL to the OAuth client metadata JSON document.
   * This document describes your application to the authorization server.
   *
   * For local development, you can use `http://localhost/` as a loopback client.
   *
   * @see https://atproto.com/specs/oauth#client-metadata
   */
  clientId: urlOrLoopback,

  /**
   * URL where users are redirected after authentication.
   * Must match one of the redirect URIs in your client metadata.
   *
   * For local development, you can use HTTP loopback URLs like
   * `http://127.0.0.1:3000/callback` or `http://localhost:3000/callback`.
   */
  redirectUri: urlOrLoopback,

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
   *
   * For local development, you can serve JWKS from a loopback URL like
   * `http://127.0.0.1:3000/.well-known/jwks.json`.
   */
  jwksUri: urlOrLoopback,

  /**
   * Private JWK (JSON Web Key) as a JSON string.
   * Used for signing DPoP proofs and client assertions.
   *
   * @remarks
   * This should be kept secret and never exposed to clients.
   * Typically loaded from environment variables or a secrets manager.
   */
  jwkPrivate: z.string(),

  /**
   * Enable development mode features (optional).
   *
   * When true, suppresses warnings about using HTTP loopback URLs.
   * Should be set to true for local development to reduce console noise.
   *
   * @default false
   *
   * @example
   * ```typescript
   * oauth: {
   *   clientId: "http://localhost/",
   *   redirectUri: "http://127.0.0.1:3000/callback",
   *   // ... other config
   *   developmentMode: true, // Suppress loopback warnings
   * }
   * ```
   */
  developmentMode: z.boolean().optional(),
});

/**
 * Zod schema for server URL configuration.
 *
 * @remarks
 * Configure SDS here for collaborative operations.
 * PDS URLs are auto-detected from the user's OAuth session and do not need configuration.
 * For local development, HTTP loopback URLs are allowed.
 */
export const ServerConfigSchema = z.object({
  /**
   * Shared Data Server URL - for collaborative data storage.
   * Required for collaborator and organization operations.
   *
   * @example Production
   * ```typescript
   * sds: "https://sds.hypercerts.org"
   * ```
   *
   * @example Local development
   * ```typescript
   * sds: "http://127.0.0.1:2584"
   * ```
   */
  sds: urlOrLoopback.optional(),
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
  /**
   * URL string used for resolving AT Protocol handles to DIDs
   * during the OAuth authorization flow. This can be any server that speaks
   * the `com.atproto.identity.resolveHandle` XRPC method.
   *
   * If not provided, the `@atproto` library falls back to DNS-based handle resolution.
   *
   * @example
   * ```typescript
   * handleResolver: "https://pds-eu-west4.test.certified.app"
   * ```
   */
  handleResolver: urlOrLoopback.optional(),
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
 * };
 * ```
 *
 * @example Full configuration with custom storage
 * ```typescript
 * const config: ATProtoSDKConfig = {
 *   oauth: { ... },
 *   handleResolver: "https://bsky.social",
 *   servers: {
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
   * URL string used for resolving AT Protocol handles to DIDs during the OAuth
   * authorization flow. This can be any server that speaks the
   * `com.atproto.identity.resolveHandle` XRPC method.
   *
   * If not provided, the `@atproto` library falls back to DNS-based handle resolution.
   *
   * Note: This is NOT the user's PDS URL. The user's PDS is auto-detected from
   * the OAuth session during `callback()` and `restoreSession()`.
   *
   * @example
   * ```typescript
   * handleResolver: "https://pds-eu-west4.test.certified.app"
   * ```
   */
  handleResolver?: string;

  /**
   * Server URLs for SDS connections.
   *
   * - **SDS**: Shared Data Server - collaborative storage with access control
   *
   * Note: PDS (Personal Data Server) URLs are auto-detected from the user's
   * OAuth session and do not need to be configured.
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
