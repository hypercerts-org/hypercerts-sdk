---
"@hypercerts-org/sdk-core": patch
---

Preserve caller-supplied `$type` and `createdAt` in `createContributionDetailsRecord` using nullish coalescing

- Add optional `$type` and `createdAt` fields to `CreateContributionDetailsParams`
- Use nullish coalescing (`??`) to default only when values are not provided
- Aligns with the pattern established in `buildAttachmentRecord`
