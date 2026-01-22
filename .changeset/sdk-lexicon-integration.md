---
"@hypercerts-org/sdk-core": minor
---

Integrate LexiconRegistry into SDK and Repository. The SDK now initializes a LexiconRegistry with hypercert lexicons by
default and exposes it via `getLexiconRegistry()`. Repository instances receive the registry and pass it to
RecordOperations for future validation support.
