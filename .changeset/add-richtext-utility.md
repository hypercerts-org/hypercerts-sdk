---
"@hypercerts-org/sdk-core": minor
---

Add RichText utility functions for auto-detecting facets from text

New utility functions to simplify creating rich text facets:

- `createFacetsFromText(text, agent?)` - async function that auto-detects URLs, hashtags, and @mentions. If an agent is
  provided, resolves mentions to DIDs.
- `createFacetsFromTextSync(text)` - sync function for fast detection without mention resolution
- Re-exports `RichText` class from `@atproto/api` for advanced use cases
