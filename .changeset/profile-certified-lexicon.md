---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": patch
---

Add dual profile system with separate Bluesky and Certified profile operations

**Core SDK (`@hypercerts-org/sdk-core`):**

**Breaking Changes:**

The profile API has been completely redesigned to support two profile types:

- **Removed generic profile methods:**
  - ❌ `profile.get()`
  - ❌ `profile.create(params)`
  - ❌ `profile.update(params)`

- **Added six new profile-specific methods:**
  - ✅ `profile.getBskyProfile()` - Get Bluesky profile (app.bsky.actor.profile)
  - ✅ `profile.createBskyProfile(params)` - Create Bluesky profile
  - ✅ `profile.updateBskyProfile(params)` - Update Bluesky profile
  - ✅ `profile.getCertifiedProfile()` - Get Certified profile (app.certified.actor.profile)
  - ✅ `profile.createCertifiedProfile(params)` - Create Certified profile
  - ✅ `profile.updateCertifiedProfile(params)` - Update Certified profile

**Features:**

- **Bluesky profiles** (`app.bsky.actor.profile`):
  - Standard AT Protocol profiles
  - Avatar/banner returned as CDN URLs (`https://cdn.bsky.app/...`)
  - Includes Bluesky-specific fields (labels, pinnedPost, etc.)

- **Certified profiles** (`app.certified.actor.profile`):
  - Hypercerts-specific profiles with additional fields
  - Avatar/banner returned as PDS blob URLs (`https://pds.../xrpc/...`)
  - Supports `pronouns` field (max 20 graphemes)
  - Supports `website` field
  - Images stored using `HypercertImageRecord` format internally (smallImage/largeImage wrappers)

- **New types:**
  - `BskyProfile` - Type for Bluesky profiles (alias for `AppBskyActorDefs.ProfileViewDetailed`)
  - `CertifiedProfile` - Type for Certified profiles
  - `CreateBskyProfileParams`, `UpdateBskyProfileParams`
  - `CreateCertifiedProfileParams`, `UpdateCertifiedProfileParams`

**Migration Guide:**

```typescript
// BEFORE (old API - removed)
const profile = await repo.profile.get();
await repo.profile.create({ displayName: "Alice" });
await repo.profile.update({ displayName: "New Name" });

// AFTER - Option 1: Bluesky profile (standard AT Protocol)
const bskyProfile = await repo.profile.getBskyProfile();
await repo.profile.createBskyProfile({ displayName: "Alice" });
await repo.profile.updateBskyProfile({ displayName: "New Name" });

// AFTER - Option 2: Certified profile (hypercerts-specific with pronouns/website)
const certProfile = await repo.profile.getCertifiedProfile();
await repo.profile.createCertifiedProfile({
  displayName: "Alice",
  pronouns: "she/her",
  website: "https://alice.com",
});
await repo.profile.updateCertifiedProfile({
  displayName: "New Name",
  pronouns: "they/them",
});
```

**React SDK (`@hypercerts-org/sdk-react`):**

- No breaking changes
- `useProfile` hook continues to work as before
- Internal updates to match new core SDK types
