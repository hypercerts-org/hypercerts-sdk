---
"@hypercerts-org/sdk-core": minor
---

Add `isValidDid()` utility function for DID format validation

- Validates DID format (did:method:identifier) with support for numeric method names per W3C spec
- Exported from `@hypercerts-org/sdk-core` for consumer use
- `BlobOperationsImpl` constructor now validates `repoDid` and throws `ValidationError` for invalid formats
