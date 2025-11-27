import { z } from "zod";
import type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./interfaces.js";

/**
 * OAuth configuration schema
 */
export const OAuthConfigSchema = z.object({
  clientId: z.string().url(),
  redirectUri: z.string().url(),
  scope: z.string(),
  jwksUri: z.string().url(),
  jwkPrivate: z.string(),
});

/**
 * Server configuration schema
 */
export const ServerConfigSchema = z.object({
  pds: z.string().url().optional(),
  sds: z.string().url().optional(),
});

/**
 * Timeout configuration schema
 */
export const TimeoutConfigSchema = z.object({
  pdsMetadata: z.number().positive().optional(),
  apiRequests: z.number().positive().optional(),
});

/**
 * Partial SDK configuration schema (validates primitive values only)
 * Storage interfaces (SessionStore, StateStore) cannot be validated with Zod
 */
export const ATProtoSDKConfigSchema = z.object({
  oauth: OAuthConfigSchema,
  servers: ServerConfigSchema.optional(),
  timeouts: TimeoutConfigSchema.optional(),
});

/**
 * SDK configuration interface
 */
export interface ATProtoSDKConfig {
  /**
   * OAuth Configuration
   */
  oauth: z.infer<typeof OAuthConfigSchema>;

  /**
   * Server Configuration
   */
  servers?: z.infer<typeof ServerConfigSchema>;

  /**
   * Storage Adapters (user implements interfaces)
   * If not provided, in-memory implementations will be used (suitable for development/testing only)
   */
  storage?: {
    /**
     * Session store for OAuth sessions
     */
    sessionStore?: SessionStore;

    /**
     * State store for OAuth state/PKCE
     */
    stateStore?: StateStore;
  };

  /**
   * Optional: Custom fetch handler
   */
  fetch?: typeof fetch;

  /**
   * Optional: Timeout configuration
   */
  timeouts?: z.infer<typeof TimeoutConfigSchema>;

  /**
   * Optional: Cache interface for profiles/sessions
   */
  cache?: CacheInterface;

  /**
   * Optional: Logger for debugging
   */
  logger?: LoggerInterface;
}
