# @hypercerts-org/sdk-react

> **⚠️ Experimental Software — Not for Production Use**
>
> This SDK is experimental and under active development. It should **not** be used in production environments. For
> production use, please use the [ATProto SDK](https://github.com/bluesky-social/atproto/tree/main/packages) directly
> and the [scaffold app](https://github.com/hypercerts-org/hypercerts-app) as a reference implementation.

React hooks and components for the Hypercerts ATProto SDK.

```bash
pnpm add @hypercerts-org/sdk-react @hypercerts-org/sdk-core @tanstack/react-query
```

## Entrypoints

```
@hypercerts-org/sdk-react
├── /              → Factory, Provider, hooks, types
└── /testing       → TestProvider, mocks, createMockATProtoReact
```

## Type System

Types are inherited from `@hypercerts-org/sdk-core` (which re-exports from `@hypercerts-org/lexicon`):

```typescript
import type {
  HypercertClaim, // Base claim type from lexicon
  HypercertCollection,
  CreateHypercertParams,
  Session,
} from "@hypercerts-org/sdk-react";

// The Hypercert type extends HypercertClaim with ATProto metadata
import type { Hypercert } from "@hypercerts-org/sdk-react";
// Hypercert = HypercertClaim & { uri: string; cid: string }
```

## Usage

```typescript
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { QueryClientProvider } from "@tanstack/react-query";

// 1. Create instance (typically in providers.ts)
const atproto = createATProtoReact({
  config: {
    oauth: {
      clientId: "https://your-app.com/client-metadata.json",
      redirectUri: "https://your-app.com/callback",
      scope: "atproto",
      jwksUri: "https://your-app.com/jwks.json",
      jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
    },
  },
});

// 2. Export hooks
export const { Provider, queryClient, useAuth, useProfile, useOrganizations, useHypercerts } = atproto;

// 3. Wrap app with QueryClientProvider
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <MyApp />
      </Provider>
    </QueryClientProvider>
  );
}

// 4. Use hooks in components
function AuthButton() {
  const { status, login, logout } = useAuth();

  if (status === "authenticated") {
    return <button onClick={logout}>Logout</button>;
  }
  return <button onClick={() => login("user.bsky.social")}>Login</button>;
}
```

## Integration with Wagmi / Existing React Query

Share a single QueryClient for unified caching:

```typescript
const queryClient = new QueryClient();
const atproto = createATProtoReact({ config, queryClient });

<QueryClientProvider client={queryClient}>
  <WagmiProvider config={wagmiConfig}>
    <atproto.Provider>
      <App />
    </atproto.Provider>
  </WagmiProvider>
</QueryClientProvider>;
```

## Hooks API

```
useAuth()              → session, status, login, logout, refresh
useProfile(did?)       → profile, save, isSaving, isLoading
useRepository(opts?)   → repository, isSDS, serverUrl
useOrganizations()     → organizations, create (SDS only)
useOrganization(did)   → organization (SDS only)
useCollaborators(did)  → collaborators, grant, revoke (SDS only)
useHypercerts(did?)    → hypercerts, create, fetchNextPage
useHypercert(uri)      → hypercert, update, remove
```

### useProfile

The `useProfile` hook manages Certified profile data using an upsert pattern:

```typescript
function ProfileEditor() {
  const { profile, save, isSaving, isLoading } = useProfile();

  // Profile may be null if user hasn't created one yet
  if (isLoading) return <div>Loading...</div>;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      save({
        displayName: "Alice",
        description: "Climate researcher",
        pronouns: "she/her",
        website: "https://alice.com",
      });
    }}>
      <input defaultValue={profile?.displayName ?? ""} />
      <button type="submit" disabled={isSaving}>
        {profile ? "Update" : "Create"} Profile
      </button>
    </form>
  );
}
```

**Key features:**

- Returns `null` when profile doesn't exist (not an error)
- `save()` uses upsert pattern (creates if missing, updates if exists)
- Automatically invalidates profile cache on save
- Handles blob uploads for avatar/banner

## Query Keys

For manual cache management:

```typescript
import { atprotoKeys } from "@hypercerts-org/sdk-react";

// Invalidate all hypercerts
queryClient.invalidateQueries({ queryKey: atprotoKeys.allHypercerts() });

// Invalidate specific profile
queryClient.invalidateQueries({ queryKey: atprotoKeys.profile(did) });
```

## Testing

```typescript
import { TestProvider, createMockSession } from "@hypercerts-org/sdk-react/testing";

test("renders profile", () => {
  render(
    <TestProvider mockSession={createMockSession({ handle: "test.bsky.social" })}>
      <ProfileComponent />
    </TestProvider>,
  );
});
```

## Development

```bash
pnpm build          # Build
pnpm typecheck      # Type check
pnpm lint           # Lint
```
