---
"@hypercerts-org/sdk-core": minor
---

feat: implement pre-generation of rKeys for activity claims using deterministic content hashing (SHA-256).

fix: normalize hashInput in `createHypercertRecord()` to use resolved StrongRefs (`locationRef`, `contributorsData`)
instead of raw params which may contain non-serializable Blobs or inconsistent formats, ensuring stable rKey generation.
