# @hypercerts-org/sdk-react

## 0.10.0-beta.10

### Minor Changes

- [#125](https://github.com/hypercerts-org/hypercerts-sdk/pull/125)
  [`a493f3b`](https://github.com/hypercerts-org/hypercerts-sdk/commit/a493f3b05174eeef104c83f7be14749f1c0185a2) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Add dual profile system with separate Bluesky and Certified profile
  operations, plus upsert methods

  **Core SDK (`@hypercerts-org/sdk-core`):**

  **Breaking Changes:**

  The profile API has been completely redesigned to support two profile types:
  - **Removed generic profile methods:**
    - ❌ `profile.get()`
    - ❌ `profile.create(params)`
    - ❌ `profile.update(params)`
  - **Removed deprecated profile types:**
    - ❌ `HypercertProfile` - Use `CertifiedProfileRecord` instead
    - ❌ `CreateHypercertProfileParams` - Use `CreateCertifiedProfileParams` instead
    - ❌ `UpdateHypercertProfileParams` - Use `UpdateCertifiedProfileParams` instead
    - ❌ `HypercertProfileParams` - Use specific create/update types instead
    - ❌ `CreateProfileParams` - Use `CreateCertifiedProfileParams` instead
  - **Removed unused type export:**
    - ❌ `JsonBlobRef` - No longer used in SDK. This type was removed because:
      - It was too "snowflaky" - required converting `BlobRef` instances to JSON format unnecessarily
      - The actual `BlobRef` object works perfectly fine for all use cases
      - It created flaky tests where we manually created mock JSON objects that weren't representative of actual
        `JsonBlobRef` values
      - Internal implementation now uses `BlobRef` instances directly throughout
      - Users who need this type for advanced use cases can import it directly from `@atproto/lexicon`
  - **Added profile-specific methods:**
    - ✅ `profile.getBskyProfile()` - Get Bluesky profile (app.bsky.actor.profile)
    - ✅ `profile.createBskyProfile(params)` - Create Bluesky profile
    - ✅ `profile.updateBskyProfile(params)` - Update Bluesky profile
    - ✅ `profile.getCertifiedProfile()` - Get Certified profile (app.certified.actor.profile) **[Returns `null` if
      profile doesn't exist]**
    - ✅ `profile.createCertifiedProfile(params)` - Create Certified profile
    - ✅ `profile.updateCertifiedProfile(params)` - Update Certified profile
    - ✅ `profile.upsertBskyProfile(params)` - Create or update Bluesky profile **[New]**
    - ✅ `profile.upsertCertifiedProfile(params)` - Create or update Certified profile **[New]**

  **Features:**
  - **Bluesky profiles** (`app.bsky.actor.profile`):
    - Standard AT Protocol profiles
    - Avatar/banner returned as CDN URLs (`https://cdn.bsky.app/...`)
    - Includes Bluesky-specific fields (labels, pinnedPost, etc.)
  - **Certified profiles** (`app.certified.actor.profile`):
    - Hypercerts-specific profiles with additional fields
    - Avatar/banner returned as PDS blob URLs (`https://pds.../xrpc/...`)
    - **`getCertifiedProfile()` returns `null` if profile doesn't exist** (not an error - common for new users)
    - Supports `pronouns` field (max 20 graphemes)
    - Supports `website` field
    - Images stored using `HypercertImageRecord` format internally (smallImage/largeImage wrappers)
  - **Upsert methods** (Recommended for most use cases):
    - `upsertBskyProfile(params)` - Automatically creates or updates Bluesky profile
    - `upsertCertifiedProfile(params)` - Automatically creates or updates Certified profile
    - Simpler DX - no need to check if profile exists first
    - Perfect for "save profile" operations
  - **New types:**
    - `BskyProfile` - Type for Bluesky profiles (alias for `AppBskyActorDefs.ProfileViewDetailed`)
    - `CertifiedProfile` - Type for Certified profiles
    - `CertifiedProfileRecord` - Record type for Certified profiles (replaces `HypercertProfile`)
    - `CreateBskyProfileParams`, `UpdateBskyProfileParams`
    - `CreateCertifiedProfileParams`, `UpdateCertifiedProfileParams` (replace `CreateHypercertProfileParams`,
      `UpdateHypercertProfileParams`)

  **Migration Guide:**

  ```typescript
  // BEFORE (old API - removed)
  const profile = await repo.profile.get();
  await repo.profile.create({ displayName: "Alice" });
  await repo.profile.update({ displayName: "New Name" });

  // AFTER - Recommended: Use upsert (works for both create and update)
  await repo.profile.upsertCertifiedProfile({
    displayName: "Alice",
    pronouns: "she/her",
    website: "https://alice.com",
  });

  // AFTER - Advanced: Explicit create/update for fine control
  const certProfile = await repo.profile.getCertifiedProfile();
  if (!certProfile) {
    await repo.profile.createCertifiedProfile({
      displayName: "Alice",
      pronouns: "she/her",
    });
  } else {
    await repo.profile.updateCertifiedProfile({
      displayName: "New Name",
    });
  }

  // Getting profiles - handle null case
  const profile = await repo.profile.getCertifiedProfile();
  if (profile) {
    console.log(profile.displayName);
  } else {
    console.log("User hasn't created a profile yet");
  }

  // Type migrations
  import type {
    CertifiedProfileRecord, // was: HypercertProfile
    CreateCertifiedProfileParams, // was: CreateHypercertProfileParams
    UpdateCertifiedProfileParams, // was: UpdateHypercertProfileParams
  } from "@hypercerts-org/sdk-core/types";
  ```

  **React SDK (`@hypercerts-org/sdk-react`):**

  **Breaking Changes:**
  - `useProfile` hook renamed `update` to `save` and `isUpdating` to `isSaving`
  - `save()` now uses upsert internally - works for first-time profile creation too

  ```typescript
  // BEFORE
  const { update, isUpdating } = useProfile();
  await update({ displayName: "Alice" });

  // AFTER
  const { save, isSaving } = useProfile();
  await save({ displayName: "Alice" }); // Works even if profile doesn't exist!
  ```

### Patch Changes

- Updated dependencies
  [[`d10642f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/d10642ff3647513f03db4b73ca2e9ab7a06fe955),
  [`5662f3f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5662f3f03d286a55c2623223b40ebc0542c1dcca),
  [`6f914e5`](https://github.com/hypercerts-org/hypercerts-sdk/commit/6f914e5a1f76ede52af4b8b75cf71dc935314dd7),
  [`a493f3b`](https://github.com/hypercerts-org/hypercerts-sdk/commit/a493f3b05174eeef104c83f7be14749f1c0185a2),
  [`a9701cd`](https://github.com/hypercerts-org/hypercerts-sdk/commit/a9701cd47e2743207ff6bb6968eef7d9fc4db17c),
  [`5db01ee`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5db01ee2baee53a0fd1c4e1ee1e32f2c7e41c30e)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.9

## 0.10.0-beta.9

### Patch Changes

- Updated dependencies
  [[`48da647`](https://github.com/hypercerts-org/hypercerts-sdk/commit/48da647d06bc6592b5b4aa48c56d6d17a7ade47f),
  [`da60509`](https://github.com/hypercerts-org/hypercerts-sdk/commit/da605096c5775fcd5ea16d072174d1607899332d),
  [`0d250f3`](https://github.com/hypercerts-org/hypercerts-sdk/commit/0d250f32f34fd21111baa97e8947cd4a08aab643),
  [`df35089`](https://github.com/hypercerts-org/hypercerts-sdk/commit/df35089657960cb42e4a7ced68165f4a2cdaa904)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.8

## 0.10.0-beta.8

### Minor Changes

- [#120](https://github.com/hypercerts-org/hypercerts-sdk/pull/120)
  [`2e03d8d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/2e03d8dc3a1fafad03c4f783951bfb48acfb01ab) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Update measurement API to align with lexicon beta.12+ schema

  **Breaking Changes (sdk-core):**
  - `addMeasurement()` now accepts `CreateMeasurementParams` instead of individual parameters
  - `subject` field replaces `hypercertUri` and accepts both string AT-URIs and StrongRefs
  - `unit` is now a required field (e.g., "tons CO2e", "hectares", "%")
  - `measurers` is now optional instead of required
  - Field name changes: `methodUri` → `methodURI`, `evidenceUris` → `evidenceURI`

  **Breaking Changes (sdk-react):**
  - Removed `OrgHypercertsDefs` export (WorkScope types removed from lexicon)
  - `UpdateHypercertParams.workScope` now accepts `string | StrongRef` (i.e., `string | { uri: string; cid: string }`)

  **New Features:**
  - Added `updateMeasurement()` method with `UpdateMeasurementParams` type (subject is immutable)
  - Support for `locations` array to specify where measurements were taken
  - Added `startDate` and `endDate` for measurement timeframes
  - Added `methodType` for short methodology identifiers
  - Rich text support via `comment` and `commentFacets` fields

  **Internal Improvements:**
  - Added `resolveToStrongRef` utility for handling string/StrongRef conversions
  - Updated evidence handling to use `HypercertAttachment` schema (beta.13 compatibility)
  - Improved error messages in URI resolution functions

### Patch Changes

- Updated dependencies
  [[`320b428`](https://github.com/hypercerts-org/hypercerts-sdk/commit/320b428a073b8f9371f3a224dd7897897ad7efae),
  [`28a46c8`](https://github.com/hypercerts-org/hypercerts-sdk/commit/28a46c80224633badaddb574971cafc6537edc1c),
  [`e1ced1e`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e1ced1e53f4f26058f4e4e5c06909563ec3cd49e),
  [`5be70fa`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5be70faf5728a41477508089cfebef9c26d1362e),
  [`2354987`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23549875fdd02cb30372109784916b3d5d9ee7c3),
  [`750cd44`](https://github.com/hypercerts-org/hypercerts-sdk/commit/750cd4429ed4ec2c0d21b4ea60296da87c7cc183),
  [`2e03d8d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/2e03d8dc3a1fafad03c4f783951bfb48acfb01ab),
  [`60c3950`](https://github.com/hypercerts-org/hypercerts-sdk/commit/60c3950f596b5ae7080404d66575ecb58861d5c0)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.7

## 0.10.0-beta.7

### Patch Changes

- Updated dependencies
  [[`bf93b3c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/bf93b3cf5d5eccb12de31c4fe6f95ed3676c746e)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.6

## 0.10.0-beta.6

### Minor Changes

- [#87](https://github.com/hypercerts-org/hypercerts-sdk/pull/87)
  [`85b1350`](https://github.com/hypercerts-org/hypercerts-sdk/commit/85b13502791e49966dae3d0dd0e833905c59abe3) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add comprehensive project support to SDK

  **Core SDK (`@hypercerts-org/sdk-core`):**
  - Add project CRUD operations (createProject, getProject, listProjects, updateProject, deleteProject)
  - Add project events (projectCreated, projectUpdated, projectDeleted)
  - Support for avatar and coverPhoto blob uploads
  - Activities array with weight values
  - Location reference support
  - 34 comprehensive tests with full coverage

  **React SDK (`@hypercerts-org/sdk-react`):**
  - Add useProjects and useProject hooks
  - Project query keys for cache management
  - TypeScript types for projects (Project, CreateProjectParams, UpdateProjectParams)
  - Test factory support for project hooks
  - Full pagination and optimistic updates support

  Projects organize multiple hypercert activities with metadata including title, shortDescription, description (Leaflet
  documents), avatar, cover photo, activities with weights, and location references.

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`cae0756`](https://github.com/hypercerts-org/hypercerts-sdk/commit/cae07569609df88676a36a9b69c620cc7591c6b8) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add useLexiconRegistry hook to access LexiconRegistry from SDK. React
  developers can now register and use custom lexicons through this hook.

### Patch Changes

- [#88](https://github.com/hypercerts-org/hypercerts-sdk/pull/88)
  [`19c78df`](https://github.com/hypercerts-org/hypercerts-sdk/commit/19c78dfef448fb43d353d95721c13f3a35618fb3) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - feat: add HTTP loopback URL support for local development

  Enable local development and testing with HTTP loopback URLs (`http://localhost`, `http://127.0.0.1`, `http://[::1]`)
  while maintaining security for production deployments.

  **Configuration Updates**
  - Custom URL validator accepting HTTPS URLs or HTTP loopback addresses
  - Update `OAuthConfigSchema` to allow loopback URLs for `clientId`, `redirectUri`, `jwksUri`
  - Add optional `developmentMode` boolean flag to suppress warnings
  - Update `ServerConfigSchema` to allow loopback URLs for PDS/SDS servers
  - Export `isLoopbackUrl()` helper function and TypeScript types (`LoopbackUrl`, `HttpsUrl`,
    `DevelopmentOrProductionUrl`)

  **Development Mode Features**
  - Automatic loopback detection with informative logging
  - Warning when using loopback URLs without explicit `developmentMode` flag
  - Info logs indicating development mode is active
  - Clear guidance about authorization server requirements

  **Testing**
  - 28 new unit tests for loopback URL validation
  - Tests cover localhost, 127.0.0.1, and [::1] (IPv6) loopback addresses
  - Tests verify rejection of non-loopback HTTP URLs
  - Tests ensure HTTPS URLs always accepted

  **Documentation**
  - Comprehensive local development guide in Core SDK README
  - NextJS App Router example with loopback configuration
  - API route setup examples (OAuth callback, JWKS endpoint)
  - Important notes about authorization server support and production safety
  - Local development example added to React SDK factory JSDoc

  **Breaking Changes**: None - fully backward compatible

  **Migration**: No migration needed for existing configurations. Existing HTTPS URLs continue to work without changes.

  This feature enables developers to test the SDK locally without requiring HTTPS certificates, while the underlying
  `@atproto/oauth-client-node` library handles loopback OAuth flows per the AT Protocol specification.

- Updated dependencies
  [[`85b1350`](https://github.com/hypercerts-org/hypercerts-sdk/commit/85b13502791e49966dae3d0dd0e833905c59abe3),
  [`f9dd27f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f9dd27f78de0ee49aab9079e76566f272b161cd0),
  [`e850310`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e850310d26e0561bdcfb778a6ef3bedbb7453eed),
  [`3157c18`](https://github.com/hypercerts-org/hypercerts-sdk/commit/3157c188c70e2f9473ee14eddaf635e3fbd346a1),
  [`0cd3b26`](https://github.com/hypercerts-org/hypercerts-sdk/commit/0cd3b26eb779246e9ef094f614f2f77807926f1b),
  [`b87cb22`](https://github.com/hypercerts-org/hypercerts-sdk/commit/b87cb2265d924b531eef8d58c669dc931b61e561),
  [`19c78df`](https://github.com/hypercerts-org/hypercerts-sdk/commit/19c78dfef448fb43d353d95721c13f3a35618fb3),
  [`3554580`](https://github.com/hypercerts-org/hypercerts-sdk/commit/3554580d77d9467c88c779e75a96a08d3e17bfd7),
  [`eea06a7`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eea06a7f5e4f655ccac635fa8842ea32a6dfde64),
  [`e0ef6e9`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e0ef6e9cb9138590e81b4a2929ca27ae557d2f39)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.5

## 0.10.0-beta.5

### Patch Changes

- [#83](https://github.com/hypercerts-org/hypercerts-sdk/pull/83)
  [`323ac4b`](https://github.com/hypercerts-org/hypercerts-sdk/commit/323ac4bc109243de6ecb5f44874c9cfae4deb826) Thanks
  [@aspiers](https://github.com/aspiers)! - Fix type error in useOrganizations hook: use `handlePrefix` instead of
  `handle` in CreateOrganizationParams

## 0.10.0-beta.4

### Patch Changes

- Updated dependencies
  [[`3419471`](https://github.com/hypercerts-org/hypercerts-sdk/commit/34194710cae3a53b4106d8b8dc4007505a8b5f0a),
  [`48ecd6c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/48ecd6cfddfb13a6c155df7c6618965dd2157253)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.4

## 0.10.0-beta.3

### Patch Changes

- Updated dependencies
  [[`31dc76a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/31dc76ae819f4c53e1a411a7fc6c0a6239552a66)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.3

## 0.10.0-beta.2

### Patch Changes

- [#71](https://github.com/hypercerts-org/hypercerts-sdk/pull/71)
  [`10bc42d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/10bc42de46f1a391f47de9d0af486f00b6edde08) Thanks
  [@aspiers](https://github.com/aspiers)! - Fix errant versions in CHANGELOG.md files

- Updated dependencies
  [[`10bc42d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/10bc42de46f1a391f47de9d0af486f00b6edde08)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.2

## 0.10.0-beta.1

### Minor Changes

- [#46](https://github.com/hypercerts-org/hypercerts-sdk/pull/46)
  [`eda4ac2`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eda4ac233e09764d83f042ba7df94d4c9884cc01) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Initial release of sdk-react package with React hooks and components
  for Hypercerts ATProto SDK

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

### Patch Changes

- [#64](https://github.com/hypercerts-org/hypercerts-sdk/pull/64)
  [`f83f03a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f83f03a8e505d57d38b45f3a50213ca1035c1229) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - fix(lexicon): correct field names and types to match lexicon schema
  - Fix `workTimeframeFrom/To` -> `workTimeFrameFrom/To` (capital 'F' in Frame)
  - Make `shortDescription` required for hypercert claims per lexicon schema
  - Update all interfaces, implementations, and tests to use correct field names
  - Add comprehensive lexicon documentation to README

- [#59](https://github.com/hypercerts-org/hypercerts-sdk/pull/59)
  [`7020fcc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7020fcc9845a4d4c2f792536611fc3bb5e3c4fe3) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Configure npm publishing to exclude source code and development files.
  Packages now only include the compiled `dist/` folder, README, and necessary runtime files (lexicon schemas). This
  reduces package sizes and prevents unnecessary files from being published to npm.

- [#55](https://github.com/hypercerts-org/hypercerts-sdk/pull/55)
  [`23c3d9a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23c3d9a3b71f326df68b65420c83f7ae42c2432d) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Fix endpoints and NSIDs for SDS operations in CollaboratorOperations
  and OrganizationOperations

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

- Updated dependencies
  [[`f7594f8`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f7594f838fd7e64837da702f7498e84a49b28bf5),
  [`bcde5fa`](https://github.com/hypercerts-org/hypercerts-sdk/commit/bcde5faeb11dba6d99967a434e8ec32d67b3aca5),
  [`f83f03a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f83f03a8e505d57d38b45f3a50213ca1035c1229),
  [`4b80edc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/4b80edca4162c4ce929edb28ffffa3f99f21cb74),
  [`7020fcc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7020fcc9845a4d4c2f792536611fc3bb5e3c4fe3),
  [`39accd9`](https://github.com/hypercerts-org/hypercerts-sdk/commit/39accd954422c901b7faf93e08be88e68a4f849a),
  [`cb3268d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/cb3268d78614efaf15aecc57a5dc3bce8313f3ca),
  [`23c3d9a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23c3d9a3b71f326df68b65420c83f7ae42c2432d),
  [`eda4ac2`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eda4ac233e09764d83f042ba7df94d4c9884cc01),
  [`7c33673`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7c33673fd5f53d92ba160ced1d1582178fa7c455),
  [`826b50c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/826b50c140a56fee4feeb6b6c83d1123e44c5118),
  [`caceacb`](https://github.com/hypercerts-org/hypercerts-sdk/commit/caceacbc5572a590c750a95ccfda23fff2dd0c61)]:
  - @hypercerts-org/sdk-core@0.10.0-beta.1
