# @hypercerts-org/sdk-core

## 0.10.0-beta.9

### Minor Changes

- [#128](https://github.com/hypercerts-org/hypercerts-sdk/pull/128)
  [`d10642f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/d10642ff3647513f03db4b73ca2e9ab7a06fe955) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - **BREAKING CHANGE (pre-1.0):** Add strict URI validation for attachment
  content strings

  This introduces a breaking behavioral change for 0.x consumers:
  - Add `isValidUri` utility to validate URI strings have a proper scheme (supports http, https, at://, ipfs://, and any
    RFC 3986-compliant scheme)
  - **`addAttachment` now throws `ValidationError`** when content strings are not valid URIs (e.g., plain text like
    `"not-a-uri"`)
  - Export `isValidUri` from the public API for consumer use

  **Migration Guide:** Existing code that passes plain text or non-URI strings to `addAttachment` will now fail with a
  `ValidationError`. To migrate:
  1. Ensure all content strings passed to `addAttachment` are valid URIs
  2. Use the new `isValidUri` utility to validate strings before passing them
  3. Convert plain text content to proper URI format (e.g., data URIs, IPFS URIs, or HTTP URLs)

  **Compatibility Note:** Consumers relying on the previous lenient behavior that accepted non-URI strings must update
  their code. The validation now strictly enforces that attachment content must be a valid URI with a recognized scheme.

- [#127](https://github.com/hypercerts-org/hypercerts-sdk/pull/127)
  [`5662f3f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5662f3f03d286a55c2623223b40ebc0542c1dcca) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Auto-detect user's PDS URL from OAuth session instead of requiring static
  configuration

  **Breaking Changes:**
  - `servers.pds` config option has been removed. The user's PDS URL is now automatically detected from the OAuth
    session's token info (`tokenInfo.aud`) during `callback()` and `restoreSession()`. This means the SDK correctly
    routes operations to each user's actual PDS regardless of which server they're hosted on.
  - A new `handleResolver` config option replaces `servers.pds` for its handle resolution role during OAuth
    authorization. This is optional — if omitted, DNS-based resolution is used.
  - `getAccountEmail()` no longer requires `servers.pds` to be configured, since it uses the session's fetch handler
    which internally routes to the correct PDS.
  - `sdk.repository()` is now async (returns `Promise<Repository>`). On cache miss it automatically resolves the PDS
    from the session's token info, so callers no longer need to manually call `resolveSessionPds()` first.

  **New APIs:**
  - `sdk.resolveSessionPds(session)` — Manually resolve and cache a session's PDS URL. Useful for pre-warming the cache
    or for sessions created outside the SDK's auth flow.

  **Migration:**

  ```typescript
  // Before
  const sdk = createATProtoSDK({
    oauth: { ... },
    servers: { pds: "https://bsky.social", sds: "https://sds.example.com" },
  });

  // After
  const sdk = createATProtoSDK({
    oauth: { ... },
    handleResolver: "https://bsky.social", // optional, for handle resolution only
    servers: { sds: "https://sds.example.com" },
  });
  ```

- [#137](https://github.com/hypercerts-org/hypercerts-sdk/pull/137)
  [`6f914e5`](https://github.com/hypercerts-org/hypercerts-sdk/commit/6f914e5a1f76ede52af4b8b75cf71dc935314dd7) Thanks
  [@aspiers](https://github.com/aspiers)! - Add `isValidDid()` utility function for DID format validation
  - Validates DID format (did:method:identifier) with support for numeric method names per W3C spec
  - Exported from `@hypercerts-org/sdk-core` for consumer use
  - `BlobOperationsImpl` constructor now validates `repoDid` and throws `ValidationError` for invalid formats

  > **⚠️ Potentially breaking:** callers that previously passed invalid DID strings to `BlobOperationsImpl` (directly or
  > via `Repository`) will now receive a `ValidationError` at construction time instead of silently accepting the value.
  > Use `isValidDid(repoDid)` to check before constructing if needed.

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

- [#130](https://github.com/hypercerts-org/hypercerts-sdk/pull/130)
  [`a9701cd`](https://github.com/hypercerts-org/hypercerts-sdk/commit/a9701cd47e2743207ff6bb6968eef7d9fc4db17c) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Fix `addContribution` to properly update hypercerts with contributor
  references

  **Breaking Changes:**

  The `addContribution` method signature has changed to align with the `create()` method's contribution handling:
  - `hypercertUri` is now **required** (was optional)
  - `contributors` now accepts `Array<ContributorIdentityParams>` (was `string[]`)
    - Supports DIDs, StrongRefs, or inline contributor creation params
  - `contributionDetails` parameter **replaces** separate `role`/`description` params
    - Supports inline role strings, StrongRefs, or inline contribution creation params
  - Added optional `weight` parameter for contribution weighting
  - Added optional `onProgress` callback for progress tracking
  - Returns `UpdateResult` instead of `CreateResult` (since it updates the hypercert)

  **What Changed:**

  The method now correctly:
  - Creates or references contributionDetails records
  - Creates or references contributorInformation records
  - **Updates the hypercert's `contributors` array** with the new entries (this was the bug)
  - Supports batch addition of multiple contributors in one call
  - Preserves existing contributors when adding new ones

  **Migration:**

  ```typescript
  // Before (0.10.0-beta.7 and earlier):
  await repo.hypercerts.addContribution({
    hypercertUri: "at://...", // optional
    contributors: ["did:plc:user1"],
    role: "Developer",
    description: "Built features",
  });

  // After (0.10.0-beta.8+):
  await repo.hypercerts.addContribution({
    hypercertUri: "at://...", // required
    contributors: ["did:plc:user1"], // or StrongRef or create params
    contributionDetails: "Developer", // or StrongRef or create params object
    weight: "1.0", // optional
  });

  // With detailed contribution record:
  await repo.hypercerts.addContribution({
    hypercertUri: "at://...",
    contributors: [
      {
        identifier: "did:plc:user1",
        displayName: "Alice",
        image: avatarBlob,
      },
    ],
    contributionDetails: {
      role: "Developer",
      contributionDescription: "Built features",
      startDate: "2024-01-01",
      endDate: "2024-06-30",
    },
    weight: "2.0",
  });
  ```

  **Additional Breaking Change:**

  The `update()` method signature has been corrected to accept actual record fields:
  - Now accepts `UpdateHypercertParams` (fields from `HypercertClaim` record schema)
  - Previously accepted `Partial<CreateHypercertParams>` (SDK input format)

  **Why this change:**
  - Prevents invalid fields like `contributions` being added to records
  - Allows updating `contributors` array directly (which exists in the schema)
  - Type-safe - can only update fields that actually exist in the record
  - Validation now works correctly

  **Migration for update():**

  Most code should continue to work since common fields like `title`, `description`, `startDate`, etc. exist in both
  formats.

  If you were using SDK input fields that don't exist in records (e.g., `contributions`), you'll need to update:

  ```typescript
  // Before:
  await repo.hypercerts.update({
    uri: hypercertUri,
    updates: {
      contributions: [...],  // ❌ Invalid - doesn't exist in record
    },
  });

  // After: Use the actual record field
  await repo.hypercerts.update({
    uri: hypercertUri,
    updates: {
      contributors: [...],  // ✅ Valid - exists in record schema
    },
  });

  // Or use the new addContribution method
  await repo.hypercerts.addContribution({
    hypercertUri: hypercertUri,
    contributors: ["did:plc:user1"],
    contributionDetails: "Developer",
  });
  ```

  **Implementation Details:**
  - Added `UpdateHypercertParams` type for type-safe record updates
  - Added `buildContributorEntries()` helper to resolve and build contributor entries
  - Added `attachContributorsToHypercert()` helper to update hypercerts with new contributors
  - Refactored `processContributors()` to reuse `buildContributorEntries()` for consistency
  - Removed unused `createContributionsWithProgress()` method

- [#126](https://github.com/hypercerts-org/hypercerts-sdk/pull/126)
  [`5db01ee`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5db01ee2baee53a0fd1c4e1ee1e32f2c7e41c30e) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Refactor internal URI parsing and blob upload operations

  **Breaking:** `BlobOperationsImpl.upload()` now returns AT Protocol's `BlobRef` type instead of a plain
  `{ ref, mimeType, size }` object. Callers should access blob properties via `BlobRef` methods (e.g.
  `result.ref.toString()` for the CID string). SDS uploads now return a proper `BlobRef` instance with `ref`,
  `mimeType`, and `size` correctly populated from the server response.
  - Fix `validateScope` permission prefix regex to correctly accept query-param style scopes (e.g. `repo?action=create`,
    `blob?accept=video/*`, `rpc?lxm=*`) and reject bare `atproto` with a suffix
  - Export `AT_URI_REGEX` from `@hypercerts-org/sdk-core` for direct regex usage
  - Consolidate AT-URI parsing in HypercertOperationsImpl using `parseAtUri()` utility
  - Add internal `fetchRecord<T>()` and `saveRecord()` helpers to reduce code duplication
  - Fix `AT_URI_REGEX` rkey capture group to use `[^/]+` instead of `.+` to prevent over-matching
  - Fix `fetchRecord` to throw `NetworkError` when CID is absent instead of silently using an empty string
  - Fix `saveRecord` error message formatting (was passing two arguments to `NetworkError`)
  - Remove dead `parseAndValidateUri` method
  - Eliminate redundant network fetch in `updateProject` by passing pre-fetched record to `updateCollectionRecord`

## 0.10.0-beta.8

### Minor Changes

- [#122](https://github.com/hypercerts-org/hypercerts-sdk/pull/122)
  [`48da647`](https://github.com/hypercerts-org/hypercerts-sdk/commit/48da647d06bc6592b5b4aa48c56d6d17a7ade47f) Thanks
  [@aspiers](https://github.com/aspiers)! - Add RichText utility functions for auto-detecting facets from text

  New utility functions to simplify creating rich text facets:
  - `createFacetsFromText(text, agent?)` - async function that auto-detects URLs, hashtags, and @mentions. If an agent
    is provided, resolves mentions to DIDs.
  - `createFacetsFromTextSync(text)` - sync function for fast detection without mention resolution
  - Re-exports `RichText` class from `@atproto/api` for advanced use cases

- [#121](https://github.com/hypercerts-org/hypercerts-sdk/pull/121)
  [`0d250f3`](https://github.com/hypercerts-org/hypercerts-sdk/commit/0d250f32f34fd21111baa97e8947cd4a08aab643) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Rename evidence records to attachments and update schema to match lexicon
  changes

  **Breaking Changes:**

  **API Symbol Renames:**
  - `addEvidence()` → `addAttachment()`
  - `CreateHypercertEvidenceParams` → `CreateAttachmentParams`
  - `evidenceUris` → `attachmentUris` in create results
  - `evidenceAdded` → `attachmentAdded` event
  - Evidence type exports replaced with Attachment equivalents

  **Schema Field Changes:**

  **Subject Fields:**
  - `subjectUri` (string) → `subjects` (array of StrongRefs or a single uri or StrongRef)
  - `subject` (StrongRef) → `subjects` (array of StrongRefs or a single uri or StrongRef)

  **Content Fields:**
  - `content` (string | Blob) | Array<(string | Blob)> → `content` (required array of URI/Blob refs)
  - Content is now required and can be an array with multiple items or a single item. SDK will convert to an array

  **Removed Fields:**
  - `relationType` - removed from attachment schema
  - `contributors` - removed from attachment schema
  - `locations` - removed from attachment schema

  **Payload Mapping Examples:**

  ```typescript
  // Old evidence payload
  {
    subjectUri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
    content: "https://example.com/report.pdf",
    title: "Report",
    relationType: "supports"
  }

  // New attachment payload
  {
    subjects: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
    content: "https://example.com/report.pdf",
    title: "Report"
    // relationType removed
  }
  // or arrays:
  {
    subjects: ["at://did:plc:abc/org.hypercerts.claim.activity/xyz", "at://did:plc:abc/org.hypercerts.claim.activity/zyx"]
    content: ["https://reportfile.com/pdf", File]
  }
  ```

- [#122](https://github.com/hypercerts-org/hypercerts-sdk/pull/122)
  [`df35089`](https://github.com/hypercerts-org/hypercerts-sdk/commit/df35089657960cb42e4a7ced68165f4a2cdaa904) Thanks
  [@aspiers](https://github.com/aspiers)! - Fix SDS blob uploads, add profile creation, and refactor blob operations

  **BREAKING:** `HypercertOperationsImpl` and `ProfileOperationsImpl` constructors now require a `BlobOperations`
  instance instead of a server URL.
  - Route SDS blob uploads to `com.sds.repo.uploadBlob` with repo query parameter, and PDS blob uploads to standard
    `com.atproto.repo.uploadBlob`
  - Remove incorrect SDS routing logic from profile operations (profiles use standard ATProto endpoints on both PDS and
    SDS)
  - DRY blob uploads: extract shared `BlobOperations` interface and use dependency injection in both
    `ProfileOperationsImpl` and `HypercertOperationsImpl`
  - Refactor `applyParamsToProfile` to eliminate code duplication with helper methods
  - Add `create()` method to `ProfileOperationsImpl` for creating new profiles
  - Fix collection blob upload tests to mock `BlobOperations.upload` instead of `agent.uploadBlob`

### Patch Changes

- [#122](https://github.com/hypercerts-org/hypercerts-sdk/pull/122)
  [`da60509`](https://github.com/hypercerts-org/hypercerts-sdk/commit/da605096c5775fcd5ea16d072174d1607899332d) Thanks
  [@aspiers](https://github.com/aspiers)! - Enhance JSDoc documentation for collection and project methods

  Added comprehensive JSDoc with examples for:
  - `createCollection()` - examples for basic collections, avatar/banner images, and locations
  - `updateCollection()` - examples for updating title, images, and adding locations
  - `createProject()` - examples for basic projects, avatar/banner, and locations
  - `updateProject()` - examples for updating project images

## 0.10.0-beta.7

### Minor Changes

- [#112](https://github.com/hypercerts-org/hypercerts-sdk/pull/112)
  [`320b428`](https://github.com/hypercerts-org/hypercerts-sdk/commit/320b428a073b8f9371f3a224dd7897897ad7efae) Thanks
  [@aspiers](https://github.com/aspiers)! - Add comprehensive documentation and tests for collection avatar and banner
  images

  Collections and projects now support avatar (thumbnail/icon) and banner (header/cover) images. Images can be provided
  as Blobs for upload or as URI strings for external references.

  **What's Included:**
  - Comprehensive JSDoc documentation for `HypercertCollection` type explaining avatar and banner usage
  - Tests for creating collections with avatar/banner using both Blobs and URI strings
  - Tests for updating collection images (add, update, remove, preserve)
  - Examples showing avatar/banner in collections and projects

- [#112](https://github.com/hypercerts-org/hypercerts-sdk/pull/112)
  [`e1ced1e`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e1ced1e53f4f26058f4e4e5c06909563ec3cd49e) Thanks
  [@aspiers](https://github.com/aspiers)! - Add rich text facet support for activity descriptions (lexicon
  v0.10.0-beta.7)

  Activities now support rich text annotations (facets) in their descriptions, enabling mentions (@user), URLs, hashtags
  (#tag), and other inline markup.
  - Added `shortDescriptionFacets` and `descriptionFacets` fields to `CreateHypercertParams`
  - Updated `create()` method to include facet fields in hypercert records
  - Enhanced `HypercertClaim` documentation with comprehensive facet examples
  - Added examples showing mentions, links, and tag facets with proper byte indexing

- [#115](https://github.com/hypercerts-org/hypercerts-sdk/pull/115)
  [`5be70fa`](https://github.com/hypercerts-org/hypercerts-sdk/commit/5be70faf5728a41477508089cfebef9c26d1362e) Thanks
  [@s-adamantine](https://github.com/s-adamantine)! - **BREAKING CHANGE**: Update contribution structure to match
  lexicon beta.7+ inline contributor format.

  **Old API (lexicon beta.5-beta.6):**

  ```typescript
  await repo.hypercerts.create({
    contributions: [
      {
        contributors: ["did:plc:contrib1"],
        role: "Developer",
        description: "Led backend development",
      },
    ],
  });
  ```

  **New API (lexicon beta.7+):**

  ```typescript
  await repo.hypercerts.create({
    contributions: [
      {
        contributors: ["did:plc:contrib1"],
        contributionDetails: "Developer", // string | StrongRef | CreateContributionDetailsParams
        weight: "0.75", // optional proportional weight
      },
    ],
  });
  ```

  **Migration:** Replace `role` and `description` with `contributionDetails`. Optionally add `weight` for proportional
  attribution.

- [#108](https://github.com/hypercerts-org/hypercerts-sdk/pull/108)
  [`750cd44`](https://github.com/hypercerts-org/hypercerts-sdk/commit/750cd4429ed4ec2c0d21b4ea60296da87c7cc183) Thanks
  [@s-adamantine](https://github.com/s-adamantine)! - Support multiple locations for hypercert activity claims

  **Breaking Changes:**
  - `CreateHypercertParams.location` is now `CreateHypercertParams.locations` (plural, array)
  - `CreateHypercertResult.locationUri` is now `CreateHypercertResult.locationUris` (plural, array)
  - `CreateHypercertResult.locationCid` is now `CreateHypercertResult.locationCids` (plural, array)

  **New Functionality:**
  - Hypercerts can now have multiple locations to support activities spanning multiple places
  - Each location can be a StrongRef, string URI, or location object
  - `attachLocation()` now appends to existing locations array instead of replacing

  **Migration:**

  ```typescript
  // Before (v0.10.0-beta.5 and earlier)
  await repo.hypercerts.create({
    ...params,
    location: {
      lpVersion: "1.0.0",
      srs: "EPSG:4326",
      locationType: "coordinate-decimal",
      location: "https://example.com/location",
    },
  });

  // After (v0.10.0-beta.6+)
  await repo.hypercerts.create({
    ...params,
    locations: [
      {
        lpVersion: "1.0.0",
        srs: "EPSG:4326",
        locationType: "coordinate-decimal",
        location: "https://example.com/location",
      },
    ],
  });

  // Now supports multiple locations
  await repo.hypercerts.create({
    ...params,
    locations: [
      { location: "https://example.com/location1", ... },
      { location: "https://example.com/location2", ... },
    ],
  });
  ```

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

- [#108](https://github.com/hypercerts-org/hypercerts-sdk/pull/108)
  [`60c3950`](https://github.com/hypercerts-org/hypercerts-sdk/commit/60c3950f596b5ae7080404d66575ecb58861d5c0) Thanks
  [@s-adamantine](https://github.com/s-adamantine)! - feat: implement pre-generation of rKeys for activity claims using
  deterministic content hashing (SHA-256).

  fix: normalize hashInput in `createHypercertRecord()` to use resolved StrongRefs (`locationRef`, `contributorsData`)
  instead of raw params which may contain non-serializable Blobs or inconsistent formats, ensuring stable rKey
  generation.

### Patch Changes

- [#112](https://github.com/hypercerts-org/hypercerts-sdk/pull/112)
  [`28a46c8`](https://github.com/hypercerts-org/hypercerts-sdk/commit/28a46c80224633badaddb574971cafc6537edc1c) Thanks
  [@aspiers](https://github.com/aspiers)! - Add documentation for collection item weights (lexicon v0.10.0-beta.7)

  Collections now support optional weights on items for proportional attribution. Each item in a collection's `items`
  array can have an `itemWeight` field (positive number as string) to indicate relative weighting.
  - Enhanced documentation for `HypercertCollectionItem` type with usage examples
  - Added examples showing weighted items, nested collections, and basic items
  - Documented `CollectionItemInput` helper type for SDK operations

- [#119](https://github.com/hypercerts-org/hypercerts-sdk/pull/119)
  [`2354987`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23549875fdd02cb30372109784916b3d5d9ee7c3) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Fix contributor identity and contribution details to include `$type` for
  lexicon validation

  **Breaking Context:** The lexicon defines `contributorIdentity` and `contributionDetails` as union types wrapped in
  `$Typed<>`, which requires `$type: "com.atproto.repo.strongRef"` as a discriminator for validation. Unlike the
  `rights` field (which uses plain `ComAtprotoRepoStrongRef.Main`), these fields require `$type` to pass validation.

  **Implementation Changes:**
  - `resolveContributorIdentity()`: Now converts string DIDs to `contributorInformation` records and returns StrongRefs
    with `$type`
  - `resolveContributionDetails()`: Added `$type: "com.atproto.repo.strongRef"` to all StrongRef returns
  - Updated `ResolvedContributorIdentity` and `ResolvedContributionDetails` types to include `$type` in StrongRef
    objects

  **Test Updates:**
  - Added mocks for `contributorInformation` record creation when string DIDs are provided (e.g., `"did:plc:contrib1"`)
  - Updated assertions to expect `$type: "com.atproto.repo.strongRef"` in all contributor and contribution detail
    StrongRefs
  - Adjusted mock call indices to account for additional `contributorInformation` record creation calls
  - Fixed 10 failing tests that were expecting plain `{ uri, cid }` objects instead of properly typed StrongRefs

  This ensures hypercert records with contributors pass lexicon validation and can be created successfully.

## 0.10.0-beta.6

### Minor Changes

- [#101](https://github.com/hypercerts-org/hypercerts-sdk/pull/101)
  [`bf93b3c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/bf93b3cf5d5eccb12de31c4fe6f95ed3676c746e) Thanks
  [@aspiers](https://github.com/aspiers)! - feat: align collection/project types with lexicon + add inline location
  support

  This is a BREAKING change.

  **Type Alignment with Lexicon:**
  - Changed `createCollection` to use lexicon-aligned `items` array instead of `claims`
  - Updated avatar/banner handling to use proper lexicon union types
  - Simplified project methods to delegate to collection methods
  - Added `CreateCollectionParams`, `UpdateCollectionParams`, and result types derived from lexicon
  - Improved type safety by deriving SDK input types from lexicon definitions

  **Inline Location Support:**

  `AttachLocationParams` now supports three ways to specify location:
  1. **StrongRef** - Direct reference with uri and cid (no record creation)
  2. **AT-URI string** - Reference to existing location record
  3. **Location object** - Full location data to create a new location record

  **Changes:**
  - Add `AttachLocationParams` union type supporting StrongRef, string URI, or location object
  - Add optional `location` field to `CreateCollectionParams`
  - Add optional `location` field to `UpdateCollectionParams` (supports `null` to remove)
  - Update `CreateCollectionResult` to include optional `locationUri` field
  - Implement location handling in `createCollection()` - supports all three forms
  - Add tests for collection creation with StrongRef, string URI, and location object

  **Example Usage:**

  ```typescript
  // Create a project with location (StrongRef - direct reference)
  const project = await repo.hypercerts.createProject({
    title: "Climate Initiative",
    items: [...],
    location: { uri: "at://did:plc:alice/app.certified.location/abc", cid: "bafy..." },
  });

  // Create with location (AT-URI string - fetches CID)
  const project2 = await repo.hypercerts.createProject({
    title: "Forest Project",
    items: [...],
    location: "at://did:plc:bob/app.certified.location/xyz",
  });

  // Create with location (location object - creates new record)
  const project3 = await repo.hypercerts.createProject({
    title: "Ocean Project",
    items: [...],
    location: {
      lpVersion: "1.0",
      srs: "EPSG:4326",
      locationType: "coordinate-decimal",
      location: "37.7749, -122.4194",
    },
  });

  // Update project to change location
  await repo.hypercerts.updateProject(project.uri, {
    location: "at://did:plc:alice/app.certified.location/new",
  });

  // Remove location
  await repo.hypercerts.updateProject(project.uri, {
    location: null,
  });
  ```

## 0.10.0-beta.5

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
  [`f9dd27f`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f9dd27f78de0ee49aab9079e76566f272b161cd0) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add BaseOperations abstract class for building custom lexicon
  operations. Developers can now extend BaseOperations to create type-safe, validated operation classes for their custom
  lexicons, with built-in helpers for record creation, validation, and strongRef management.

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`e850310`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e850310d26e0561bdcfb778a6ef3bedbb7453eed) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add comprehensive documentation and examples for custom lexicons.
  Includes custom-lexicons.md guide, sidecar-pattern.md guide, and a complete working example with tests demonstrating
  how to create and use custom lexicons for evaluating hypercerts.

- [#84](https://github.com/hypercerts-org/hypercerts-sdk/pull/84)
  [`3157c18`](https://github.com/hypercerts-org/hypercerts-sdk/commit/3157c188c70e2f9473ee14eddaf635e3fbd346a1) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Evidence records are now created separately instead of being embedded inline
  in hypercerts
  - `create()` now calls `addEvidence()` for each evidence item using `Promise.all()` for parallel creation
  - Remove inline evidence embedding from hypercert records
  - Add `evidenceUris?: string[]` to `CreateHypercertResult` interface
  - Add `createEvidenceWithProgress()` helper method with "addEvidence" progress tracking
  - `addEvidence()` SDK constructs `$type`, `createdAt`, and `subject` fields internally

  **Breaking Changes:**
  - Evidence is no longer embedded in the hypercert record - use `result.evidenceUris` to access evidence record URIs
  - `addEvidence()` now accepts a single `CreateHypercertEvidenceParams` object instead of
    `(uri: string, evidence: HypercertEvidence[])`

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`0cd3b26`](https://github.com/hypercerts-org/hypercerts-sdk/commit/0cd3b26eb779246e9ef094f614f2f77807926f1b) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add LexiconRegistry for custom lexicon management. Developers can now
  register custom lexicon schemas at runtime and validate records against registered schemas before creation. The
  registry supports:
  - Registering custom lexicon definitions from JSON
  - Validating records against registered schemas
  - Querying registered lexicons
  - Managing lexicon lifecycle (register/unregister)

  This enables developers to extend the SDK with custom record types that can reference hypercerts and other records
  using strongRefs.

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`b87cb22`](https://github.com/hypercerts-org/hypercerts-sdk/commit/b87cb2265d924b531eef8d58c669dc931b61e561) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add lexicon development utilities for custom lexicons. Developers can
  now use helper functions for AT-URI parsing, strongRef creation, lexicon schema building, and sidecar pattern
  implementation. This includes:
  - AT-URI utilities: parseAtUri, buildAtUri, extractRkeyFromUri, isValidAtUri
  - StrongRef utilities: createStrongRef, createStrongRefFromResult, validateStrongRef
  - Lexicon builders: createStringField, createIntegerField, createStrongRefField, createRecordDef, createLexiconDoc,
    and more
  - Sidecar pattern: createSidecarRecord, attachSidecar, createWithSidecars, batchCreateSidecars

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

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`3554580`](https://github.com/hypercerts-org/hypercerts-sdk/commit/3554580d77d9467c88c779e75a96a08d3e17bfd7) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add automatic lexicon validation to RecordOperations. Records are now
  validated against registered lexicon schemas before being sent to the server, catching schema violations early.
  Validation can be bypassed using the `skipValidation` parameter for advanced use cases.

- [#96](https://github.com/hypercerts-org/hypercerts-sdk/pull/96)
  [`eea06a7`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eea06a7f5e4f655ccac635fa8842ea32a6dfde64) Thanks
  [@Kzoeps](https://github.com/Kzoeps)! - Refactor location attachment to match lexicon specifications

  **New Features:**
  - Add `AttachLocationParams` interface exported from SDK for type-safe location attachment
  - Location data now properly uses `org.hypercerts.defs#uri` (for string URIs) or `org.hypercerts.defs#smallBlob` (for
    GeoJSON blobs) to match lexicon spec
  - Add `lpVersion` and `locationType` fields to location parameters for better protocol compliance

  **Improvements:**
  - Centralized blob upload logic with new `handleBlobUpload()` helper method
  - Simplified location type detection - now based on content type (string vs Blob) instead of separate `geojson`
    parameter
  - Improved type safety with structured `AttachLocationParams` interface

  **Breaking Changes:**
  - `attachLocation()` signature changed from `(uri, { value, name?, description?, srs, geojson? })` to
    `(uri, AttachLocationParams)`
  - `AttachLocationParams` now requires: `lpVersion`, `srs`, `locationType`, and `location` (string | Blob)
  - The `location` field in `CreateHypercertParams` now uses `AttachLocationParams` type instead of inline object
  - Removed separate `value` and `geojson` fields - use single `location` field with either string or Blob

- [#98](https://github.com/hypercerts-org/hypercerts-sdk/pull/98)
  [`e0ef6e9`](https://github.com/hypercerts-org/hypercerts-sdk/commit/e0ef6e9cb9138590e81b4a2929ca27ae557d2f39) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Integrate LexiconRegistry into SDK and Repository. The SDK now
  initializes a LexiconRegistry with hypercert lexicons by default and exposes it via `getLexiconRegistry()`. Repository
  instances receive the registry and pass it to RecordOperations for future validation support.

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
