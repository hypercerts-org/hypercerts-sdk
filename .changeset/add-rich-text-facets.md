---
"@hypercerts-org/sdk-core": minor
---

Add rich text facet support for activity descriptions (lexicon v0.10.0-beta.7)

Activities now support rich text annotations (facets) in their descriptions, enabling mentions (@user), URLs, hashtags
(#tag), and other inline markup.

- Added `shortDescriptionFacets` and `descriptionFacets` fields to `CreateHypercertParams`
- Updated `create()` method to include facet fields in hypercert records
- Enhanced `HypercertClaim` documentation with comprehensive facet examples
- Added examples showing mentions, links, and tag facets with proper byte indexing
