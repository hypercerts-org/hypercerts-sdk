---
"@hypercerts-org/sdk-core": minor
---

Add lexicon development utilities for custom lexicons. Developers can now use helper functions for AT-URI parsing,
strongRef creation, lexicon schema building, and sidecar pattern implementation. This includes:

- AT-URI utilities: parseAtUri, buildAtUri, extractRkeyFromUri, isValidAtUri
- StrongRef utilities: createStrongRef, createStrongRefFromResult, validateStrongRef
- Lexicon builders: createStringField, createIntegerField, createStrongRefField, createRecordDef, createLexiconDoc, and
  more
- Sidecar pattern: createSidecarRecord, attachSidecar, createWithSidecars, batchCreateSidecars
