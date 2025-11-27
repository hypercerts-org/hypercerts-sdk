/**
 * CollaboratorOperationsImpl - SDS collaborator management operations
 * @packageDocumentation
 */

import { NetworkError } from "../core/errors.js";
import type { CollaboratorPermissions, Session } from "../core/types.js";
import type { CollaboratorOperations } from "./interfaces.js";
import type { RepositoryRole, RepositoryAccessGrant } from "./types.js";

export class CollaboratorOperationsImpl implements CollaboratorOperations {
  constructor(
    private session: Session,
    private repoDid: string,
    private serverUrl: string,
  ) {}

  private roleToPermissions(role: RepositoryRole): CollaboratorPermissions {
    switch (role) {
      case "viewer":
        return { read: true, create: false, update: false, delete: false, admin: false, owner: false };
      case "editor":
        return { read: true, create: true, update: true, delete: false, admin: false, owner: false };
      case "admin":
        return { read: true, create: true, update: true, delete: true, admin: true, owner: false };
      case "owner":
        return { read: true, create: true, update: true, delete: true, admin: true, owner: true };
    }
  }

  private permissionsToRole(permissions: CollaboratorPermissions): RepositoryRole {
    if (permissions.owner) return "owner";
    if (permissions.admin) return "admin";
    if (permissions.create || permissions.update) return "editor";
    return "viewer";
  }

  async grant(params: { userDid: string; role: RepositoryRole }): Promise<void> {
    const permissions = this.roleToPermissions(params.role);

    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.atproto.sds.grantAccess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: this.repoDid,
        userDid: params.userDid,
        permissions,
      }),
    });

    if (!response.ok) {
      throw new NetworkError(`Failed to grant access: ${response.statusText}`);
    }
  }

  async revoke(params: { userDid: string }): Promise<void> {
    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.atproto.sds.revokeAccess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: this.repoDid,
        userDid: params.userDid,
      }),
    });

    if (!response.ok) {
      throw new NetworkError(`Failed to revoke access: ${response.statusText}`);
    }
  }

  async list(): Promise<RepositoryAccessGrant[]> {
    const response = await this.session.fetchHandler(
      `${this.serverUrl}/xrpc/com.atproto.sds.listCollaborators?repo=${encodeURIComponent(this.repoDid)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to list collaborators: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.collaborators || []).map((c: { userDid: string; permissions: CollaboratorPermissions; grantedBy: string; grantedAt: string; revokedAt?: string }) => ({
      userDid: c.userDid,
      role: this.permissionsToRole(c.permissions),
      permissions: c.permissions,
      grantedBy: c.grantedBy,
      grantedAt: c.grantedAt,
      revokedAt: c.revokedAt,
    }));
  }

  async hasAccess(userDid: string): Promise<boolean> {
    try {
      const collaborators = await this.list();
      return collaborators.some((c) => c.userDid === userDid && !c.revokedAt);
    } catch {
      return false;
    }
  }

  async getRole(userDid: string): Promise<RepositoryRole | null> {
    const collaborators = await this.list();
    const collab = collaborators.find((c) => c.userDid === userDid && !c.revokedAt);
    return collab?.role ?? null;
  }
}
