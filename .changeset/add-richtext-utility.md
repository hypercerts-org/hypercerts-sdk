---
"@hypercerts-org/sdk-core": minor
---

Add RichText utility functions for auto-detecting facets from text

**0.x Versioning Note:** This is a non-breaking addition. No existing APIs are modified or removed.

New utility functions to simplify creating rich text facets:

- `createFacetsFromText(text, agent?)` - async function that auto-detects URLs, hashtags, and @mentions. If an agent is
  provided, resolves mentions to DIDs; otherwise mentions use the handle string as the DID.
- `createFacetsFromTextSync(text)` - sync function for fast detection without mention resolution (mentions use handle as
  DID)
- Re-exports `RichText` class from `@atproto/api` for advanced use cases

**Usage:**

```typescript
import { createFacetsFromText, createFacetsFromTextSync } from "@hypercerts-org/sdk-core";

// Sync (no DID resolution)
const facetsSync = createFacetsFromTextSync("Check out #hypercerts by @alice");

// Async with DID resolution (requires authenticated agent)
const facetsAsync = await createFacetsFromText("Check out #hypercerts by @alice", agent);
```
