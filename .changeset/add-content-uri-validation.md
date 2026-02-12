---
"@hypercerts-org/sdk-core": minor
---

**BREAKING CHANGE (pre-1.0):** Add strict URI validation for attachment content strings

This introduces a breaking behavioral change for 0.x consumers:

- Add `isValidUri` utility to validate URI strings have a proper scheme (supports http, https, at://, ipfs://, and any
  RFC 3986-compliant scheme)
- **`addAttachment` now throws `ValidationError`** when content strings are not valid URIs (e.g., plain text like
  `"not-a-uri"`)
- Export `isValidUri` from the public API for consumer use

**Migration Guide:** Existing code that passes plain text or non-URI strings to `addAttachment` will now fail with a
`ValidationError`. To migrate:

1. Ensure all content strings passed to `addAttachment` are valid URIs
2. Use the new `isValidUri` utility to validate strings before passing them
3. Convert plain text content to proper URI format (e.g., data URIs, IPFS URIs, or HTTP URLs)

**Compatibility Note:** Consumers relying on the previous lenient behavior that accepted non-URI strings must update
their code. The validation now strictly enforces that attachment content must be a valid URI with a recognized scheme.
