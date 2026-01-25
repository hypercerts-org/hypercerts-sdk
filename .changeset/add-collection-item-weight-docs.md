---
"@hypercerts-org/sdk-core": patch
---

Add documentation for collection item weights (lexicon v0.10.0-beta.7)

Collections now support optional weights on items for proportional attribution. Each item in a collection's `items`
array can have an `itemWeight` field (positive number as string) to indicate relative weighting.

- Enhanced documentation for `HypercertCollectionItem` type with usage examples
- Added examples showing weighted items, nested collections, and basic items
- Documented `CollectionItemInput` helper type for SDK operations
