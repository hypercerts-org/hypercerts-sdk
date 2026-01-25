---
"@hypercerts-org/sdk-core": minor
---

Fix SDS blob uploads, add profile creation, and refactor blob operations

**BREAKING:** `HypercertOperationsImpl` and `ProfileOperationsImpl` constructors now require a `BlobOperations` instance
instead of a server URL.

- Route SDS blob uploads to `com.sds.repo.uploadBlob` with repo query parameter, and PDS blob uploads to standard
  `com.atproto.repo.uploadBlob`
- Remove incorrect SDS routing logic from profile operations (profiles use standard ATProto endpoints on both PDS and
  SDS)
- DRY blob uploads: extract shared `BlobOperations` interface and use dependency injection in both
  `ProfileOperationsImpl` and `HypercertOperationsImpl`
- Refactor `applyParamsToProfile` to eliminate code duplication with helper methods
- Add `create()` method to `ProfileOperationsImpl` for creating new profiles
- Fix collection blob upload tests to mock `BlobOperations.upload` instead of `agent.uploadBlob`
