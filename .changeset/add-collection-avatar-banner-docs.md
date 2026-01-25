---
"@hypercerts-org/sdk-core": minor
---

Add comprehensive documentation and tests for collection avatar and banner images

Collections and projects now support avatar (thumbnail/icon) and banner (header/cover) images. Images can be provided as
Blobs for upload or as URI strings for external references.

**What's Included:**

- Comprehensive JSDoc documentation for `HypercertCollection` type explaining avatar and banner usage
- Tests for creating collections with avatar/banner using both Blobs and URI strings
- Tests for updating collection images (add, update, remove, preserve)
- Examples showing avatar/banner in collections and projects
