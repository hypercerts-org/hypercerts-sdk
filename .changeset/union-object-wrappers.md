---
"@hypercerts-org/sdk-core": minor
---

Wrap contributorRole, workScope, contributorIdentity, and evaluator DIDs in proper object wrappers

**Breaking changes** (pre-1.0, so minor bump):

- `contributorRole` / `contributionDetails`: plain strings now stored as
  `{ $type: "org.hypercerts.claim.activity#contributorRole", role }` instead of raw strings
- `workScope`: plain strings now stored as `{ $type: "org.hypercerts.claim.activity#workScopeString", scope }` instead
  of raw strings
- `contributorIdentity`: plain string DIDs now produce an inline
  `{ $type: "org.hypercerts.claim.activity#contributorIdentity", identity }` object instead of creating a separate
  `contributorInformation` record
- `addEvaluation()` evaluator DIDs now include `$type: "app.certified.defs#did"`

**New exports:**

- Type aliases: `HypercertContributorIdentity`, `HypercertContributorRole`, `HypercertWorkScopeString`, `CertifiedDid`
- Helper functions: `contributorIdentity()`, `contributorRole()`, `workScopeString()`, `certifiedDid()`
