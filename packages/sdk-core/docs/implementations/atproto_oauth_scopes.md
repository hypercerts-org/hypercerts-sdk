# Plan: OAuth Scopes and Granular Permissions Support

## Overview
Expand the OAuth client to support both transitional scopes (for legacy compatibility) and the new granular permissions model from the atproto specification, with improved type safety using Zod 3 for validation, parsing, and type inference.

## Current State

### Scope Implementation
- Scopes are simple space-separated strings (e.g., "atproto transition:generic")
- Defined in `config.oauth.scope` with per-request overrides via `AuthorizeOptions`
- No type safety or constants for known scopes
- No support for granular permissions model
- Minimal documentation about available scopes

### atproto Permission Models

According to [atproto OAuth](https://atproto.com/specs/oauth) and
[atproto Permission](https://atproto.com/specs/permission):

**Base Scope:**
- `atproto` - Mandatory for all sessions

**Transitional Scopes (Legacy):**
- `transition:generic` - Broad PDS permissions (records, blobs, preferences)
- `transition:chat.bsky` - Direct Messages (requires transition:generic)
- `transition:email` - Email address and confirmation status

**Granular Permissions (New Model):**
- `repo` - Write access to repository records (e.g., `repo:app.bsky.feed.post?action=create`)
- `rpc` - Authenticated API calls (e.g., `rpc:com.atproto.repo.createRecord?aud=*`)
- `blob` - Media file uploads (e.g., `blob:image/*`)
- `account` - Account management (e.g., `account:email`, `account:repo?action=manage`)
- `identity` - DID/handle control (e.g., `identity:handle`)
- `include` - Permission sets bundling multiple permissions (e.g., `include:com.example.authBasicFeatures`)

## Proposed Approach: Zod-Powered Type Safety

### 1. Create Zod-Based Permission System

**New File: `/packages/sdk-core/src/auth/permissions.ts`**

Use Zod 3 for schema validation, type inference, and runtime parsing:

```typescript
import { z } from "zod";

/**
 * Base OAuth scope - required for all sessions
 */
export const ATPROTO_SCOPE = 'atproto' as const;

/**
 * Transitional OAuth scopes (legacy)
 */
export const TRANSITION_SCOPES = {
  GENERIC: 'transition:generic',
  CHAT: 'transition:chat.bsky',
  EMAIL: 'transition:email',
} as const;

/**
 * Zod schema for transitional scopes
 */
export const TransitionScopeSchema = z.enum([
  'transition:generic',
  'transition:chat.bsky',
  'transition:email',
]).describe('Legacy transitional OAuth scopes');

export type TransitionScope = z.infer<typeof TransitionScopeSchema>;

/**
 * Zod schema for account permission attributes
 */
export const AccountAttrSchema = z.enum(['email', 'repo']);
export type AccountAttr = z.infer<typeof AccountAttrSchema>;

/**
 * Zod schema for account actions
 */
export const AccountActionSchema = z.enum(['read', 'manage']);
export type AccountAction = z.infer<typeof AccountActionSchema>;

/**
 * Zod schema for repository actions
 */
export const RepoActionSchema = z.enum(['create', 'update', 'delete']);
export type RepoAction = z.infer<typeof RepoActionSchema>;

/**
 * Zod schema for identity attributes
 */
export const IdentityAttrSchema = z.enum(['handle', '*']);
export type IdentityAttr = z.infer<typeof IdentityAttrSchema>;

/**
 * Zod schema for MIME type patterns
 */
export const MimeTypeSchema = z.string().regex(
  /^[a-z]+\/[a-z*]+$/i,
  'Invalid MIME type pattern'
);

/**
 * Zod schema for NSID (Namespaced Identifier)
 */
export const NsidSchema = z.string().regex(
  /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/,
  'Invalid NSID format'
);

/**
 * Zod schema for account permission
 */
export const AccountPermissionSchema = z.object({
  type: z.literal('account'),
  attr: AccountAttrSchema,
  action: AccountActionSchema.optional(),
}).transform(({ attr, action }) => {
  let perm = `account:${attr}`;
  if (action) {
    perm += `?action=${action}`;
  }
  return perm;
});

export type AccountPermissionInput = z.input<typeof AccountPermissionSchema>;

/**
 * Zod schema for repository permission
 */
export const RepoPermissionSchema = z.object({
  type: z.literal('repo'),
  collection: NsidSchema.or(z.literal('*')),
  actions: z.array(RepoActionSchema).optional(),
}).transform(({ collection, actions }) => {
  let perm = `repo:${collection}`;
  if (actions && actions.length > 0) {
    const params = actions.map(a => `action=${a}`).join('&');
    perm += `?${params}`;
  }
  return perm;
});

export type RepoPermissionInput = z.input<typeof RepoPermissionSchema>;

/**
 * Zod schema for blob permission
 */
export const BlobPermissionSchema = z.object({
  type: z.literal('blob'),
  mimeTypes: z.array(MimeTypeSchema).min(1, 'At least one MIME type required'),
}).transform(({ mimeTypes }) => {
  if (mimeTypes.length === 1) {
    return `blob:${mimeTypes[0]}`;
  }
  const accepts = mimeTypes.map(t => `accept=${encodeURIComponent(t)}`).join('&');
  return `blob?${accepts}`;
});

export type BlobPermissionInput = z.input<typeof BlobPermissionSchema>;

/**
 * Zod schema for RPC permission
 */
export const RpcPermissionSchema = z.object({
  type: z.literal('rpc'),
  lexicon: NsidSchema.or(z.literal('*')),
  aud: z.string().min(1, 'Audience is required'),
  inheritAud: z.boolean().optional(),
}).refine(
  ({ lexicon, aud }) => lexicon !== '*' || aud !== '*',
  'At least one of lexicon or aud must be restricted (wildcards cannot both be used)'
).transform(({ lexicon, aud, inheritAud }) => {
  let perm = `rpc:${lexicon}?aud=${encodeURIComponent(aud)}`;
  if (inheritAud) {
    perm += '&inheritAud=true';
  }
  return perm;
});

export type RpcPermissionInput = z.input<typeof RpcPermissionSchema>;

/**
 * Zod schema for identity permission
 */
export const IdentityPermissionSchema = z.object({
  type: z.literal('identity'),
  attr: IdentityAttrSchema,
}).transform(({ attr }) => `identity:${attr}`);

export type IdentityPermissionInput = z.input<typeof IdentityPermissionSchema>;

/**
 * Zod schema for permission set inclusion
 */
export const IncludePermissionSchema = z.object({
  type: z.literal('include'),
  nsid: NsidSchema,
  aud: z.string().optional(),
}).transform(({ nsid, aud }) => {
  let perm = `include:${nsid}`;
  if (aud) {
    perm += `?aud=${encodeURIComponent(aud)}`;
  }
  return perm;
});

export type IncludePermissionInput = z.input<typeof IncludePermissionSchema>;

/**
 * Union schema for all permission types
 */
export const PermissionSchema = z.union([
  AccountPermissionSchema,
  RepoPermissionSchema,
  BlobPermissionSchema,
  RpcPermissionSchema,
  IdentityPermissionSchema,
  IncludePermissionSchema,
]);

export type PermissionInput = z.input<typeof PermissionSchema>;
export type Permission = z.output<typeof PermissionSchema>;

/**
 * Type-safe permission builder with Zod validation
 */
export const permission = {
  /**
   * Build account permission
   * @example permission.account({ attr: 'email' })
   * @example permission.account({ attr: 'email', action: 'manage' })
   */
  account(input: Omit<AccountPermissionInput, 'type'>): string {
    return AccountPermissionSchema.parse({ type: 'account', ...input });
  },

  /**
   * Build repository permission
   * @example permission.repo({ collection: 'app.bsky.feed.post' })
   * @example permission.repo({ collection: 'app.bsky.feed.post', actions: ['create', 'update'] })
   */
  repo(input: Omit<RepoPermissionInput, 'type'>): string {
    return RepoPermissionSchema.parse({ type: 'repo', ...input });
  },

  /**
   * Build blob permission
   * @example permission.blob({ mimeTypes: ['image/*', 'video/*'] })
   */
  blob(input: Omit<BlobPermissionInput, 'type'>): string {
    return BlobPermissionSchema.parse({ type: 'blob', ...input });
  },

  /**
   * Build RPC permission
   * @example permission.rpc({ lexicon: 'com.atproto.repo.createRecord', aud: '*' })
   */
  rpc(input: Omit<RpcPermissionInput, 'type'>): string {
    return RpcPermissionSchema.parse({ type: 'rpc', ...input });
  },

  /**
   * Build identity permission
   * @example permission.identity({ attr: 'handle' })
   */
  identity(input: Omit<IdentityPermissionInput, 'type'>): string {
    return IdentityPermissionSchema.parse({ type: 'identity', ...input });
  },

  /**
   * Include permission set
   * @example permission.include({ nsid: 'com.example.authBasicFeatures' })
   */
  include(input: Omit<IncludePermissionInput, 'type'>): string {
    return IncludePermissionSchema.parse({ type: 'include', ...input });
  },
};

/**
 * Zod schema for OAuth scope string
 * Validates that atproto scope is always included
 */
export const ScopeStringSchema = z.string()
  .min(1, 'Scope string cannot be empty')
  .refine(
    (scope) => scope.split(' ').includes('atproto'),
    'Scope must include the base "atproto" scope'
  );

/**
 * Helper to combine scopes and permissions into a valid OAuth scope string
 * Automatically includes the required 'atproto' scope and validates the result
 */
export function buildScope(...scopes: string[]): string {
  const scopeSet = new Set(scopes);
  scopeSet.add(ATPROTO_SCOPE);
  const scopeString = Array.from(scopeSet).join(' ');
  return ScopeStringSchema.parse(scopeString);
}

/**
 * Parse a scope string into individual scopes
 * Returns validation result with detailed errors
 */
export function parseScope(scopeString: string) {
  return ScopeStringSchema.safeParse(scopeString);
}

/**
 * Validate if a scope string contains a specific permission
 */
export function hasPermission(scopeString: string, permission: string): boolean {
  const scopes = scopeString.split(' ');
  return scopes.includes(permission);
}

/**
 * Preset scope combinations for common use cases
 */
export const SCOPE_PRESETS = {
  /** Read-only access - just the base atproto scope */
  READ_ONLY: buildScope(),
  
  /** Full access using transitional scope (legacy) */
  FULL_ACCESS_LEGACY: buildScope(TRANSITION_SCOPES.GENERIC),
  
  /** Email access using transitional scope (legacy) */
  WITH_EMAIL_LEGACY: buildScope(TRANSITION_SCOPES.GENERIC, TRANSITION_SCOPES.EMAIL),
  
  /** Chat access using transitional scope (legacy) */
  WITH_CHAT_LEGACY: buildScope(TRANSITION_SCOPES.GENERIC, TRANSITION_SCOPES.CHAT),
  
  /** Email access using granular permissions (recommended) */
  WITH_EMAIL: buildScope(permission.account({ attr: 'email' })),
  
  /** Email management using granular permissions */
  MANAGE_EMAIL: buildScope(permission.account({ attr: 'email', action: 'manage' })),
  
  /** Handle management using granular permissions */
  MANAGE_HANDLE: buildScope(permission.identity({ attr: 'handle' })),
} as const;

/**
 * Legacy exports for backwards compatibility
 * @deprecated Use TRANSITION_SCOPES and permission builder instead
 */
export const SCOPES = {
  ATPROTO: ATPROTO_SCOPE,
  TRANSITION_GENERIC: TRANSITION_SCOPES.GENERIC,
  TRANSITION_CHAT: TRANSITION_SCOPES.CHAT,
  TRANSITION_EMAIL: TRANSITION_SCOPES.EMAIL,
} as const;

export type KnownScope = typeof SCOPES[keyof typeof SCOPES];
```

### 2. Update Configuration Schema

**File: `/packages/sdk-core/src/core/config.ts`**

Import and use the permission schemas:
```typescript
import { ScopeStringSchema } from '../auth/permissions.js';

export const OAuthConfigSchema = z.object({
  clientId: z.string().url(),
  redirectUri: z.string().url(),
  
  /**
   * OAuth scopes to request, space-separated.
   * 
   * Supports both transitional scopes (legacy) and granular permissions (recommended).
   * Must include the base "atproto" scope.
   * 
   * **Transitional Scopes (Legacy):**
   * - "atproto" - Required base scope
   * - "transition:generic" - Full PDS access
   * - "transition:email" - User email access
   * - "transition:chat.bsky" - Direct messages
   * 
   * **Granular Permissions (Recommended):**
   * - "account:email" - Read email address
   * - "account:repo?action=manage" - Manage repository
   * - "repo:app.bsky.feed.post?action=create" - Create posts
   * - "identity:handle" - Manage handle
   * - "blob:image/*" - Upload images
   * 
   * @example Transitional scopes
   * "atproto transition:generic transition:email"
   * 
   * @example Granular permissions
   * "atproto account:email repo:app.bsky.feed.post?action=create"
   * 
   * @see Use SCOPE_PRESETS or permission builder from auth/permissions.ts for type safety
   */
  scope: ScopeStringSchema,
  
  jwksUri: z.string().url(),
  jwkPrivate: z.string(),
});
```

### 3. Update AuthorizeOptions

**Files: `/packages/sdk-core/src/auth/OAuthClient.ts` and `/packages/sdk-core/src/core/SDK.ts`**

Add Zod validation to AuthorizeOptions:
```typescript
import { ScopeStringSchema } from './permissions.js';

/**
 * Zod schema for authorize options
 */
export const AuthorizeOptionsSchema = z.object({
  scope: ScopeStringSchema.optional(),
}).optional();

export type AuthorizeOptions = z.infer<typeof AuthorizeOptionsSchema>;

// In authorize method:
async authorize(identifier: string, options?: AuthorizeOptions): Promise<string> {
  // Validate options if provided
  const validatedOptions = AuthorizeOptionsSchema.parse(options);
  
  const client = await this.getClient();
  const scope = validatedOptions?.scope ?? this.config.oauth.scope;
  const authUrl = await client.authorize(identifier, { scope });
  
  return typeof authUrl === "string" ? authUrl : authUrl.toString();
}
```

### 4. Add Email Access Helper

**New method in SDK class: `/packages/sdk-core/src/core/SDK.ts`**

```typescript
/**
 * Retrieves the account email address for an authenticated session.
 * 
 * Requires the `transition:email` scope (legacy) or `account:email` permission (recommended).
 * 
 * @param session - An authenticated OAuth session
 * @returns Promise resolving to email info, or null if scope not granted
 * @throws {@link NetworkError} if the request fails
 * @throws {@link ValidationError} if the session is invalid
 * 
 * @example
 * ```typescript
 * const session = await sdk.callback(params);
 * const emailInfo = await sdk.getAccountEmail(session);
 * if (emailInfo) {
 *   console.log(`Email: ${emailInfo.email}, Confirmed: ${emailInfo.emailConfirmed}`);
 * }
 * ```
 */
async getAccountEmail(session: Session): Promise<{ email: string; emailConfirmed: boolean } | null> {
  if (!session) {
    throw new ValidationError('Session is required');
  }
  
  // Call com.atproto.server.getSession endpoint
  // Parse email and emailConfirmed from response
  // Return null if email permission not granted or email not available
}
```

### 5. Client Metadata Validation

**File: `/packages/sdk-core/src/auth/OAuthClient.ts`**

Enhanced validation using Zod:
```typescript
import { parseScope, hasPermission } from './permissions.js';

private validateClientMetadataScope(scope: string): void {
  // Validate scope string format
  const result = parseScope(scope);
  if (!result.success) {
    this.logger?.error('Invalid scope string', { 
      scope, 
      errors: result.error.errors 
    });
    return;
  }
  
  const scopes = scope.split(' ');
  
  // Check for legacy transitional scopes
  const hasTransitionScopes = scopes.some(s => s.startsWith('transition:'));
  const hasGranularPerms = scopes.some(s => 
    ['repo:', 'rpc:', 'blob:', 'account:', 'identity:', 'include:'].some(prefix => s.startsWith(prefix))
  );
  
  if (hasTransitionScopes && hasGranularPerms) {
    this.logger?.warn(
      'Mixing transitional scopes and granular permissions',
      { 
        scope,
        note: 'Consider migrating to granular permissions for better control'
      }
    );
  } else if (hasTransitionScopes) {
    this.logger?.info(
      'Using transitional scopes (legacy)',
      { 
        scope,
        note: 'Consider migrating to granular permissions (account:email, repo:*, etc.) for fine-grained control'
      }
    );
  }
  
  // Info log about scope declaration requirement
  this.logger?.info(
    'Client metadata scope declaration',
    { 
      scope,
      note: 'All scopes that might be requested must be declared in client metadata published at clientId URL'
    }
  );
}
```

### 6. Update Documentation

**File: `/packages/sdk-core/README.md`**

Add comprehensive documentation with Zod examples:
```markdown
## OAuth Scopes and Permissions

The SDK provides a type-safe, Zod-powered permission system supporting both **transitional scopes** (legacy) and **granular permissions** (recommended).

### Granular Permissions (Recommended)

#### Using the Zod-Validated Permission Builder

```typescript
import { createATProtoSDK, buildScope, permission } from '@hypercerts-org/sdk';

const sdk = createATProtoSDK({
  oauth: {
    clientId: "https://your-app.com/client-metadata.json",
    redirectUri: "https://your-app.com/callback",
    // buildScope validates with Zod and ensures 'atproto' is included
    scope: buildScope(
      permission.account({ attr: 'email' }),                          // account:email
      permission.repo({ collection: 'app.bsky.feed.post',             // repo:app.bsky.feed.post?action=create
                        actions: ['create'] }),
      permission.blob({ mimeTypes: ['image/*', 'video/*'] })          // blob?accept=image/*&accept=video/*
    ),
    jwksUri: "https://your-app.com/jwks.json",
    jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
  },
});
```

#### Type-Safe Permission Examples

All permission methods validate input with Zod schemas and provide compile-time type safety:

```typescript
import { permission } from '@hypercerts-org/sdk';

// Email access (validated: attr must be 'email' or 'repo')
permission.account({ attr: 'email' })

// Email management (validated: action must be 'read' or 'manage')
permission.account({ attr: 'email', action: 'manage' })

// Create posts (validated: collection must be valid NSID, actions must be valid)
permission.repo({ 
  collection: 'app.bsky.feed.post', 
  actions: ['create', 'update'] 
})

// Upload images (validated: mimeTypes must match MIME pattern)
permission.blob({ mimeTypes: ['image/*'] })

// RPC calls (validated: lexicon must be valid NSID, aud required)
permission.rpc({ 
  lexicon: 'com.atproto.repo.createRecord', 
  aud: '*' 
})

// Handle management (validated: attr must be 'handle' or '*')
permission.identity({ attr: 'handle' })

// Include permission set (validated: nsid must be valid NSID format)
permission.include({ nsid: 'com.example.authBasicFeatures' })
```

#### Validation Errors

Zod provides detailed validation errors:

```typescript
try {
  // Invalid: MIME type doesn't match pattern
  permission.blob({ mimeTypes: ['invalid'] });
} catch (error) {
  console.error(error.issues); // Detailed Zod validation errors
}

try {
  // Invalid: both lexicon and aud are wildcards
  permission.rpc({ lexicon: '*', aud: '*' });
} catch (error) {
  console.error(error.message); 
  // "At least one of lexicon or aud must be restricted"
}
```

### Scope String Validation

```typescript
import { parseScope, hasPermission } from '@hypercerts-org/sdk';

// Validate a scope string
const result = parseScope('atproto account:email');
if (result.success) {
  console.log('Valid scope:', result.data);
} else {
  console.error('Invalid scope:', result.error.errors);
}

// Check if scope string has a specific permission
const hasEmail = hasPermission('atproto account:email', 'account:email');
// true
```

### Transitional Scopes (Legacy)

#### Using Scope Presets (Legacy)

```typescript
import { createATProtoSDK, SCOPE_PRESETS } from '@hypercerts-org/sdk';

const sdk = createATProtoSDK({
  oauth: {
    scope: SCOPE_PRESETS.WITH_EMAIL_LEGACY, // Validated: "atproto transition:generic transition:email"
    // ... other config
  },
});
```

### Client Metadata Requirements

Your client metadata document is now validated during SDK initialization:

```json
{
  "client_id": "https://your-app.com/client-metadata.json",
  "scope": "atproto account:email repo:app.bsky.feed.post?action=create",
  "redirect_uris": ["https://your-app.com/callback"]
}
```

Validation errors will be logged if:
- `atproto` scope is missing
- Scope format is invalid
- Mixing transitional and granular permissions
```

### 7. Update Package Exports

**File: `/packages/sdk-core/src/index.ts`**

```typescript
export { 
  // Core permission system
  ATPROTO_SCOPE,
  TRANSITION_SCOPES,
  SCOPE_PRESETS,
  buildScope,
  permission,
  parseScope,
  hasPermission,
  
  // Zod schemas for validation
  TransitionScopeSchema,
  AccountAttrSchema,
  AccountActionSchema,
  RepoActionSchema,
  IdentityAttrSchema,
  MimeTypeSchema,
  NsidSchema,
  ScopeStringSchema,
  PermissionSchema,
  AccountPermissionSchema,
  RepoPermissionSchema,
  BlobPermissionSchema,
  RpcPermissionSchema,
  IdentityPermissionSchema,
  IncludePermissionSchema,
  
  // Types
  type TransitionScope,
  type AccountAttr,
  type AccountAction,
  type RepoAction,
  type IdentityAttr,
  type Permission,
  type PermissionInput,
  type AccountPermissionInput,
  type RepoPermissionInput,
  type BlobPermissionInput,
  type RpcPermissionInput,
  type IdentityPermissionInput,
  type IncludePermissionInput,
  
  // Legacy exports
  SCOPES,
  type KnownScope,
} from './auth/permissions.js';
```

## Implementation Steps

1. Create `/packages/sdk-core/src/auth/permissions.ts` with:
   - Zod schemas for all permission types
   - Type-safe permission builder with validation
   - Scope parsing and validation utilities
   - Preset scope combinations
2. Update `OAuthConfigSchema` in `config.ts` to use `ScopeStringSchema`
3. Add `AuthorizeOptionsSchema` to `OAuthClient.ts` and `SDK.ts`
4. Update `validateClientMetadataScope()` in `OAuthClient.ts` to use Zod parsing
5. Add `getAccountEmail()` method to `SDK.ts` with Zod validation
6. Update README.md with Zod-powered examples
7. Export all schemas, types, and utilities from `index.ts`
8. Add comprehensive tests in `/packages/sdk-core/tests/auth/permissions.test.ts`:
   - Test each permission schema
   - Test validation errors
   - Test buildScope and parseScope
   - Test hasPermission utility
   - Test preset scopes
9. Add tests for `getAccountEmail()` in `/packages/sdk-core/tests/core/SDK.test.ts`

## Critical Files

- **New**: `/packages/sdk-core/src/auth/permissions.ts` - Zod-based permission system
- **Modify**: `/packages/sdk-core/src/core/config.ts`:
  - Import ScopeStringSchema
  - L27-30: Use ScopeStringSchema for scope validation
- **Modify**: `/packages/sdk-core/src/auth/OAuthClient.ts`:
  - Import schemas and utilities
  - L13-19: Add AuthorizeOptionsSchema
  - L285-306: Validate options in authorize()
  - L180-196: Enhanced validateClientMetadataScope() with Zod parsing
- **Modify**: `/packages/sdk-core/src/core/SDK.ts`:
  - Import schemas and utilities
  - L15-29: Add AuthorizeOptionsSchema
  - L169-190: Validate options in authorize()
  - Add getAccountEmail() method with validation
- **Modify**: `/packages/sdk-core/src/index.ts` (add all exports)
- **Modify**: `/packages/sdk-core/README.md` (Zod-powered documentation)
- **New**: `/packages/sdk-core/tests/auth/permissions.test.ts` - Comprehensive permission tests
- **Modify**: `/packages/sdk-core/tests/core/SDK.test.ts` - Add getAccountEmail() tests

## Design Decisions

1. **Zod for Everything**: Use Zod schemas for validation, type inference, and transformation throughout the permission system

2. **Schema-Driven Design**: Each permission type has its own Zod schema that validates input and transforms to the correct string format

3. **Runtime Safety**: Zod provides runtime validation ensuring invalid permissions are caught immediately with detailed error messages

4. **Type Inference**: All TypeScript types are inferred from Zod schemas, ensuring perfect sync between runtime and compile-time types

5. **Transform Power**: Use Zod's `transform()` to convert structured input into permission strings automatically

6. **Validation at Boundaries**: Validate at SDK configuration, authorize calls, and permission building to catch errors early

7. **Developer Experience**: Permission builder provides IntelliSense, type checking, and validation errors with suggestions

## Zod 3 Features Leveraged

1. **Schema Composition**: Complex permission schemas built from smaller, reusable schemas
2. **Transform**: Convert structured input to permission strings
3. **Refinement**: Custom validation rules (e.g., RPC wildcard restriction)
4. **Error Messages**: Custom error messages for better DX
5. **Type Inference**: Perfect TypeScript types inferred from schemas
6. **Safe Parse**: `safeParse()` for validation without throwing
7. **Enums**: Type-safe enums for actions, attributes, etc.

## Backwards Compatibility

All changes are backwards compatible:
- Existing string scopes continue to work
- Legacy `SCOPES` export maintained
- New Zod schemas are optional for consumers
- SDK validates internally but accepts string inputs
- Migration path is opt-in via permission builder
