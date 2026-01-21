---
"@hypercerts-org/sdk-core": minor
---

Refactor location attachment to match lexicon specifications

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
