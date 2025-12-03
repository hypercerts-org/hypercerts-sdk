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
 * - `com.sds.repo.grantAccess`: Grant access to a user
 * - `com.sds.repo.revokeAccess`: Revoke access from a user
 * - `com.sds.repo.listCollaborators`: List all collaborators
 * - `com.sds.repo.getPermissions`: Get current user's permissions
 * - `com.sds.repo.transferOwnership`: Transfer repository ownership
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
   * Converts a permission string array to a permissions object.
   *
   * The SDS API returns permissions as an array of strings (e.g., ["read", "create"]).
   * This method converts them to the boolean flag format used by the SDK.
   *
   * @param permissionArray - Array of permission strings from SDS API
   * @returns Permission flags object
   * @internal
   */
  private parsePermissions(permissionArray: string[]): CollaboratorPermissions {
    return {
      read: permissionArray.includes("read"),
      create: permissionArray.includes("create"),
      update: permissionArray.includes("update"),
      delete: permissionArray.includes("delete"),
      admin: permissionArray.includes("admin"),
      owner: permissionArray.includes("owner"),
    };
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

    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.sds.repo.grantAccess`, {
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
    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.sds.repo.revokeAccess`, {
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
      `${this.serverUrl}/xrpc/com.sds.repo.listCollaborators?repo=${encodeURIComponent(this.repoDid)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to list collaborators: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.collaborators || []).map(
      (c: {
        userDid: string;
        permissions: string[]; // SDS API returns string array
        grantedBy: string;
        grantedAt: string;
        revokedAt?: string;
      }) => {
        const permissions = this.parsePermissions(c.permissions);
        return {
          userDid: c.userDid,
          role: this.permissionsToRole(permissions),
          permissions: permissions,
          grantedBy: c.grantedBy,
          grantedAt: c.grantedAt,
          revokedAt: c.revokedAt,
        };
      },
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

  /**
   * Gets the current user's permissions for this repository.
   *
   * @returns Promise resolving to the permission flags
   * @throws {@link NetworkError} if the request fails
   *
   * @remarks
   * This is useful for checking what actions the current user can perform
   * before attempting operations that might fail due to insufficient permissions.
   *
   * @example
   * ```typescript
   * const permissions = await repo.collaborators.getPermissions();
   *
   * if (permissions.admin) {
   *   // Show admin UI
   *   console.log("You can manage collaborators");
   * }
   *
   * if (permissions.create) {
   *   console.log("You can create records");
   * }
   * ```
   *
   * @example Conditional UI rendering
   * ```typescript
   * const permissions = await repo.collaborators.getPermissions();
   *
   * // Show/hide UI elements based on permissions
   * const canEdit = permissions.update;
   * const canDelete = permissions.delete;
   * const isAdmin = permissions.admin;
   * const isOwner = permissions.owner;
   * ```
   */
  async getPermissions(): Promise<CollaboratorPermissions> {
    const response = await this.session.fetchHandler(
      `${this.serverUrl}/xrpc/com.sds.repo.getPermissions?repo=${encodeURIComponent(this.repoDid)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new NetworkError(`Failed to get permissions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.permissions as CollaboratorPermissions;
  }

  /**
   * Transfers repository ownership to another user.
   *
   * @param params - Transfer parameters
   * @param params.newOwnerDid - DID of the user to transfer ownership to
   * @throws {@link NetworkError} if the transfer fails
   *
   * @remarks
   * **IMPORTANT**: This action is irreversible. Once ownership is transferred:
   * - The new owner gains full control of the repository
   * - Your role will be changed to admin (or specified role)
   * - You cannot transfer ownership back without the new owner's approval
   *
   * **Requirements**:
   * - You must be the current owner
   * - The new owner must have an existing account
   * - The new owner will be notified of the ownership transfer
   *
   * @example
   * ```typescript
   * // Transfer ownership to another user
   * await repo.collaborators.transferOwnership({
   *   newOwnerDid: "did:plc:new-owner",
   * });
   *
   * console.log("Ownership transferred successfully");
   * // You are now an admin, not the owner
   * ```
   *
   * @example With confirmation
   * ```typescript
   * const confirmTransfer = await askUser(
   *   "Are you sure you want to transfer ownership? This cannot be undone."
   * );
   *
   * if (confirmTransfer) {
   *   await repo.collaborators.transferOwnership({
   *     newOwnerDid: "did:plc:new-owner",
   *   });
   * }
   * ```
   */
  async transferOwnership(params: { newOwnerDid: string }): Promise<void> {
    const response = await this.session.fetchHandler(`${this.serverUrl}/xrpc/com.sds.repo.transferOwnership`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: this.repoDid,
        newOwner: params.newOwnerDid,
      }),
    });

    if (!response.ok) {
      throw new NetworkError(`Failed to transfer ownership: ${response.statusText}`);
    }
  }
}
