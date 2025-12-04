/**
 * ConfigurableAgent - Agent with configurable service URL routing.
 *
 * This module provides an Agent extension that allows routing requests to
 * a specific server URL, overriding the default URL from the OAuth session.
 *
 * @packageDocumentation
 */

import { Agent } from "@atproto/api";
import type { FetchHandler } from "@atproto/xrpc";
import type { Session } from "../core/types.js";

/**
 * Agent subclass that routes requests to a configurable service URL.
 *
 * The standard Agent uses the service URL embedded in the OAuth session's
 * fetch handler. This class allows overriding that URL to route requests
 * to different servers (e.g., PDS vs SDS, or multiple SDS instances).
 *
 * @remarks
 * This is particularly useful for:
 * - Routing to a Shared Data Server (SDS) while authenticated via PDS
 * - Supporting multiple SDS instances for different organizations
 * - Testing against different server environments
 *
 * @example Basic usage
 * ```typescript
 * const session = await sdk.authorize("user.bsky.social");
 *
 * // Create agent routing to SDS instead of session's default PDS
 * const sdsAgent = new ConfigurableAgent(session, "https://sds.hypercerts.org");
 *
 * // All requests will now go to the SDS
 * await sdsAgent.com.atproto.repo.createRecord({...});
 * ```
 *
 * @example Multiple SDS instances
 * ```typescript
 * // Route to organization A's SDS
 * const orgAAgent = new ConfigurableAgent(session, "https://sds-org-a.example.com");
 *
 * // Route to organization B's SDS
 * const orgBAgent = new ConfigurableAgent(session, "https://sds-org-b.example.com");
 * ```
 */
export class ConfigurableAgent extends Agent {
  private customServiceUrl: string;

  /**
   * Creates a ConfigurableAgent that routes to a specific service URL.
   *
   * @param session - OAuth session for authentication
   * @param serviceUrl - Base URL of the server to route requests to
   *
   * @remarks
   * The agent wraps the session's fetch handler to intercept requests and
   * prepend the custom service URL instead of using the session's default.
   */
  constructor(session: Session, serviceUrl: string) {
    // Create a custom fetch handler that uses our service URL
    const customFetchHandler: FetchHandler = async (pathname: string, init: RequestInit) => {
      // Construct the full URL with our custom service
      const url = new URL(pathname, serviceUrl).toString();

      // Use the session's fetch handler for authentication (DPoP, etc.)
      return session.fetchHandler(url, init);
    };

    // Initialize the parent Agent with our custom fetch handler
    super(customFetchHandler);

    this.customServiceUrl = serviceUrl;
  }

  /**
   * Gets the service URL this agent routes to.
   *
   * @returns The base URL of the configured service
   */
  getServiceUrl(): string {
    return this.customServiceUrl;
  }
}
