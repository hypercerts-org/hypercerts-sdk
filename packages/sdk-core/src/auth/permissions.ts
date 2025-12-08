/**
 * OAuth Scopes and Granular Permissions
 *
 * This module provides type-safe, Zod-validated OAuth scope and permission management
 * for the ATProto SDK. It supports both legacy transitional scopes and the new
 * granular permissions model.
 *
 * @see https://atproto.com/specs/oauth
 * @see https://atproto.com/specs/permission
 *
 * @module auth/permissions
 */

import { z } from "zod";

/**
 * Base OAuth scope - required for all sessions
 *
 * @constant
 */
export const ATPROTO_SCOPE = "atproto" as const;

/**
 * Transitional OAuth scopes for legacy compatibility.
 *
 * These scopes provide broad access and are maintained for backwards compatibility.
 * New applications should use granular permissions instead.
 *
 * @deprecated Use granular permissions (account:*, repo:*, etc.) for better control
 * @constant
 */
export const TRANSITION_SCOPES = {
  /** Broad PDS permissions including record creation, blob uploads, and preferences */
  GENERIC: "transition:generic",
  /** Direct messages access (requires transition:generic) */
  CHAT: "transition:chat.bsky",
  /** Email address and confirmation status */
  EMAIL: "transition:email",
} as const;

/**
 * Zod schema for transitional scopes.
 *
 * Validates that a scope string is one of the known transitional scopes.
 *
 * @example
 * ```typescript
 * TransitionScopeSchema.parse('transition:email'); // Valid
 * TransitionScopeSchema.parse('invalid'); // Throws ZodError
 * ```
 */
export const TransitionScopeSchema = z
  .enum(["transition:generic", "transition:chat.bsky", "transition:email"])
  .describe("Legacy transitional OAuth scopes");

/**
 * Type for transitional scopes inferred from schema.
 */
export type TransitionScope = z.infer<typeof TransitionScopeSchema>;

/**
 * Zod schema for account permission attributes.
 *
 * Account attributes specify what aspect of the account is being accessed.
 */
export const AccountAttrSchema = z.enum(["email", "repo"]);

/**
 * Type for account attributes inferred from schema.
 */
export type AccountAttr = z.infer<typeof AccountAttrSchema>;

/**
 * Zod schema for account actions.
 *
 * Account actions specify the level of access (read-only or management).
 */
export const AccountActionSchema = z.enum(["read", "manage"]);

/**
 * Type for account actions inferred from schema.
 */
export type AccountAction = z.infer<typeof AccountActionSchema>;

/**
 * Zod schema for repository actions.
 *
 * Repository actions specify what operations can be performed on records.
 */
export const RepoActionSchema = z.enum(["create", "update", "delete"]);

/**
 * Type for repository actions inferred from schema.
 */
export type RepoAction = z.infer<typeof RepoActionSchema>;

/**
 * Zod schema for identity permission attributes.
 *
 * Identity attributes specify what identity information can be managed.
 */
export const IdentityAttrSchema = z.enum(["handle", "*"]);

/**
 * Type for identity attributes inferred from schema.
 */
export type IdentityAttr = z.infer<typeof IdentityAttrSchema>;

/**
 * Zod schema for MIME type patterns.
 *
 * Validates MIME type strings like "image/*" or "video/mp4".
 *
 * @example
 * ```typescript
 * MimeTypeSchema.parse('image/*'); // Valid
 * MimeTypeSchema.parse('video/mp4'); // Valid
 * MimeTypeSchema.parse('invalid'); // Throws ZodError
 * ```
 */
export const MimeTypeSchema = z
  .string()
  .regex(
    /^[a-z]+\/[a-z0-9*+-]+$/i,
    'Invalid MIME type pattern. Expected format: type/subtype (e.g., "image/*" or "video/mp4")',
  );

/**
 * Zod schema for NSID (Namespaced Identifier).
 *
 * NSIDs are reverse-DNS style identifiers used throughout ATProto
 * (e.g., "app.bsky.feed.post" or "com.example.myrecord").
 *
 * @see https://atproto.com/specs/nsid
 *
 * @example
 * ```typescript
 * NsidSchema.parse('app.bsky.feed.post'); // Valid
 * NsidSchema.parse('com.example.myrecord'); // Valid
 * NsidSchema.parse('InvalidNSID'); // Throws ZodError
 * ```
 */
export const NsidSchema = z
  .string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/,
    'Invalid NSID format. Expected reverse-DNS format (e.g., "app.bsky.feed.post")',
  );

/**
 * Zod schema for account permission.
 *
 * Account permissions control access to account-level information like email
 * and repository management.
 *
 * @example Without action (read-only)
 * ```typescript
 * const input = { type: 'account', attr: 'email' };
 * AccountPermissionSchema.parse(input); // Returns: "account:email"
 * ```
 *
 * @example With action
 * ```typescript
 * const input = { type: 'account', attr: 'email', action: 'manage' };
 * AccountPermissionSchema.parse(input); // Returns: "account:email?action=manage"
 * ```
 */
export const AccountPermissionSchema = z
  .object({
    type: z.literal("account"),
    attr: AccountAttrSchema,
    action: AccountActionSchema.optional(),
  })
  .transform(({ attr, action }) => {
    let perm = `account:${attr}`;
    if (action) {
      perm += `?action=${action}`;
    }
    return perm;
  });

/**
 * Input type for account permission (before transform).
 */
export type AccountPermissionInput = z.input<typeof AccountPermissionSchema>;

/**
 * Zod schema for repository permission.
 *
 * Repository permissions control write access to records by collection type.
 * The collection must be a valid NSID or wildcard (*).
 *
 * @example Without actions (all actions allowed)
 * ```typescript
 * const input = { type: 'repo', collection: 'app.bsky.feed.post' };
 * RepoPermissionSchema.parse(input); // Returns: "repo:app.bsky.feed.post"
 * ```
 *
 * @example With specific actions
 * ```typescript
 * const input = {
 *   type: 'repo',
 *   collection: 'app.bsky.feed.post',
 *   actions: ['create', 'update']
 * };
 * RepoPermissionSchema.parse(input); // Returns: "repo:app.bsky.feed.post?action=create&action=update"
 * ```
 *
 * @example With wildcard collection
 * ```typescript
 * const input = { type: 'repo', collection: '*', actions: ['delete'] };
 * RepoPermissionSchema.parse(input); // Returns: "repo:*?action=delete"
 * ```
 */
export const RepoPermissionSchema = z
  .object({
    type: z.literal("repo"),
    collection: NsidSchema.or(z.literal("*")),
    actions: z.array(RepoActionSchema).optional(),
  })
  .transform(({ collection, actions }) => {
    let perm = `repo:${collection}`;
    if (actions && actions.length > 0) {
      const params = actions.map((a) => `action=${a}`).join("&");
      perm += `?${params}`;
    }
    return perm;
  });

/**
 * Input type for repository permission (before transform).
 */
export type RepoPermissionInput = z.input<typeof RepoPermissionSchema>;

/**
 * Zod schema for blob permission.
 *
 * Blob permissions control media file uploads constrained by MIME type patterns.
 *
 * @example Single MIME type
 * ```typescript
 * const input = { type: 'blob', mimeTypes: ['image/*'] };
 * BlobPermissionSchema.parse(input); // Returns: "blob:image/*"
 * ```
 *
 * @example Multiple MIME types
 * ```typescript
 * const input = { type: 'blob', mimeTypes: ['image/*', 'video/*'] };
 * BlobPermissionSchema.parse(input); // Returns: "blob?accept=image/*&accept=video/*"
 * ```
 */
export const BlobPermissionSchema = z
  .object({
    type: z.literal("blob"),
    mimeTypes: z.array(MimeTypeSchema).min(1, "At least one MIME type required"),
  })
  .transform(({ mimeTypes }) => {
    if (mimeTypes.length === 1) {
      return `blob:${mimeTypes[0]}`;
    }
    const accepts = mimeTypes.map((t) => `accept=${encodeURIComponent(t)}`).join("&");
    return `blob?${accepts}`;
  });

/**
 * Input type for blob permission (before transform).
 */
export type BlobPermissionInput = z.input<typeof BlobPermissionSchema>;

/**
 * Zod schema for RPC permission.
 *
 * RPC permissions control authenticated API calls to remote services.
 * At least one of lexicon or aud must be restricted (both cannot be wildcards).
 *
 * @example Specific lexicon with wildcard audience
 * ```typescript
 * const input = {
 *   type: 'rpc',
 *   lexicon: 'com.atproto.repo.createRecord',
 *   aud: '*'
 * };
 * RpcPermissionSchema.parse(input);
 * // Returns: "rpc:com.atproto.repo.createRecord?aud=*"
 * ```
 *
 * @example With specific audience
 * ```typescript
 * const input = {
 *   type: 'rpc',
 *   lexicon: 'com.atproto.repo.createRecord',
 *   aud: 'did:web:api.example.com',
 *   inheritAud: true
 * };
 * RpcPermissionSchema.parse(input);
 * // Returns: "rpc:com.atproto.repo.createRecord?aud=did%3Aweb%3Aapi.example.com&inheritAud=true"
 * ```
 */
export const RpcPermissionSchema = z
  .object({
    type: z.literal("rpc"),
    lexicon: NsidSchema.or(z.literal("*")),
    aud: z.string().min(1, "Audience is required"),
    inheritAud: z.boolean().optional(),
  })
  .refine(
    ({ lexicon, aud }) => lexicon !== "*" || aud !== "*",
    "At least one of lexicon or aud must be restricted (wildcards cannot both be used)",
  )
  .transform(({ lexicon, aud, inheritAud }) => {
    let perm = `rpc:${lexicon}?aud=${encodeURIComponent(aud)}`;
    if (inheritAud) {
      perm += "&inheritAud=true";
    }
    return perm;
  });

/**
 * Input type for RPC permission (before transform).
 */
export type RpcPermissionInput = z.input<typeof RpcPermissionSchema>;

/**
 * Zod schema for identity permission.
 *
 * Identity permissions control access to DID documents and handles.
 *
 * @example Handle management
 * ```typescript
 * const input = { type: 'identity', attr: 'handle' };
 * IdentityPermissionSchema.parse(input); // Returns: "identity:handle"
 * ```
 *
 * @example All identity attributes
 * ```typescript
 * const input = { type: 'identity', attr: '*' };
 * IdentityPermissionSchema.parse(input); // Returns: "identity:*"
 * ```
 */
export const IdentityPermissionSchema = z
  .object({
    type: z.literal("identity"),
    attr: IdentityAttrSchema,
  })
  .transform(({ attr }) => `identity:${attr}`);

/**
 * Input type for identity permission (before transform).
 */
export type IdentityPermissionInput = z.input<typeof IdentityPermissionSchema>;

/**
 * Zod schema for permission set inclusion.
 *
 * Include permissions reference permission sets bundled under a single NSID.
 *
 * @example Without audience
 * ```typescript
 * const input = { type: 'include', nsid: 'com.example.authBasicFeatures' };
 * IncludePermissionSchema.parse(input);
 * // Returns: "include:com.example.authBasicFeatures"
 * ```
 *
 * @example With audience
 * ```typescript
 * const input = {
 *   type: 'include',
 *   nsid: 'com.example.authBasicFeatures',
 *   aud: 'did:web:api.example.com'
 * };
 * IncludePermissionSchema.parse(input);
 * // Returns: "include:com.example.authBasicFeatures?aud=did%3Aweb%3Aapi.example.com"
 * ```
 */
export const IncludePermissionSchema = z
  .object({
    type: z.literal("include"),
    nsid: NsidSchema,
    aud: z.string().optional(),
  })
  .transform(({ nsid, aud }) => {
    let perm = `include:${nsid}`;
    if (aud) {
      perm += `?aud=${encodeURIComponent(aud)}`;
    }
    return perm;
  });

/**
 * Input type for include permission (before transform).
 */
export type IncludePermissionInput = z.input<typeof IncludePermissionSchema>;

/**
 * Union schema for all permission types.
 *
 * This schema accepts any of the supported permission types and validates
 * them according to their specific rules.
 */
export const PermissionSchema = z.union([
  AccountPermissionSchema,
  RepoPermissionSchema,
  BlobPermissionSchema,
  RpcPermissionSchema,
  IdentityPermissionSchema,
  IncludePermissionSchema,
]);

/**
 * Input type for any permission (before transform).
 */
export type PermissionInput = z.input<typeof PermissionSchema>;

/**
 * Output type for any permission (after transform).
 */
export type Permission = z.output<typeof PermissionSchema>;
