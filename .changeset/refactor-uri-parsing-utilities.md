---
"@hypercerts-org/sdk-core": patch
---

Refactor internal URI parsing and blob upload operations

- Export `AT_URI_REGEX` from `@hypercerts-org/sdk-core` for direct regex usage
- Consolidate AT-URI parsing in HypercertOperationsImpl using `parseAtUri()` utility
- Add internal `fetchRecord<T>()` and `saveRecord()` helpers to reduce code duplication
- Simplify `BlobOperationsImpl.upload()` to return `BlobRef` directly from the API instead of manually reconstructing it
- Update return type of `upload()` from manual `{ ref, mimeType, size }` to AT Protocol's `BlobRef` type
