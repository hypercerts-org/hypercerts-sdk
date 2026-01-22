---
"@hypercerts-org/sdk-core": minor
---

Add LexiconRegistry for custom lexicon management. Developers can now register custom lexicon schemas at runtime and
validate records against registered schemas before creation. The registry supports:

- Registering custom lexicon definitions from JSON
- Validating records against registered schemas
- Querying registered lexicons
- Managing lexicon lifecycle (register/unregister)

This enables developers to extend the SDK with custom record types that can reference hypercerts and other records using
strongRefs.
