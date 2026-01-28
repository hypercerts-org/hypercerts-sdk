---
"@hypercerts-org/sdk-core": patch
---

Fix SDS endpoint routing, add profile creation, and refactor blob operations

- Fix blob upload to use standard `com.atproto.repo.uploadBlob` endpoint with SDS query parameter instead of
  non-existent `com.sds.repo.uploadBlob`
- Remove incorrect SDS routing logic from profile operations (create, update, getRecord, putRecord)
- Remove unnecessary SDS type declarations for standard ATProto endpoints
- Refactor `applyParamsToProfile` to eliminate code duplication with helper methods
- DRY blob uploads: extract shared `BlobOperations` interface and use dependency injection in both
  `ProfileOperationsImpl` and `HypercertOperationsImpl`
- Add missing `create()` method to `ProfileOperationsImpl` for creating new profiles
