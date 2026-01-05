---
"@hypercerts-org/sdk-core": minor
---

feat(auth): add OAuth scopes and granular permissions system

Add comprehensive OAuth permissions system with support for granular permissions and easy email access:

**Permission System**

- Zod schemas for all ATProto permission types (account, repo, blob, rpc, identity, include)
- Support for both transitional (legacy) and granular permission models
- Type-safe permission builder with fluent API
- 14 pre-built scope presets (EMAIL_READ, POSTING_APP, FULL_ACCESS, etc.)
- 8 utility functions for working with scopes

**Email Access**

- New `getAccountEmail()` method to retrieve user email from authenticated session
- Returns null when permission not granted
- Comprehensive error handling

**Enhanced OAuth Integration**

- Automatic scope validation with helpful warnings
- Migration suggestions from transitional to granular permissions
- Improved documentation with comprehensive examples

**Breaking Changes**: None - fully backward compatible

**New Exports**:

- `PermissionBuilder` - Fluent API for building type-safe scopes
- `ScopePresets` - 14 ready-to-use permission presets
- Utility functions: `buildScope()`, `parseScope()`, `hasPermission()`, `validateScope()`, etc.
- Permission schemas and types for TypeScript consumers

See README for usage examples and migration guide.
