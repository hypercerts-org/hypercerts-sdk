---
"@hypercerts-org/sdk-core": patch
---

Fix contributor identity and contribution details to include `$type` for lexicon validation

**Breaking Context:** The lexicon defines `contributorIdentity` and `contributionDetails` as union types wrapped in
`$Typed<>`, which requires `$type: "com.atproto.repo.strongRef"` as a discriminator for validation. Unlike the `rights`
field (which uses plain `ComAtprotoRepoStrongRef.Main`), these fields require `$type` to pass validation.

**Implementation Changes:**

- `resolveContributorIdentity()`: Now converts string DIDs to `contributorInformation` records and returns StrongRefs
  with `$type`
- `resolveContributionDetails()`: Added `$type: "com.atproto.repo.strongRef"` to all StrongRef returns
- Updated `ResolvedContributorIdentity` and `ResolvedContributionDetails` types to include `$type` in StrongRef objects

**Test Updates:**

- Added mocks for `contributorInformation` record creation when string DIDs are provided (e.g., `"did:plc:contrib1"`)
- Updated assertions to expect `$type: "com.atproto.repo.strongRef"` in all contributor and contribution detail
  StrongRefs
- Adjusted mock call indices to account for additional `contributorInformation` record creation calls
- Fixed 10 failing tests that were expecting plain `{ uri, cid }` objects instead of properly typed StrongRefs

This ensures hypercert records with contributors pass lexicon validation and can be created successfully.
