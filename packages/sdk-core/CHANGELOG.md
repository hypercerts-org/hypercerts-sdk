# @hypercerts-org/sdk-core

## 0.10.0-beta.4

### Minor Changes

- [#80](https://github.com/hypercerts-org/hypercerts-sdk/pull/80)
  [`3419471`](https://github.com/hypercerts-org/hypercerts-sdk/commit/34194710cae3a53b4106d8b8dc4007505a8b5f0a) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Update the params for create organization. Created a separate interface for
  it. Changed the params from handle to handlePrefix as expected by the actual `sds.organizations.create` procedure
  call. Added validation to check the required parameters in the call

### Patch Changes

- [#79](https://github.com/hypercerts-org/hypercerts-sdk/pull/79)
  [`48ecd6c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/48ecd6cfddfb13a6c155df7c6618965dd2157253) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Remove validation from hypercert.get

## 0.10.0-beta.3

### Minor Changes

- [#72](https://github.com/hypercerts-org/hypercerts-sdk/pull/72)
  [`31dc76a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/31dc76ae819f4c53e1a411a7fc6c0a6239552a66) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Fixed params for creation to mirror the lexicon types. Remove extra `#` to
  remove duplicate # created during validation which fails the validation.

## 0.10.0-beta.2

### Patch Changes

- [#71](https://github.com/hypercerts-org/hypercerts-sdk/pull/71)
  [`10bc42d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/10bc42de46f1a391f47de9d0af486f00b6edde08) Thanks
  [@aspiers](https://github.com/aspiers)! - Fix errant versions in CHANGELOG.md files

## 0.10.0-beta.1

### Major Changes

- [#66](https://github.com/hypercerts-org/hypercerts-sdk/pull/66)
  [`7c33673`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7c33673fd5f53d92ba160ced1d1582178fa7c455) Thanks
  [@aspiers](https://github.com/aspiers)! - feat: migrate to published @hypercerts-org/lexicon package

  This release migrates the SDK from using a local `packages/lexicon` workspace to consuming the published
  `@hypercerts-org/lexicon` package from npm.

  **Benefits:**
  - **Single source of truth**: Lexicon definitions now come from a dedicated, independently versioned package
  - **Reduced codebase**: Removes ~3,000 lines of duplicated lexicon code from this repository
  - **Better versioning**: Lexicon can be updated independently via semver dependency updates
  - **Simplified architecture**: No longer maintaining duplicate lexicon tooling in monorepo
  - **Improved maintainability**: Clearer separation of concerns between SDK and lexicon definitions

  **Breaking Changes:**
  1. **Removed `LexiconRegistry` class**: Use the `validate()` function instead
  2. **Removed `ValidationResult` type**: Validation functions now throw errors on validation failure
  3. **Renamed type exports** to match lexicon package conventions:
     - `OrgHypercertsClaim` → `OrgHypercertsClaimActivity`
     - `OrgHypercertsCollection` → `OrgHypercertsClaimCollection`
  4. **Renamed constant exports** to use consistent naming:
     - `schemas` → `HYPERCERTS_SCHEMAS`
     - `schemaDict` → `HYPERCERTS_SCHEMA_DICT`
     - `ids` → `HYPERCERTS_NSIDS`
     - `lexicons` now exported as type-only (use `HYPERCERTS_LEXICON_JSON` or `HYPERCERTS_LEXICON_DOC` for runtime
       values)

  **Migration Guide:**

  **Validation:**

  ```typescript
  // Before
  import { LexiconRegistry, HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";
  const registry = new LexiconRegistry();
  registry.registerLexicons(HYPERCERT_LEXICONS);
  const result = registry.validate(HYPERCERT_COLLECTIONS.CLAIM, claimData);
  if (!result.valid) {
    console.error("Invalid record:", result.error);
  }

  // After
  import { validate, HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";
  try {
    validate(HYPERCERT_COLLECTIONS.CLAIM, claimData);
  } catch (error) {
    console.error("Invalid record:", error);
  }
  ```

  **Type imports:**

  ```typescript
  // Before
  import { OrgHypercertsClaim, OrgHypercertsCollection } from "@hypercerts-org/sdk-core";

  // After
  import { OrgHypercertsClaimActivity, OrgHypercertsClaimCollection } from "@hypercerts-org/sdk-core";
  ```

  **Constant imports:**

  ```typescript
  // Before
  import { schemas, schemaDict, ids } from "@hypercerts-org/sdk-core";

  // After
  import { HYPERCERTS_SCHEMAS, HYPERCERTS_SCHEMA_DICT, HYPERCERTS_NSIDS } from "@hypercerts-org/sdk-core";
  ```

  **Other Changes:**
  - Added dependency on `@hypercerts-org/lexicon@0.10.0-beta.3`
  - Updated all lexicon type exports to use namespaced imports from lexicon package
  - Improved hypercert validation with new test coverage
  - Enhanced test mocks and fixtures for better testability

  **For SDK users**: If you're using `LexiconRegistry`, follow the migration guide above. If you're only using the
  high-level Repository API, no changes are required.

### Minor Changes

- [#60](https://github.com/hypercerts-org/hypercerts-sdk/pull/60)
  [`f7594f8`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f7594f838fd7e64837da702f7498e84a49b28bf5) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Implement ConfigurableAgent for proper multi-server routing

  This release introduces the `ConfigurableAgent` class that enables proper routing of AT Protocol requests to different
  servers (PDS, SDS, or custom instances) while maintaining OAuth authentication from a single session.

  **Breaking Changes:**
  - Repository now uses `ConfigurableAgent` internally instead of standard `Agent`
  - This fixes the issue where invalid `agent.service` and `agent.api.xrpc.uri` property assignments were causing
    TypeScript errors

  **New Features:**
  - `ConfigurableAgent` class exported from `@hypercerts-org/sdk-core`
  - Support for simultaneous connections to multiple SDS instances with one OAuth session
  - Proper request routing based on configured service URL rather than session defaults

  **Bug Fixes:**
  - Remove invalid Agent property assignments that caused TypeScript compilation errors (TS2339)
  - Replace all `any` types in test files with proper type annotations
  - Eliminate build warnings from missing type declarations

  **Architecture:** The new routing system wraps the OAuth session's fetch handler to prepend the target server URL,
  ensuring requests go to the intended destination while maintaining full authentication (DPoP, access tokens, etc.).
  This enables use cases like:
  - Routing to SDS while authenticated via PDS
  - Accessing multiple organization SDS instances simultaneously
  - Testing against different server environments
  - Dynamic switching between PDS and SDS operations

  **Migration:** No action required - the change is transparent to existing code. The Repository API remains unchanged.

- [#46](https://github.com/hypercerts-org/hypercerts-sdk/pull/46)
  [`eda4ac2`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eda4ac233e09764d83f042ba7df94d4c9884cc01) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Initial release of sdk-core package with ATProto SDK for
  authentication, repository operations, and lexicon management

- [#65](https://github.com/hypercerts-org/hypercerts-sdk/pull/65)
  [`826b50c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/826b50c140a56fee4feeb6b6c83d1123e44c5118) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - feat(auth): add OAuth scopes and granular permissions system

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

- [#56](https://github.com/hypercerts-org/hypercerts-sdk/pull/56)
  [`caceacb`](https://github.com/hypercerts-org/hypercerts-sdk/commit/caceacbc5572a590c750a95ccfda23fff2dd0c61) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add pagination support and fix React hooks for SDS operations

  **Breaking Changes (sdk-core):**
  - `CollaboratorOperations.list()` now returns `{ collaborators: RepositoryAccessGrant[], cursor?: string }` instead of
    `RepositoryAccessGrant[]`
  - `OrganizationOperations.list()` now returns `{ organizations: OrganizationInfo[], cursor?: string }` instead of
    `OrganizationInfo[]`

  **Features:**
  - Add cursor-based pagination support to collaborator and organization list operations
  - Support optional `limit` and `cursor` parameters for paginated queries
  - Update internal methods (`hasAccess`, `getRole`, `get`) to handle new pagination structure

  **Bug Fixes (sdk-core):**
  - Fix permissions parsing in `CollaboratorOperationsImpl.list()` to match actual SDS API format (object with boolean
    flags)
  - Prevent `TypeError: permissionArray.includes is not a function` by correctly handling permissions as objects
  - Fix Agent service URL configuration to route queries to the correct server (PDS or SDS)
  - Resolve "Could not find repo" errors when querying SDS repositories by ensuring Agent uses SDS service endpoint
  - Update test mocks to use the actual SDS API response format

  **Bug Fixes (sdk-react):**
  - Fix `useCollaborators` hook to correctly destructure paginated response
  - Fix `useOrganizations` hook to correctly destructure paginated response
  - All React hooks now properly handle the new pagination structure

  **Documentation:**
  - Comprehensive README updates with clear examples for all SDK operations
  - Added pagination examples throughout documentation
  - Improved code samples with realistic use cases

  **Tests:**
  - All 317 tests passing (181 sdk-core + 136 sdk-react)
  - Updated test mocks to match new pagination response structure
  - Build completes with zero warnings

### Patch Changes

- [#58](https://github.com/hypercerts-org/hypercerts-sdk/pull/58)
  [`bcde5fa`](https://github.com/hypercerts-org/hypercerts-sdk/commit/bcde5faeb11dba6d99967a434e8ec32d67b3aca5) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Fix collaborator permissions parsing to align with SDS API response
  format. The SDS API returns permissions as objects with boolean flags (`{ read: true, create: true, ... }`) rather
  than string arrays. This fix simplifies the permissions parser to handle only the actual format returned by the API.

- [#64](https://github.com/hypercerts-org/hypercerts-sdk/pull/64)
  [`f83f03a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f83f03a8e505d57d38b45f3a50213ca1035c1229) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - fix(lexicon): correct field names and types to match lexicon schema
  - Fix `workTimeframeFrom/To` -> `workTimeFrameFrom/To` (capital 'F' in Frame)
  - Make `shortDescription` required for hypercert claims per lexicon schema
  - Update all interfaces, implementations, and tests to use correct field names
  - Add comprehensive lexicon documentation to README

- [#62](https://github.com/hypercerts-org/hypercerts-sdk/pull/62)
  [`4b80edc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/4b80edca4162c4ce929edb28ffffa3f99f21cb74) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - fix(sdk-core): add required $type field to all record creation
  operations

  The AT Protocol requires all records to include a `$type` field, but the SDK was omitting it during record creation,
  causing validation errors like "Record/$type must be a string". This fix:
  - Adds `$type` field to all record types (rights, claims, locations, contributions, measurements, evaluations,
    collections)
  - Fixes location record implementation to match `app.certified.location` lexicon schema
  - Makes `srs` (Spatial Reference System) field required for location records with proper validation
  - Updates interfaces and documentation to reflect required fields

  Breaking change: `location.srs` is now required when creating locations (use "EPSG:4326" for standard WGS84
  coordinates).

- [#59](https://github.com/hypercerts-org/hypercerts-sdk/pull/59)
  [`7020fcc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7020fcc9845a4d4c2f792536611fc3bb5e3c4fe3) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Configure npm publishing to exclude source code and development files.
  Packages now only include the compiled `dist/` folder, README, and necessary runtime files (lexicon schemas). This
  reduces package sizes and prevents unnecessary files from being published to npm.

- [#60](https://github.com/hypercerts-org/hypercerts-sdk/pull/60)
  [`39accd9`](https://github.com/hypercerts-org/hypercerts-sdk/commit/39accd954422c901b7faf93e08be88e68a4f849a) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - fix(sdk-core): ensure repository operations route to correct server
  (PDS/SDS)

  **Problem:** When using OAuth authentication to access organization repositories on SDS via
  `repo.repo(organizationDid)`, all operations like `hypercerts.list()` and `hypercerts.listCollections()` were
  incorrectly routing to the user's PDS instead of the SDS server, causing "Could not find repo" errors.

  **Root Cause:** The AT Protocol Agent was created from the OAuth session but only had its `api.xrpc.uri` property
  configured. Without setting the Agent's `service` property, it continued using the session's default PDS URL for all
  requests, even when switched to organization repositories.

  **Solution:** Set both `agent.service` and `agent.api.xrpc.uri` to the specified server URL in the Repository
  constructor. This ensures that:
  - Initial repository creation routes to the correct server (PDS or SDS)
  - Repository switching via `.repo(did)` maintains the same server routing
  - All operation implementations (HypercertOperationsImpl, RecordOperationsImpl, ProfileOperationsImpl,
    BlobOperationsImpl) now route correctly

  **Documentation:** Added comprehensive PDS/SDS orchestration explanation to README covering:
  - Server type comparison and use cases
  - How repository routing works internally
  - Common patterns for personal vs organization hypercerts
  - Key implementation details about Agent configuration

- [#56](https://github.com/hypercerts-org/hypercerts-sdk/pull/56)
  [`cb3268d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/cb3268d78614efaf15aecc57a5dc3bce8313f3ca) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Fix SDS organization and collaborator operations to match API
  contracts
  - Add required creatorDid parameter to organization.create endpoint
  - Fix organization.list to parse organizations field instead of repositories
  - Update accessType values to match SDS API: owner|shared|none (was owner|collaborator)
  - Add permission string array parser for collaborator.list endpoint
  - Update type definitions to match actual SDS API response formats

- [#55](https://github.com/hypercerts-org/hypercerts-sdk/pull/55)
  [`23c3d9a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23c3d9a3b71f326df68b65420c83f7ae42c2432d) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Fix endpoints and NSIDs for SDS operations in CollaboratorOperations
  and OrganizationOperations
