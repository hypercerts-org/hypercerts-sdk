---
"@hypercerts-org/sdk-core": minor
---

Auto-generate `scope` and `redirect_uri` query params in `client_id` for localhost development

When `clientId` is any loopback URL (detected via `isLoopbackUrl` — covers `http://localhost`, `http://127.0.0.1`,
`http://[::1]`, with or without port/path/query params), the SDK now takes over completely: it builds
`http://localhost?scope=<your configured scope>&redirect_uri=<your configured redirectUri>` and uses that as the
`client_id`. This is required by the AT Protocol OAuth spec for loopback clients, which embed these parameters directly
in the `client_id` URL rather than hosting a metadata document.

Previously, developers had to manually construct this URL:

```typescript
// Before
const scope = "atproto transition:generic";
const redirectUri = "http://127.0.0.1:3000/api/auth/callback";
const sdk = createATProtoSDK({
  oauth: {
    clientId: `http://localhost?scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    redirectUri,
    scope,
    // ...
  },
});
```

Now `clientId: "http://localhost"` is sufficient:

```typescript
// After
const sdk = createATProtoSDK({
  oauth: {
    clientId: "http://localhost",
    redirectUri: "http://127.0.0.1:3000/api/auth/callback",
    scope: "atproto transition:generic",
    // ...
  },
});
```

**Behaviour details:**

- Triggers for any loopback URL: `http://localhost`, `http://localhost:3000`, `http://127.0.0.1:8080`, etc.
- Always rewrites to `http://localhost` with auto-generated query params (AT Protocol spec requires this exact format)
- Scope is taken from `oauth.scope` in your config and embedded in the `client_id` URL and metadata body
- `redirect_uri` in the generated `client_id` is taken from `oauth.redirectUri` in your config
- A warning is logged if the original `clientId` had to be rewritten (e.g. from `http://127.0.0.1:3000`)
- Non-loopback `clientId` values (HTTPS production URLs, ngrok, etc.) are completely unaffected
