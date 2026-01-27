---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": minor
---

Update measurement API to align with lexicon beta.12+ schema

**Breaking Changes (sdk-core):**

- `addMeasurement()` now accepts `CreateMeasurementParams` instead of individual parameters
- `subject` field replaces `hypercertUri` and accepts both string AT-URIs and StrongRefs
- `unit` is now a required field (e.g., "tons CO2e", "hectares", "%")
- `measurers` is now optional instead of required
- Field name changes: `methodUri` → `methodURI`, `evidenceUris` → `evidenceURI`

**Breaking Changes (sdk-react):**

- Removed `OrgHypercertsDefs` export (WorkScope types removed from lexicon)
- `UpdateHypercertParams.workScope` now accepts `string | { uri: string; cid: string } | { $type: string }`

**New Features:**

- Support for `locations` array to specify where measurements were taken
- Added `startDate` and `endDate` for measurement timeframes
- Added `methodType` for short methodology identifiers
- Rich text support via `comment` and `commentFacets` fields

**Internal Improvements:**

- Added `resolveToStrongRef` utility for handling string/StrongRef conversions
- Updated evidence handling to use `HypercertAttachment` schema (beta.13 compatibility)
- Improved error messages in URI resolution functions
