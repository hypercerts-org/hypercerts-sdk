---
"@hypercerts-org/sdk-core": patch
---

fix(sdk-core): add required $type field to all record creation operations

The AT Protocol requires all records to include a `$type` field, but the SDK was omitting it during record creation, causing validation errors like "Record/$type must be a string". This fix:

- Adds `$type` field to all record types (rights, claims, locations, contributions, measurements, evaluations, collections)
- Fixes location record implementation to match `app.certified.location` lexicon schema
- Makes `srs` (Spatial Reference System) field required for location records with proper validation
- Updates interfaces and documentation to reflect required fields

Breaking change: `location.srs` is now required when creating locations (use "EPSG:4326" for standard WGS84 coordinates).
