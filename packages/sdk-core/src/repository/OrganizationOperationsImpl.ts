/**
 * OrganizationOperationsImpl - SDS organization management operations.
 *
 * This module provides the implementation for creating and managing
 * organizations on Shared Data Server (SDS) instances.
 *
 * @packageDocumentation
 */

import { NetworkError } from "../core/errors.js";
import type { CollaboratorPermissions, Session } from "../core/types.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { OrganizationOperations } from "./interfaces.js";
import type { OrganizationInfo } from "./types.js";

/**
 * Implementation of organization operations for SDS management.
 *
 * Organizations on SDS provide a way to create shared repositories
 * that multiple users can collaborate on. Each organization has:
 *
 * - A unique DID (Decentralized Identifier)
 * - A handle for human-readable identification
 * - An owner and optional collaborators
 * - Its own repository for storing records
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.organizations} on an SDS-connected repository.
 *
 * **SDS API Endpoints Used**:
 * - `com.sds.organization.create`: Create a new organization
 * - `com.sds.organization.list`: List accessible organizations
 *
 * **Access Types**:
 * - `"owner"`: User created or owns the organization
 * - `"collaborator"`: User was invited with specific permissions
 *
 * @example
 * ```typescript
 * // Get SDS repository
 * const sdsRepo = sdk.repository(session, { server: "sds" });
 *
 * // Create an organization
 * const org = await sdsRepo.organizations.create({
 *   name: "My Team",
 *   description: "A team for impact projects",
 * });
 *
 * // List organizations you have access to
 * const orgs = await sdsRepo.organizations.list();
 *
 * // Get specific organization
 * const orgInfo = await sdsRepo.organizations.get(org.did);
 * ```
 *
 * @internal
 */
export class OrganizationOperationsImpl implements OrganizationOperations {
  /**
   * Creates a new OrganizationOperationsImpl.
   *
   * @param session - Authenticated OAuth session with fetchHandler
   * @param _repoDid - DID of the user's repository (reserved for future use)
   * @param serverUrl - SDS server URL
   * @param _logger - Optional logger for debugging (reserved for future use)
   *
   * @internal
   */
  constructor(
    private session: Session,
    private _repoDid: string,
    private serverUrl: string,
    private _logger?: LoggerInterface,
  ) {}

  /**
   * Creates a new organization.
   *
   * @param params - Organization parameters
   * @param params.name - Display name for the organization
   * @param params.description - Optional description of the organization's purpose
   * @param params.handle - Optional custom handle. If not provided, one is auto-generated.
   * @returns Promise resolving to the created organization info
   * @throws {@link NetworkError} if organization creation fails
   *
   * @remarks
   * The creating user automatically becomes the owner with full permissions.
   *
   * **Handle Format**: Handles are typically formatted as
   * `{name}.sds.{domain}` (e.g., "my-team.sds.hypercerts.org").
   * If you provide a custom handle, it must be unique on the SDS.
   *
   * @example Basic organization
   * ```typescript
   * const org = await repo.organizations.create({
   *   name: "Climate Action Team",
   * });
   * console.log(`Created org: ${org.did}`);
   * ```
   *
   * @example With description and custom handle
   * ```typescript
   * const org = await repo.organizations.create({
   *   name: "Reforestation Initiative",
   *   description: "Coordinating tree planting projects worldwide",
   *   handle: "reforestation",
   * });
   * ```
   */
  async create(params: { name: string; description?: string; handle?: string }): Promise<OrganizationInfo> {
    const userDid = this.session.did || this.session.sub;
    if (!userDid) {
      throw new NetworkError("No authenticated user found");
    }

    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.sds.organization.create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        creatorDid: userDid,
      }),
    });

    if (!response.ok) {
      throw new NetworkError(`Failed to create organization: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      did: data.did,
      handle: data.handle,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt || new Date().toISOString(),
      accessType: data.accessType || "owner",
      permissions: data.permissions || {
        read: true,
        create: true,
        update: true,
        delete: true,
        admin: true,
        owner: true,
      },
    };
  }

  /**
   * Gets an organization by its DID.
   *
   * @param did - The organization's DID
   * @returns Promise resolving to organization info, or `null` if not found
   *
   * @remarks
   * This method searches through the user's accessible organizations.
   * If the organization exists but the user doesn't have access,
   * it will return `null`.
   *
   * @example
   * ```typescript
   * const org = await repo.organizations.get("did:plc:org123");
   * if (org) {
   *   console.log(`Found: ${org.name}`);
   *   console.log(`Your role: ${org.accessType}`);
   * } else {
   *   console.log("Organization not found or no access");
   * }
   * ```
   */
  async get(did: string): Promise<OrganizationInfo | null> {
    try {
      const { organizations } = await this.list();
      return organizations.find((o) => o.did === did) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Lists organizations the current user has access to.
   *
   * @param params - Optional pagination parameters
   * @param params.limit - Maximum number of results (1-100, default 50)
   * @param params.cursor - Pagination cursor from previous response
   * @returns Promise resolving to organizations and optional cursor
   * @throws {@link NetworkError} if the list operation fails
   *
   * @remarks
   * Returns organizations where the user is either:
   * - The owner
   * - A collaborator with any permission level
   *
   * The `accessType` field indicates the user's relationship to each organization.
   *
   * @example
   * ```typescript
   * // Get first page
   * const page1 = await repo.organizations.list({ limit: 20 });
   * console.log(`Found ${page1.organizations.length} organizations`);
   *
   * // Get next page if available
   * if (page1.cursor) {
   *   const page2 = await repo.organizations.list({ limit: 20, cursor: page1.cursor });
   * }
   *
   * // Filter by access type
   * const owned = page1.organizations.filter(o => o.accessType === "owner");
   * const shared = page1.organizations.filter(o => o.accessType === "shared");
   * ```
   *
   * @example Display organization details
   * ```typescript
   * const { organizations } = await repo.organizations.list();
   *
   * for (const org of organizations) {
   *   console.log(`${org.name} (@${org.handle})`);
   *   console.log(`  DID: ${org.did}`);
   *   console.log(`  Access: ${org.accessType}`);
   *   if (org.description) {
   *     console.log(`  Description: ${org.description}`);
   *   }
   * }
   * ```
   */
  async list(params?: { limit?: number; cursor?: string }): Promise<{
    organizations: OrganizationInfo[];
    cursor?: string;
  }> {
    const userDid = this.session.did || this.session.sub;
    if (!userDid) {
      throw new NetworkError("No authenticated user found");
    }

    const queryParams = new URLSearchParams({
      userDid,
    });

    if (params?.limit !== undefined) {
      queryParams.set("limit", params.limit.toString());
    }

    if (params?.cursor) {
      queryParams.set("cursor", params.cursor);
    }

    const response = await this.session.fetchHandler(
      `${this.serverUrl}/xrpc/com.sds.organization.list?${queryParams.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to list organizations: ${response.statusText}`);
    }

    const data = await response.json();
    const organizations = (data.organizations || []).map(
      (r: {
        did: string;
        handle: string;
        name: string;
        description?: string;
        createdAt?: string;
        accessType: "owner" | "shared" | "none";
        permissions: CollaboratorPermissions;
      }) => ({
        did: r.did,
        handle: r.handle,
        name: r.name,
        description: r.description,
        createdAt: r.createdAt || new Date().toISOString(),
        accessType: r.accessType,
        permissions: r.permissions,
      }),
    );

    return {
      organizations,
      cursor: data.cursor,
    };
  }
}
