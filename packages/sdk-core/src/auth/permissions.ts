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
 * Validates MIME type strings used in blob permissions.
 * Supports standard MIME types and wildcard patterns per ATProto spec.
 *
 * **References:**
 * - ATProto Permission Spec: https://atproto.com/specs/permission (blob resource)
 * - RFC 2045 (MIME): https://www.rfc-editor.org/rfc/rfc2045 (token definition)
 * - IANA Media Types: https://www.iana.org/assignments/media-types/
 *
 * **Implementation:**
 * This is a "good enough" validation that allows common real-world MIME types:
 * - Type: letters, digits (e.g., "3gpp")
 * - Subtype: letters, digits, hyphens, plus signs, dots, underscores, wildcards
 * - Examples: "image/png", "application/vnd.api+json", "video/*", "clue_info+xml"
 *
 * Note: We use a simplified regex rather than full RFC 2045 token validation
 * for practicality. Zod v4 has native MIME support (z.file().mime()) but would
 * require a larger migration effort.
 *
 * @example
 * ```typescript
 * MimeTypeSchema.parse('image/*'); // Valid - wildcard
 * MimeTypeSchema.parse('video/mp4'); // Valid - standard
 * MimeTypeSchema.parse('application/vnd.api+json'); // Valid - with dots/plus
 * MimeTypeSchema.parse('invalid'); // Throws ZodError
 * ```
 */
export const MimeTypeSchema = z
  .string()
  .regex(
    /^[a-z0-9]+\/[a-z0-9*+._-]+$/i,
    'Invalid MIME type pattern. Expected format: type/subtype (e.g., "image/*", "video/mp4", "application/vnd.api+json")',
  );

/**
 * Zod schema for NSID (Namespaced Identifier).
 *
 * NSIDs are reverse-DNS style identifiers used throughout ATProto
 * (e.g., "app.bsky.feed.post" or "com.example.myrecord").
 *
 * Official ATProto NSID spec requires:
 * - Each segment must be 1-63 characters
 * - Authority segments (all but last) can contain hyphens, but not at boundaries
 * - Name segment (last) must start with a letter and contain only alphanumerics
 * - Hyphens only allowed in authority segments, not in the name segment
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
    /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/,
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

/**
 * Fluent builder for constructing OAuth permission arrays.
 *
 * This class provides a convenient, type-safe way to build arrays of permissions
 * using method chaining.
 *
 * @example Basic usage
 * ```typescript
 * const builder = new PermissionBuilder()
 *   .accountEmail('read')
 *   .repoWrite('app.bsky.feed.post')
 *   .blob(['image/*', 'video/*']);
 *
 * const permissions = builder.build();
 * // Returns: ['account:email?action=read', 'repo:app.bsky.feed.post?action=create&action=update', 'blob:image/*,video/*']
 * ```
 *
 * @example With transitional scopes
 * ```typescript
 * const builder = new PermissionBuilder()
 *   .transition('email')
 *   .transition('generic');
 *
 * const scopes = builder.build();
 * // Returns: ['transition:email', 'transition:generic']
 * ```
 */
export class PermissionBuilder {
  private permissions: string[] = [];

  /**
   * Add a transitional scope.
   *
   * @param scope - The transitional scope name ('email', 'generic', or 'chat.bsky')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.transition('email').transition('generic');
   * ```
   */
  transition(scope: "email" | "generic" | "chat.bsky"): this {
    const fullScope = `transition:${scope}`;
    const validated = TransitionScopeSchema.parse(fullScope);
    this.permissions.push(validated);
    return this;
  }

  /**
   * Add an account permission.
   *
   * @param attr - The account attribute ('email' or 'repo')
   * @param action - Optional action ('read' or 'manage')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.accountEmail('read').accountRepo('manage');
   * ```
   */
  account(attr: z.infer<typeof AccountAttrSchema>, action?: z.infer<typeof AccountActionSchema>): this {
    const permission = AccountPermissionSchema.parse({
      type: "account",
      attr,
      action,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Convenience method for account:email permission.
   *
   * @param action - Optional action ('read' or 'manage')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.accountEmail('read');
   * ```
   */
  accountEmail(action?: z.infer<typeof AccountActionSchema>): this {
    return this.account("email", action);
  }

  /**
   * Convenience method for account:repo permission.
   *
   * @param action - Optional action ('read' or 'manage')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.accountRepo('manage');
   * ```
   */
  accountRepo(action?: z.infer<typeof AccountActionSchema>): this {
    return this.account("repo", action);
  }

  /**
   * Add a repository permission.
   *
   * @param collection - The NSID of the collection or '*' for all
   * @param actions - Optional array of actions ('create', 'update', 'delete')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.repo('app.bsky.feed.post', ['create', 'update']);
   * ```
   */
  repo(collection: string, actions?: z.infer<typeof RepoActionSchema>[]): this {
    const permission = RepoPermissionSchema.parse({
      type: "repo",
      collection,
      actions,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Convenience method for repository write permissions (create + update).
   *
   * @param collection - The NSID of the collection or '*' for all
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.repoWrite('app.bsky.feed.post');
   * ```
   */
  repoWrite(collection: string): this {
    return this.repo(collection, ["create", "update"]);
  }

  /**
   * Convenience method for repository read permission (no actions).
   *
   * @param collection - The NSID of the collection or '*' for all
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.repoRead('app.bsky.feed.post');
   * ```
   */
  repoRead(collection: string): this {
    return this.repo(collection, []);
  }

  /**
   * Convenience method for full repository permissions (create + update + delete).
   *
   * @param collection - The NSID of the collection or '*' for all
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.repoFull('app.bsky.feed.post');
   * ```
   */
  repoFull(collection: string): this {
    return this.repo(collection, ["create", "update", "delete"]);
  }

  /**
   * Add a blob permission.
   *
   * @param mimeTypes - Array of MIME types or a single MIME type
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.blob(['image/*', 'video/*']);
   * builder.blob('image/*');
   * ```
   */
  blob(mimeTypes: string | string[]): this {
    const types = Array.isArray(mimeTypes) ? mimeTypes : [mimeTypes];
    const permission = BlobPermissionSchema.parse({
      type: "blob",
      mimeTypes: types,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Add an RPC permission.
   *
   * @param lexicon - The NSID of the lexicon or '*' for all
   * @param aud - The audience (DID or URL)
   * @param inheritAud - Whether to inherit audience
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.rpc('com.atproto.repo.createRecord', 'did:web:api.example.com');
   * ```
   */
  rpc(lexicon: string, aud: string, inheritAud?: boolean): this {
    const permission = RpcPermissionSchema.parse({
      type: "rpc",
      lexicon,
      aud,
      inheritAud,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Add an identity permission.
   *
   * @param attr - The identity attribute ('handle' or '*')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.identity('handle');
   * ```
   */
  identity(attr: z.infer<typeof IdentityAttrSchema>): this {
    const permission = IdentityPermissionSchema.parse({
      type: "identity",
      attr,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Add an include permission.
   *
   * @param nsid - The NSID of the scope set to include
   * @param aud - Optional audience restriction
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.include('com.example.authBasicFeatures');
   * ```
   */
  include(nsid: string, aud?: string): this {
    const permission = IncludePermissionSchema.parse({
      type: "include",
      nsid,
      aud,
    });
    this.permissions.push(permission);
    return this;
  }

  /**
   * Add a custom permission string directly (bypasses validation).
   *
   * Use this for testing or special cases where you need to add
   * a permission that doesn't fit the standard types.
   *
   * @param permission - The permission string
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.custom('atproto');
   * ```
   */
  custom(permission: string): this {
    this.permissions.push(permission);
    return this;
  }

  /**
   * Add the base atproto scope.
   *
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.atproto();
   * ```
   */
  atproto(): this {
    this.permissions.push(ATPROTO_SCOPE);
    return this;
  }

  /**
   * Build and return the array of permission strings.
   *
   * @returns Array of permission strings
   *
   * @example
   * ```typescript
   * const permissions = builder.build();
   * ```
   */
  build(): string[] {
    return [...this.permissions];
  }

  /**
   * Clear all permissions from the builder.
   *
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.clear().accountEmail('read');
   * ```
   */
  clear(): this {
    this.permissions = [];
    return this;
  }

  /**
   * Get the current number of permissions.
   *
   * @returns The number of permissions
   *
   * @example
   * ```typescript
   * const count = builder.count();
   * ```
   */
  count(): number {
    return this.permissions.length;
  }
}

/**
 * Build a scope string from an array of permissions.
 *
 * This is a convenience function that joins permission strings with spaces,
 * which is the standard format for OAuth scope parameters.
 *
 * @param permissions - Array of permission strings
 * @returns Space-separated scope string
 *
 * @example
 * ```typescript
 * const permissions = ['account:email?action=read', 'repo:app.bsky.feed.post'];
 * const scope = buildScope(permissions);
 * // Returns: "account:email?action=read repo:app.bsky.feed.post"
 * ```
 */
export function buildScope(permissions: string[]): string {
  return permissions.join(" ");
}

/**
 * Pre-built scope presets for common use cases.
 *
 * These presets provide ready-to-use permission sets for typical application scenarios.
 */
export const ScopePresets = {
  /**
   * Email access scope - allows reading user's email address.
   *
   * Includes:
   * - account:email?action=read
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.EMAIL_READ;
   * // Use in OAuth flow to request email access
   * ```
   */
  EMAIL_READ: buildScope(new PermissionBuilder().accountEmail("read").build()),

  /**
   * Profile read scope - allows reading user's profile.
   *
   * Includes:
   * - repo:app.bsky.actor.profile (read-only)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.PROFILE_READ;
   * ```
   */
  PROFILE_READ: buildScope(new PermissionBuilder().repoRead("app.bsky.actor.profile").build()),

  /**
   * Profile write scope - allows updating user's profile.
   *
   * Includes:
   * - repo:app.bsky.actor.profile (create + update)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.PROFILE_WRITE;
   * ```
   */
  PROFILE_WRITE: buildScope(new PermissionBuilder().repoWrite("app.bsky.actor.profile").build()),

  /**
   * Post creation scope - allows creating and updating posts.
   *
   * Includes:
   * - repo:app.bsky.feed.post (create + update)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.POST_WRITE;
   * ```
   */
  POST_WRITE: buildScope(new PermissionBuilder().repoWrite("app.bsky.feed.post").build()),

  /**
   * Social interactions scope - allows liking, reposting, and following.
   *
   * Includes:
   * - repo:app.bsky.feed.like (create + update)
   * - repo:app.bsky.feed.repost (create + update)
   * - repo:app.bsky.graph.follow (create + update)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.SOCIAL_WRITE;
   * ```
   */
  SOCIAL_WRITE: buildScope(
    new PermissionBuilder()
      .repoWrite("app.bsky.feed.like")
      .repoWrite("app.bsky.feed.repost")
      .repoWrite("app.bsky.graph.follow")
      .build(),
  ),

  /**
   * Media upload scope - allows uploading images and videos.
   *
   * Includes:
   * - blob permissions for image/* and video/*
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.MEDIA_UPLOAD;
   * ```
   */
  MEDIA_UPLOAD: buildScope(new PermissionBuilder().blob(["image/*", "video/*"]).build()),

  /**
   * Image upload only scope - allows uploading images.
   *
   * Includes:
   * - blob:image/*
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.IMAGE_UPLOAD;
   * ```
   */
  IMAGE_UPLOAD: buildScope(new PermissionBuilder().blob("image/*").build()),

  /**
   * Posting app scope - full posting capabilities including media.
   *
   * Includes:
   * - repo:app.bsky.feed.post (create + update)
   * - repo:app.bsky.feed.like (create + update)
   * - repo:app.bsky.feed.repost (create + update)
   * - blob permissions for image/* and video/*
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.POSTING_APP;
   * ```
   */
  POSTING_APP: buildScope(
    new PermissionBuilder()
      .repoWrite("app.bsky.feed.post")
      .repoWrite("app.bsky.feed.like")
      .repoWrite("app.bsky.feed.repost")
      .blob(["image/*", "video/*"])
      .build(),
  ),

  /**
   * Read-only app scope - allows reading all repository data.
   *
   * Includes:
   * - repo:* (read-only, no actions)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.READ_ONLY;
   * ```
   */
  READ_ONLY: buildScope(new PermissionBuilder().repoRead("*").build()),

  /**
   * Full access scope - allows all repository operations.
   *
   * Includes:
   * - repo:* (create + update + delete)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.FULL_ACCESS;
   * ```
   */
  FULL_ACCESS: buildScope(new PermissionBuilder().repoFull("*").build()),

  /**
   * Email + Profile scope - common combination for user identification.
   *
   * Includes:
   * - account:email?action=read
   * - repo:app.bsky.actor.profile (read-only)
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.EMAIL_AND_PROFILE;
   * ```
   */
  EMAIL_AND_PROFILE: buildScope(
    new PermissionBuilder().accountEmail("read").repoRead("app.bsky.actor.profile").build(),
  ),

  /**
   * Transitional email scope (legacy).
   *
   * Uses the transitional scope format for backward compatibility.
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.TRANSITION_EMAIL;
   * ```
   */
  TRANSITION_EMAIL: buildScope(new PermissionBuilder().transition("email").build()),

  /**
   * Transitional generic scope (legacy).
   *
   * Uses the transitional scope format for backward compatibility.
   *
   * @example
   * ```typescript
   * const scope = ScopePresets.TRANSITION_GENERIC;
   * ```
   */
  TRANSITION_GENERIC: buildScope(new PermissionBuilder().transition("generic").build()),
} as const;

/**
 * Parse a scope string into an array of individual permissions.
 *
 * This splits a space-separated scope string into individual permission strings.
 *
 * @param scope - Space-separated scope string
 * @returns Array of permission strings
 *
 * @example
 * ```typescript
 * const scope = "account:email?action=read repo:app.bsky.feed.post";
 * const permissions = parseScope(scope);
 * // Returns: ['account:email?action=read', 'repo:app.bsky.feed.post']
 * ```
 */
export function parseScope(scope: string): string[] {
  return scope.trim().split(/\s+/).filter(Boolean);
}

/**
 * Helper function to match MIME type patterns with wildcard support.
 *
 * Implements MIME type matching for blob permissions per ATProto spec.
 *
 * **Reference:**
 * - ATProto Permission Spec: https://atproto.com/specs/permission
 *   Supports "MIME types or partial MIME type glob patterns"
 *
 * **Supported patterns:**
 * - Exact matches: "image/png" matches "image/png"
 * - Type wildcards: "image/*" matches "image/png", "image/jpeg", etc.
 * - Full wildcards: `*` `/` `*` matches any MIME type
 *
 * @param pattern - The MIME type pattern (may contain wildcards)
 * @param mimeType - The actual MIME type to check
 * @returns True if the MIME type matches the pattern
 *
 * @example
 * ```typescript
 * matchMimePattern("image/*", "image/png"); // true
 * matchMimePattern("*" + "/" + "*", "video/mp4"); // true - matches any MIME
 * matchMimePattern("image/*", "video/mp4"); // false
 * ```
 */
function matchMimePattern(pattern: string, mimeType: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern === mimeType) return true;

  const [patternType, patternSubtype] = pattern.split("/");
  const [mimeTypeType, mimeTypeSubtype] = mimeType.split("/");

  if (patternSubtype === "*" && patternType === mimeTypeType) {
    return true;
  }

  return false;
}

/**
 * Check if a scope string contains a specific permission.
 *
 * Implements permission matching per ATProto OAuth spec with support for
 * exact matching and limited wildcard patterns.
 *
 * **References:**
 * - ATProto Permission Spec: https://atproto.com/specs/permission
 * - ATProto OAuth Spec: https://atproto.com/specs/oauth
 *
 * **Supported wildcards (per spec):**
 * - `repo:*` - Matches any repository collection (e.g., `repo:app.bsky.feed.post`)
 * - `rpc:*` - Matches any RPC lexicon (but aud cannot also be wildcard)
 * - `blob:image/*` - MIME type wildcards (e.g., matches `blob:image/png`, `blob:image/jpeg`)
 * - `blob:` + wildcard MIME - Matches any MIME type (using `*` + `/` + `*` pattern)
 * - `identity:*` - Full control of DID document and handle (spec allows `*` as attr value)
 *
 * **NOT supported (per spec):**
 * - `account:*` - Account attr does not support wildcards (only `email` and `repo` allowed)
 * - `include:*` - Include NSID does not support wildcards
 * - Partial wildcards like `com.example.*` are not supported
 *
 * @param scope - Space-separated scope string
 * @param permission - The permission to check for
 * @returns True if the scope contains the permission
 *
 * @example Exact matching
 * ```typescript
 * const scope = "account:email repo:app.bsky.feed.post";
 * hasPermission(scope, "account:email"); // true
 * hasPermission(scope, "account:repo"); // false
 * ```
 *
 * @example Wildcard matching
 * ```typescript
 * const scope = "repo:* blob:image/* identity:*";
 * hasPermission(scope, "repo:app.bsky.feed.post"); // true
 * hasPermission(scope, "blob:image/png"); // true
 * hasPermission(scope, "blob:video/mp4"); // false
 * hasPermission(scope, "identity:handle"); // true
 * ```
 */
export function hasPermission(scope: string, permission: string): boolean {
  const permissions = parseScope(scope);

  // 1. Check exact match first
  if (permissions.includes(permission)) {
    return true;
  }

  // 2. Check wildcard matches (only those supported by ATProto spec)
  for (const scopePermission of permissions) {
    // repo:* - Wildcard for repository collections
    // Spec: "Wildcard (*) is allowed in scope string syntax"
    if (scopePermission.startsWith("repo:*") && permission.startsWith("repo:")) {
      return true;
    }

    // rpc:* - Wildcard for RPC lexicons
    // Spec: "Wildcard (*) is allowed in scope string syntax for lxm parameter"
    if (scopePermission.startsWith("rpc:*") && permission.startsWith("rpc:")) {
      return true;
    }

    // blob MIME wildcards - image/*, video/*, or full wildcard
    // Spec: "MIME types or partial MIME type glob patterns"
    if (scopePermission.startsWith("blob:") && permission.startsWith("blob:")) {
      const scopeMime = scopePermission.substring(5).split("?")[0]; // Remove "blob:" prefix and query params
      const permMime = permission.substring(5).split("?")[0];

      if (matchMimePattern(scopeMime, permMime)) {
        return true;
      }
    }

    // identity:* - Full control of DID document and handle
    // Spec: "* - Full control of DID document and handle" (as attr value)
    if (scopePermission === "identity:*" && permission.startsWith("identity:")) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a scope string contains all of the specified permissions.
 *
 * @param scope - Space-separated scope string
 * @param requiredPermissions - Array of permissions to check for
 * @returns True if the scope contains all required permissions
 *
 * @example
 * ```typescript
 * const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";
 * hasAllPermissions(scope, ["account:email?action=read", "blob:image/*"]); // true
 * hasAllPermissions(scope, ["account:email?action=read", "account:repo"]); // false
 * ```
 */
export function hasAllPermissions(scope: string, requiredPermissions: string[]): boolean {
  const permissions = parseScope(scope);
  return requiredPermissions.every((required) => permissions.includes(required));
}

/**
 * Check if a scope string contains any of the specified permissions.
 *
 * @param scope - Space-separated scope string
 * @param checkPermissions - Array of permissions to check for
 * @returns True if the scope contains at least one of the permissions
 *
 * @example
 * ```typescript
 * const scope = "account:email?action=read repo:app.bsky.feed.post";
 * hasAnyPermission(scope, ["account:email?action=read", "account:repo"]); // true
 * hasAnyPermission(scope, ["account:repo", "identity:handle"]); // false
 * ```
 */
export function hasAnyPermission(scope: string, checkPermissions: string[]): boolean {
  const permissions = parseScope(scope);
  return checkPermissions.some((check) => permissions.includes(check));
}

/**
 * Merge multiple scope strings into a single scope string with deduplicated permissions.
 *
 * @param scopes - Array of scope strings to merge
 * @returns Merged scope string with unique permissions
 *
 * @example
 * ```typescript
 * const scope1 = "account:email?action=read repo:app.bsky.feed.post";
 * const scope2 = "repo:app.bsky.feed.post blob:image/*";
 * const merged = mergeScopes([scope1, scope2]);
 * // Returns: "account:email?action=read repo:app.bsky.feed.post blob:image/*"
 * ```
 */
export function mergeScopes(scopes: string[]): string {
  const allPermissions = scopes.flatMap(parseScope);
  const uniquePermissions = [...new Set(allPermissions)];
  return buildScope(uniquePermissions);
}

/**
 * Remove specific permissions from a scope string.
 *
 * @param scope - Space-separated scope string
 * @param permissionsToRemove - Array of permissions to remove
 * @returns New scope string without the specified permissions
 *
 * @example
 * ```typescript
 * const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";
 * const filtered = removePermissions(scope, ["blob:image/*"]);
 * // Returns: "account:email?action=read repo:app.bsky.feed.post"
 * ```
 */
export function removePermissions(scope: string, permissionsToRemove: string[]): string {
  const permissions = parseScope(scope);
  const filtered = permissions.filter((p) => !permissionsToRemove.includes(p));
  return buildScope(filtered);
}

/**
 * Validate that all permissions in a scope string are well-formed.
 *
 * This checks that each permission matches expected patterns for transitional
 * or granular permissions. It does NOT validate against the full Zod schemas.
 *
 * @param scope - Space-separated scope string
 * @returns Object with isValid flag and array of invalid permissions
 *
 * @example
 * ```typescript
 * const scope = "account:email?action=read invalid:permission";
 * const result = validateScope(scope);
 * // Returns: { isValid: false, invalidPermissions: ['invalid:permission'] }
 * ```
 */
export function validateScope(scope: string): {
  isValid: boolean;
  invalidPermissions: string[];
} {
  const permissions = parseScope(scope);
  const invalidPermissions: string[] = [];

  // Pattern for valid permission prefixes
  const validPrefixes = /^(atproto|transition:|account:|repo:|blob:?|rpc:|identity:|include:)/;

  for (const permission of permissions) {
    if (!validPrefixes.test(permission)) {
      invalidPermissions.push(permission);
    }
  }

  return {
    isValid: invalidPermissions.length === 0,
    invalidPermissions,
  };
}
