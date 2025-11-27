/**
 * OrganizationOperationsImpl - SDS organization management operations
 * @packageDocumentation
 */

import { NetworkError } from "../core/errors.js";
import type { CollaboratorPermissions, Session } from "../core/types.js";
import type { LoggerInterface } from "../core/interfaces.js";
import type { OrganizationOperations } from "./interfaces.js";
import type { OrganizationInfo } from "./types.js";

export class OrganizationOperationsImpl implements OrganizationOperations {
  constructor(
    private session: Session,
    private _repoDid: string,
    private serverUrl: string,
    private _logger?: LoggerInterface,
  ) {}

  async create(params: { name: string; description?: string; handle?: string }): Promise<OrganizationInfo> {
    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.atproto.sds.createRepository`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
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
      accessType: "owner",
      permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: true },
    };
  }

  async get(did: string): Promise<OrganizationInfo | null> {
    try {
      const orgs = await this.list();
      return orgs.find((o) => o.did === did) ?? null;
    } catch {
      return null;
    }
  }

  async list(): Promise<OrganizationInfo[]> {
    const response = await this.session.fetchHandler(
      `${this.serverUrl}/xrpc/com.atproto.sds.listRepositories?userDid=${encodeURIComponent(this.session.did || this.session.sub)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to list organizations: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.repositories || []).map((r: { did: string; handle: string; name: string; description?: string; accessType: "owner" | "collaborator"; permissions: CollaboratorPermissions }) => ({
      did: r.did,
      handle: r.handle,
      name: r.name,
      description: r.description,
      createdAt: new Date().toISOString(), // SDS may not return this
      accessType: r.accessType,
      permissions: r.permissions,
    }));
  }
}
