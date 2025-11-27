# @hypercerts-org/sdk-core

Framework-agnostic ATProto SDK for Hypercerts.

```bash
pnpm add @hypercerts-org/sdk-core
```

## Entrypoints

```
@hypercerts-org/sdk-core
├── /              → Full SDK (createATProtoSDK, Repository, types, errors)
├── /types         → TypeScript types (re-exported from @hypercerts-org/lexicon)
├── /errors        → Error classes
├── /lexicons      → LexiconRegistry, HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS
├── /storage       → InMemorySessionStore, InMemoryStateStore
└── /testing       → createMockSession, MockSessionStore
```

## Type System

Types are generated from ATProto lexicon definitions in `@hypercerts-org/lexicon` and re-exported with friendly aliases:

| Lexicon Type | SDK Alias |
|--------------|-----------|
| `OrgHypercertsClaim.Main` | `HypercertClaim` |
| `OrgHypercertsClaimRights.Main` | `HypercertRights` |
| `OrgHypercertsClaimContribution.Main` | `HypercertContribution` |
| `OrgHypercertsClaimMeasurement.Main` | `HypercertMeasurement` |
| `OrgHypercertsClaimEvaluation.Main` | `HypercertEvaluation` |
| `OrgHypercertsCollection.Main` | `HypercertCollection` |
| `AppCertifiedLocation.Main` | `HypercertLocation` |

```typescript
import type { HypercertClaim, HypercertRights } from "@hypercerts-org/sdk-core";

// For validation functions, import the namespaced types
import { OrgHypercertsClaim } from "@hypercerts-org/sdk-core";

if (OrgHypercertsClaim.isRecord(data)) {
  // data is typed as HypercertClaim
}
```

## Usage

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

// 1. Create SDK instance
const sdk = createATProtoSDK({
  oauth: {
    clientId: "https://your-app.com/client-metadata.json",
    redirectUri: "https://your-app.com/callback",
    scope: "atproto",
    jwksUri: "https://your-app.com/jwks.json",
    jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
  },
});

// 2. Start OAuth flow → redirect user to authUrl
const authUrl = await sdk.authorize("user.bsky.social");

// 3. Handle callback at redirectUri → exchange code for session
const session = await sdk.callback(params); // params from callback URL

// 4. Use session to interact with repositories
const repo = sdk.getRepository(session);
await repo.hypercerts.create({ title: "My Hypercert", ... });

// For returning users, restore session by DID
const existingSession = await sdk.restoreSession("did:plc:...");
```

## Repository API

```
repo
├── .records      → create, get, update, delete, list
├── .blobs        → upload, get
├── .profile      → get, update
├── .hypercerts   → create, get, update, delete, list, addContribution, addMeasurement
├── .collaborators → grant, revoke, list, hasAccess (SDS only)
└── .organizations → create, get, list (SDS only)
```

## Errors

```typescript
import { ValidationError, NetworkError, AuthenticationError } from "@hypercerts-org/sdk-core/errors";
```

## Development

```bash
pnpm build          # Build
pnpm test           # Test
pnpm test:coverage  # Coverage
```
