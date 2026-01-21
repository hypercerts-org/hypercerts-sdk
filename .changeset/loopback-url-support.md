---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": patch
---

feat: add HTTP loopback URL support for local development

Enable local development and testing with HTTP loopback URLs (`http://localhost`, `http://127.0.0.1`, `http://[::1]`)
while maintaining security for production deployments.

**Configuration Updates**

- Custom URL validator accepting HTTPS URLs or HTTP loopback addresses
- Update `OAuthConfigSchema` to allow loopback URLs for `clientId`, `redirectUri`, `jwksUri`
- Add optional `developmentMode` boolean flag to suppress warnings
- Update `ServerConfigSchema` to allow loopback URLs for PDS/SDS servers
- Export `isLoopbackUrl()` helper function and TypeScript types (`LoopbackUrl`, `HttpsUrl`,
  `DevelopmentOrProductionUrl`)

**Development Mode Features**

- Automatic loopback detection with informative logging
- Warning when using loopback URLs without explicit `developmentMode` flag
- Info logs indicating development mode is active
- Clear guidance about authorization server requirements

**Testing**

- 28 new unit tests for loopback URL validation
- Tests cover localhost, 127.0.0.1, and [::1] (IPv6) loopback addresses
- Tests verify rejection of non-loopback HTTP URLs
- Tests ensure HTTPS URLs always accepted

**Documentation**

- Comprehensive local development guide in Core SDK README
- NextJS App Router example with loopback configuration
- API route setup examples (OAuth callback, JWKS endpoint)
- Important notes about authorization server support and production safety
- Local development example added to React SDK factory JSDoc

**Breaking Changes**: None - fully backward compatible

**Migration**: No migration needed for existing configurations. Existing HTTPS URLs continue to work without changes.

This feature enables developers to test the SDK locally without requiring HTTPS certificates, while the underlying
`@atproto/oauth-client-node` library handles loopback OAuth flows per the AT Protocol specification.
