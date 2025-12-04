---
"@hypercerts-org/sdk-core": patch
"@hypercerts-org/sdk-react": patch
---

fix(lexicon): correct field names and types to match lexicon schema

- Fix `workTimeframeFrom/To` -> `workTimeFrameFrom/To` (capital 'F' in Frame)
- Make `shortDescription` required for hypercert claims per lexicon schema
- Update all interfaces, implementations, and tests to use correct field names
- Add comprehensive lexicon documentation to README
