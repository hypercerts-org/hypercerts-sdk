---
"@hypercerts-org/sdk-core": minor
---

Evidence records are now created separately instead of being embedded inline in hypercerts

- `create()` now calls `addEvidence()` for each evidence item using `Promise.all()` for parallel creation
- Remove inline evidence embedding from hypercert records
- Add `evidenceUris?: string[]` to `CreateHypercertResult` interface
- Add `createEvidenceWithProgress()` helper method with "addEvidence" progress tracking
- `addEvidence()` SDK constructs `$type`, `createdAt`, and `subject` fields internally

**Breaking Changes:**

- Evidence is no longer embedded in the hypercert record - use `result.evidenceUris` to access evidence record URIs
- `addEvidence()` now accepts a single `CreateHypercertEvidenceParams` object instead of
  `(uri: string, evidence: HypercertEvidence[])`
