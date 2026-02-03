---
"@hypercerts-org/sdk-core": minor
---

Auto-detect user's PDS URL from OAuth session instead of requiring static configuration

**Breaking Changes:**

- `servers.pds` config option has been removed. The user's PDS URL is now automatically detected from the OAuth
  session's token info (`tokenInfo.aud`) during `callback()` and `restoreSession()`. This means the SDK correctly routes
  operations to each user's actual PDS regardless of which server they're hosted on.
- A new `handleResolver` config option replaces `servers.pds` for its handle resolution role during OAuth authorization.
  This is optional — if omitted, DNS-based resolution is used.
- `getAccountEmail()` no longer requires `servers.pds` to be configured, since it uses the session's fetch handler which
  internally routes to the correct PDS.
- `sdk.repository()` is now async (returns `Promise<Repository>`). On cache miss it automatically resolves the PDS from
  the session's token info, so callers no longer need to manually call `resolveSessionPds()` first.

**New APIs:**

- `sdk.resolveSessionPds(session)` — Manually resolve and cache a session's PDS URL. Useful for pre-warming the cache or
  for sessions created outside the SDK's auth flow.

**Migration:**

```typescript
// Before
const sdk = createATProtoSDK({
  oauth: { ... },
  servers: { pds: "https://bsky.social", sds: "https://sds.example.com" },
});

// After
const sdk = createATProtoSDK({
  oauth: { ... },
  handleResolver: "https://bsky.social", // optional, for handle resolution only
  servers: { sds: "https://sds.example.com" },
});
```
