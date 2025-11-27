/**
 * CollaboratorOperationsImpl - SDS collaborator management operations.
 *
 * This module provides the implementation for managing collaborator
 * access on Shared Data Server (SDS) repositories.
 *
 * @packageDocumentation
 */

import { NetworkError } from "../core/errors.js";
import type { CollaboratorPermissions, Session } from "../core/types.js";
import type { CollaboratorOperations } from "./interfaces.js";
import type { RepositoryRole, RepositoryAccessGrant } from "./types.js";

/**
 * Implementation of collaborator operations for SDS access control.
 *
 * This class manages access permissions for shared repositories on
 * Shared Data Servers (SDS). It provides role-based access control
 * with predefined permission sets.
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.collaborators} on an SDS-connected repository.
 *
 * **Role Hierarchy**:
 * - `viewer`: Read-only access
 * - `editor`: Read + Create + Update
 * - `admin`: All permissions except ownership transfer
 * - `owner`: Full control including ownership management
 *
 * **SDS API Endpoints Used**:
 * - `com.atproto.sds.grantAccess`: Grant access to a user
 * - `com.atproto.sds.revokeAccess`: Revoke access from a user
 * - `com.atproto.sds.listCollaborators`: List all collaborators
 *
 * @example
 * ```typescript
 * // Get SDS repository
 * const sdsRepo = sdk.repository(session, { server: "sds" });
 *
 * // Grant editor access
 * await sdsRepo.collaborators.grant({
 *   userDid: "did:plc:new-user",
 *   role: "editor",
 * });
 *
 * // List all collaborators
 * const collaborators = await sdsRepo.collaborators.list();
 *
 * // Check specific user
 * const hasAccess = await sdsRepo.collaborators.hasAccess("did:plc:someone");
 * const role = await sdsRepo.collaborators.getRole("did:plc:someone");
 * ```
 *
 * @internal
 */
export class CollaboratorOperationsImpl implements CollaboratorOperations {
  /**
   * Creates a new CollaboratorOperationsImpl.
   *
   * @param session - Authenticated OAuth session with fetchHandler
   * @param repoDid - DID of the repository to manage
   * @param serverUrl - SDS server URL
   *
   * @internal
   */
  constructor(
    private session: Session,
    private repoDid: string,
    private serverUrl: string,
  ) {}

  /**
   * Converts a role to its corresponding permissions object.
   *
   * @param role - The role to convert
   * @returns Permission flags for the role
   * @internal
   */
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

  /**
   * Determines the role from a permissions object.
   *
   * @param permissions - The permissions to analyze
   * @returns The highest role matching the permissions
   * @internal
   */
  private permissionsToRole(permissions: CollaboratorPermissions): RepositoryRole {
    if (permissions.owner) return "owner";
    if (permissions.admin) return "admin";
    if (permissions.create || permissions.update) return "editor";
    return "viewer";
  }

  /**
   * Grants repository access to a user.
   *
   * @param params - Grant parameters
   * @param params.userDid - DID of the user to grant access to
   * @param params.role - Role to assign (determines permissions)
   * @throws {@link NetworkError} if the grant operation fails
   *
   * @remarks
   * If the user already has access, their permissions are updated
   * to the new role.
   *
   * @example
   * ```typescript
   * // Grant viewer access
   * await repo.collaborators.grant({
   *   userDid: "did:plc:viewer-user",
   *   role: "viewer",
   * });
   *
   * // Upgrade to editor
   * await repo.collaborators.grant({
   *   userDid: "did:plc:viewer-user",
   *   role: "editor",
   * });
   * ```
   */
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

  /**
   * Revokes repository access from a user.
   *
   * @param params - Revoke parameters
   * @param params.userDid - DID of the user to revoke access from
   * @throws {@link NetworkError} if the revoke operation fails
   *
   * @remarks
   * - Cannot revoke access from the repository owner
   * - Revoked access is recorded with a `revokedAt` timestamp
   *
   * @example
   * ```typescript
   * await repo.collaborators.revoke({
   *   userDid: "did:plc:former-collaborator",
   * });
   * ```
   */
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

  /**
   * Lists all collaborators on the repository.
   *
   * @returns Promise resolving to array of access grants
   * @throws {@link NetworkError} if the list operation fails
   *
   * @remarks
   * The list includes both active and revoked collaborators.
   * Check `revokedAt` to filter active collaborators.
   *
   * @example
   * ```typescript
   * const collaborators = await repo.collaborators.list();
   *
   * // Filter active collaborators
   * const active = collaborators.filter(c => !c.revokedAt);
   *
   * // Group by role
   * const byRole = {
   *   owners: active.filter(c => c.role === "owner"),
   *   admins: active.filter(c => c.role === "admin"),
   *   editors: active.filter(c => c.role === "editor"),
   *   viewers: active.filter(c => c.role === "viewer"),
   * };
   * ```
   */
  async list(): Promise<RepositoryAccessGrant[]> {
    const response = await this.session.fetchHandler(
      `${this.serverUrl}/xrpc/com.atproto.sds.listCollaborators?repo=${encodeURIComponent(this.repoDid)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to list collaborators: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.collaborators || []).map(
      (c: {
        userDid: string;
        permissions: CollaboratorPermissions;
        grantedBy: string;
        grantedAt: string;
        revokedAt?: string;
      }) => ({
        userDid: c.userDid,
        role: this.permissionsToRole(c.permissions),
        permissions: c.permissions,
        grantedBy: c.grantedBy,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
      }),
    );
  }

  /**
   * Checks if a user has any access to the repository.
   *
   * @param userDid - DID of the user to check
   * @returns Promise resolving to `true` if user has active access
   *
   * @remarks
   * Returns `false` if:
   * - User was never granted access
   * - User's access was revoked
   * - The list operation fails (error is suppressed)
   *
   * @example
   * ```typescript
   * if (await repo.collaborators.hasAccess("did:plc:someone")) {
   *   console.log("User has access");
   * }
   * ```
   */
  async hasAccess(userDid: string): Promise<boolean> {
    try {
      const collaborators = await this.list();
      return collaborators.some((c) => c.userDid === userDid && !c.revokedAt);
    } catch {
      return false;
    }
  }

  /**
   * Gets the role assigned to a user.
   *
   * @param userDid - DID of the user to check
   * @returns Promise resolving to the user's role, or `null` if no active access
   *
   * @example
   * ```typescript
   * const role = await repo.collaborators.getRole("did:plc:someone");
   * if (role === "admin" || role === "owner") {
   *   // User can manage other collaborators
   * }
   * ```
   */
  async getRole(userDid: string): Promise<RepositoryRole | null> {
    const collaborators = await this.list();
    const collab = collaborators.find((c) => c.userDid === userDid && !c.revokedAt);
    return collab?.role ?? null;
  }
}
