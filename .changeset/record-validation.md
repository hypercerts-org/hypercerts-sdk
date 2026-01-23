---
"@hypercerts-org/sdk-core": minor
---

Add automatic lexicon validation to RecordOperations. Records are now validated against registered lexicon schemas
before being sent to the server, catching schema violations early. Validation can be bypassed using the `skipValidation`
parameter for advanced use cases.
