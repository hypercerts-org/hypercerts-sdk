---
"@hypercerts-org/sdk-core": minor
---

Support existing blob references for profile avatar and banner fields

- Add `BlobInput = Blob | JsonBlobRef` type to `interfaces.ts`; avatar/banner fields on all profile param types now
  accept either a new `Blob` (uploaded automatically) or an existing `JsonBlobRef` (used directly without re-uploading)
- Add `blobRefToJsonRef(blobRef: BlobRef): JsonBlobRef` helper to `types.ts` for converting AT Protocol blob refs to
  their JSON representation
- Remove stale `BlobUploadResult` interface (was already marked `@deprecated`; `blobs.upload()` returns `BlobRef` from
  `@atproto/lexicon`, not this shape)

**Potentially breaking:** any code that imported `BlobUploadResult` from `@hypercerts-org/sdk-core` will need to switch
to `BlobRef` from `@atproto/lexicon` directly.
