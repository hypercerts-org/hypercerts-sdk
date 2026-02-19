---
"@hypercerts-org/sdk-core": minor
---

Bump lexicon to 0.10.0-beta.15 and implement org.hypercerts.acknowledgement record type

- Update `@hypercerts-org/lexicon` dependency from `0.10.0-beta.14` to `0.10.0-beta.15`
- `locationType` knownValues expanded in beta.15 (no SDK code change needed — field is open `knownValues`)
- Implement `org.hypercerts.acknowledgement` record type:
  - `HypercertAcknowledgement`, `CreateAcknowledgementParams`, `UpdateAcknowledgementParams` types
  - `createAcknowledgement()`, `getAcknowledgement()`, `updateAcknowledgement()`, `deleteAcknowledgement()` operations
  - Acknowledges inclusion of one record (subject) within another (context) — e.g. a contributor acknowledging inclusion
    in an activity
