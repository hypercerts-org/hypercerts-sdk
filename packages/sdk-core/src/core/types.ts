import type { OAuthSession } from "@atproto/oauth-client-node";
import { z } from "zod";

/**
 * DID (Decentralized Identifier) - ATProto user identifier
 */
export type DID = string;

/**
 * Session - OAuth session with DPoP support
 */
export type Session = OAuthSession;

/**
 * Collaborator permissions schema for SDS repositories
 */
export const CollaboratorPermissionsSchema = z.object({
  read: z.boolean(),
  create: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
  admin: z.boolean(),
  owner: z.boolean(),
});

/**
 * Collaborator permissions for SDS repositories
 */
export type CollaboratorPermissions = z.infer<typeof CollaboratorPermissionsSchema>;

/**
 * SDS Organization schema
 */
export const OrganizationSchema = z.object({
  did: z.string(),
  handle: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  permissions: CollaboratorPermissionsSchema,
  accessType: z.enum(["owner", "collaborator"]),
});

/**
 * SDS Organization
 */
export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Collaborator schema
 */
export const CollaboratorSchema = z.object({
  userDid: z.string(),
  permissions: CollaboratorPermissionsSchema,
  grantedBy: z.string(),
  grantedAt: z.string(),
  revokedAt: z.string().optional(),
});

/**
 * Collaborator information
 */
export type Collaborator = z.infer<typeof CollaboratorSchema>;
