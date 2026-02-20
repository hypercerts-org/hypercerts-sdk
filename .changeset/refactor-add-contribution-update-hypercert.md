---
"@hypercerts-org/sdk-core": minor
---

Fix `addContribution` to properly update hypercerts with contributor references

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
