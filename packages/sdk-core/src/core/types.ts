import type { OAuthSession } from "@atproto/oauth-client-node";
import { z } from "zod";

/**
 * Decentralized Identifier (DID) - a unique, persistent identifier for AT Protocol users.
 *
 * DIDs are the canonical identifier for users in the AT Protocol ecosystem.
 * Unlike handles which can change, DIDs remain constant for the lifetime of an account.
 *
 * @remarks
 * AT Protocol supports multiple DID methods:
 * - `did:plc:` - PLC (Public Ledger of Credentials) DIDs, most common for Bluesky users
 * - `did:web:` - Web DIDs, resolved via HTTPS
 *
 * @example
 * ```typescript
 * const did: DID = "did:plc:ewvi7nxzyoun6zhxrhs64oiz";
 * const webDid: DID = "did:web:example.com";
 * ```
 *
 * @see https://atproto.com/specs/did for DID specification
 */
export type DID = string;

/**
 * Validates that a string is a valid DID format.
 *
 * DIDs must follow the format: `did:<method>:<method-specific-id>`
 * where method is lowercase letters and digits, and the identifier contains
 * alphanumeric characters plus `.`, `_`, `:`, `%`, and `-`.
 *
 * @param did - The string to validate
 * @returns true if the string is a valid DID format
 *
 * @example
 * ```typescript
 * isValidDid("did:plc:ewvi7nxzyoun6zhxrhs64oiz"); // true
 * isValidDid("did:web:example.com"); // true
 * isValidDid("not-a-did"); // false
 * isValidDid("did:"); // false
 * ```
 *
 * @see https://www.w3.org/TR/did-core/#did-syntax for DID syntax specification
 */
export function isValidDid(did: string): boolean {
  // DID format: did:<method>:<method-specific-id>
  // Method: lowercase letters and digits (per W3C DID Core spec)
  // Identifier: alphanumeric plus . _ : % -
  return /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]+$/.test(did);
}

/**
 * OAuth session with DPoP (Demonstrating Proof of Possession) support.
 *
 * This type represents an authenticated user session. It wraps the
 * `@atproto/oauth-client-node` OAuthSession and contains:
 * - Access token for API requests
 * - Refresh token for obtaining new access tokens
 * - DPoP key pair for proof-of-possession
 * - User's DID and other identity information
 *
 * @remarks
 * Sessions are managed by the SDK and automatically refresh when tokens expire.
 * Store the user's DID to restore sessions later with {@link ATProtoSDK.restoreSession}.
 *
 * Key properties from OAuthSession:
 * - `did` or `sub`: The user's DID
 * - `handle`: The user's handle (e.g., "user.bsky.social")
 *
 * @example
 * ```typescript
 * const session = await sdk.callback(params);
 *
 * // Access user identity
 * console.log(`Logged in as: ${session.did}`);
 *
 * // Use session for repository operations
 * const repo = sdk.repository(session);
 * ```
 *
 * @see https://atproto.com/specs/oauth for OAuth specification
 */
export type Session = OAuthSession;

/**
 * Zod schema for collaborator permissions in SDS repositories.
 *
 * Defines the granular permissions a collaborator can have on a shared repository.
 * Permissions follow a hierarchical model where higher-level permissions
 * typically imply lower-level ones.
 */
export const CollaboratorPermissionsSchema = z.object({
  /**
   * Can read/view records in the repository.
   * This is the most basic permission level.
   */
  read: z.boolean(),

  /**
   * Can create new records in the repository.
   * Typically implies `read` permission.
   */
  create: z.boolean(),

  /**
   * Can modify existing records in the repository.
   * Typically implies `read` and `create` permissions.
   */
  update: z.boolean(),

  /**
   * Can delete records from the repository.
   * Typically implies `read`, `create`, and `update` permissions.
   */
  delete: z.boolean(),

  /**
   * Can manage collaborators and their permissions.
   * Administrative permission that allows inviting/removing collaborators.
   */
  admin: z.boolean(),

  /**
   * Full ownership of the repository.
   * Owners have all permissions and cannot be removed by other admins.
   * There must always be at least one owner.
   */
  owner: z.boolean(),
});

/**
 * Collaborator permissions for SDS (Shared Data Server) repositories.
 *
 * These permissions control what actions a collaborator can perform
 * on records within a shared repository.
 *
 * @example
 * ```typescript
 * // Read-only collaborator
 * const readOnlyPerms: CollaboratorPermissions = {
 *   read: true,
 *   create: false,
 *   update: false,
 *   delete: false,
 *   admin: false,
 *   owner: false,
 * };
 *
 * // Editor collaborator
 * const editorPerms: CollaboratorPermissions = {
 *   read: true,
 *   create: true,
 *   update: true,
 *   delete: false,
 *   admin: false,
 *   owner: false,
 * };
 *
 * // Admin collaborator
 * const adminPerms: CollaboratorPermissions = {
 *   read: true,
 *   create: true,
 *   update: true,
 *   delete: true,
 *   admin: true,
 *   owner: false,
 * };
 * ```
 */
export type CollaboratorPermissions = z.infer<typeof CollaboratorPermissionsSchema>;

/**
 * Zod schema for SDS organization data.
 *
 * Organizations are top-level entities in SDS that can own repositories
 * and have multiple collaborators with different permission levels.
 */
export const OrganizationSchema = z.object({
  /**
   * The organization's DID - unique identifier.
   * Format: "did:plc:..." or "did:web:..."
   */
  did: z.string(),

  /**
   * The organization's handle - human-readable identifier.
   * Format: "orgname.sds.hypercerts.org" or similar
   */
  handle: z.string(),

  /**
   * Display name for the organization.
   */
  name: z.string(),

  /**
   * Optional description of the organization's purpose.
   */
  description: z.string().optional(),

  /**
   * ISO 8601 timestamp when the organization was created.
   * Format: "2024-01-15T10:30:00.000Z"
   */
  createdAt: z.string(),

  /**
   * The current user's permissions within this organization.
   */
  permissions: CollaboratorPermissionsSchema,

  /**
   * How the current user relates to this organization.
   * - `"owner"`: User created or owns the organization
   * - `"shared"`: User was invited to collaborate (has permissions)
   * - `"none"`: User has no access to this organization
   */
  accessType: z.enum(["owner", "shared", "none"]),
});

/**
 * SDS Organization entity.
 *
 * Represents an organization on a Shared Data Server. Organizations
 * provide a way to group repositories and manage access for teams.
 *
 * @example
 * ```typescript
 * const org: Organization = {
 *   did: "did:plc:org123abc",
 *   handle: "my-team.sds.hypercerts.org",
 *   name: "My Team",
 *   description: "A team working on impact certificates",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 *   permissions: {
 *     read: true,
 *     create: true,
 *     update: true,
 *     delete: true,
 *     admin: true,
 *     owner: true,
 *   },
 *   accessType: "owner",
 * };
 * ```
 */
export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Zod schema for collaborator data.
 *
 * Represents a user who has been granted access to a shared repository
 * or organization with specific permissions.
 */
export const CollaboratorSchema = z.object({
  /**
   * The collaborator's DID - their unique identifier.
   * Format: "did:plc:..." or "did:web:..."
   */
  userDid: z.string(),

  /**
   * The permissions granted to this collaborator.
   */
  permissions: CollaboratorPermissionsSchema,

  /**
   * DID of the user who granted these permissions.
   * Useful for audit trails.
   */
  grantedBy: z.string(),

  /**
   * ISO 8601 timestamp when permissions were granted.
   * Format: "2024-01-15T10:30:00.000Z"
   */
  grantedAt: z.string(),

  /**
   * ISO 8601 timestamp when permissions were revoked, if applicable.
   * Undefined if the collaborator is still active.
   */
  revokedAt: z.string().optional(),
});

/**
 * Collaborator information for SDS repositories.
 *
 * Represents a user who has been granted access to collaborate on
 * a shared repository or organization.
 *
 * @example
 * ```typescript
 * const collaborator: Collaborator = {
 *   userDid: "did:plc:user456def",
 *   permissions: {
 *     read: true,
 *     create: true,
 *     update: true,
 *     delete: false,
 *     admin: false,
 *     owner: false,
 *   },
 *   grantedBy: "did:plc:owner123abc",
 *   grantedAt: "2024-02-01T14:00:00.000Z",
 * };
 * ```
 */
export type Collaborator = z.infer<typeof CollaboratorSchema>;
