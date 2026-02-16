---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": minor
---

Add dual profile system with separate Bluesky and Certified profile operations, plus upsert methods

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
