---
"@hypercerts-org/sdk-core": minor
---

Refactor internal URI parsing and blob upload operations

**Breaking:** `BlobOperationsImpl.upload()` now returns AT Protocol's `BlobRef` type instead of a plain
`{ ref, mimeType, size }` object. Callers should access blob properties via `BlobRef` methods (e.g.
`result.ref.toString()` for the CID string). SDS uploads now return a proper `BlobRef` instance with `ref`, `mimeType`,
and `size` correctly populated from the server response.

- Export `AT_URI_REGEX` from `@hypercerts-org/sdk-core` for direct regex usage
- Consolidate AT-URI parsing in HypercertOperationsImpl using `parseAtUri()` utility
- Add internal `fetchRecord<T>()` and `saveRecord()` helpers to reduce code duplication
- Fix `AT_URI_REGEX` rkey capture group to use `[^/]+` instead of `.+` to prevent over-matching
- Fix `fetchRecord` to throw `NetworkError` when CID is absent instead of silently using an empty string
- Fix `saveRecord` error message formatting (was passing two arguments to `NetworkError`)
- Remove dead `parseAndValidateUri` method
- Eliminate redundant network fetch in `updateProject` by passing pre-fetched record to `updateCollectionRecord`
