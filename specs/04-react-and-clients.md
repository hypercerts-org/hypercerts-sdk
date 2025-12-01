# React & Client Interface Specification

## Scope

- Define the React-specific provider + hooks exposed by the SDK.
- Document non-React helpers (server actions, job workers) that share the same interfaces.
- Ensure APIs provide concise, discriminated status enums and SSR safety.

## React Provider

- `ATProtoAuthProvider` wraps children with SDK context.
- Props:
  - `sdk?: ATProtoSDK` (optional; default builder if omitted)
  - `initialSession?: Session | null`
  - `children: React.ReactNode`
- Responsibilities:
  - Ensure SDK instance is memoized.
  - Hydrate session state on mount, including SSR-safe guards.
  - Provide event bridge so session changes propagate to all hooks.

## Hooks

### `useATProtoSDK`

Returns the context-bound SDK instance. Throws descriptive error if provider is missing.

```typescript
function useATProtoSDK(): ATProtoSDK;
```

### `useATProtoAuth`

Consolidated auth hook providing session data, auth status, and all auth actions.

**Design Decision**: Merged session management into `useAuth` to avoid confusion about which hook to use.

```typescript
type AuthStatus = "idle" | "authorizing" | "authenticated" | "error";

interface UseAuthResult {
  // Session data
  session: Session | null;
  status: AuthStatus;
  error: Error | null;
  isValid: boolean;              // Whether session is valid and not expired
  
  // Actions
  login(identifier: string, redirectUrl?: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;      // Force refresh session from storage/server
  
  // Loading states
  isLoading: boolean;            // Any auth operation in progress
}
```

**Usage**:

```typescript
function AuthButton() {
  const { status, session, login, logout } = useAuth();
  
  switch (status) {
    case "idle":
      return <Button onClick={() => login("bsky.social")}>Sign in</Button>;
    case "authorizing":
      return <Button disabled>Signing in...</Button>;
    case "authenticated":
      return <Button onClick={logout}>Sign out ({session.handle})</Button>;
    case "error":
      return <Button onClick={() => login("bsky.social")}>Retry</Button>;
  }
}
```

### `useRepository`

Low-level escape hatch for direct repository access. Most apps should use domain hooks instead.

```typescript
interface UseRepositoryOptions {
  repoDid?: string;           // Defaults to session DID
  server?: "pds" | "sds";     // Force server type
  serverUrl?: string;         // Force specific URL (overrides server)
}

interface UseRepositoryResult {
  repository: Repository | null;
  status: "idle" | "loading" | "ready" | "error";
  error: Error | null;
  isSDS: boolean;
  serverUrl: string | null;
}
```

### `useProfile`

Profile read + write combined in a single hook.

```typescript
interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  
  update(params: ProfileUpdate): Promise<void>;
  isUpdating: boolean;
  
  refetch(): Promise<void>;
}
```

**Usage**:

```typescript
function ProfileEditor() {
  const { profile, update, isUpdating } = useProfile();
  
  return (
    <form onSubmit={() => update({ displayName: newName })}>
      <input defaultValue={profile?.displayName} />
      <button disabled={isUpdating}>Save</button>
    </form>
  );
}
```

### `useOrganizations` / `useOrganization`

SDS organization management with both list and singular variants.

```typescript
// List + create
interface UseOrganizationsResult {
  organizations: Organization[];
  isLoading: boolean;
  error: Error | null;
  
  create(params: CreateOrgParams): Promise<Organization>;
  isCreating: boolean;
  
  refetch(): Promise<void>;
}

// Singular
interface UseOrganizationResult {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  refetch(): Promise<void>;
}
```

### `useCollaborators`

Collaborator management for SDS repositories. Throws `SDSRequiredError` if used on PDS.

```typescript
interface UseCollaboratorsResult {
  collaborators: Collaborator[];
  isLoading: boolean;
  error: Error | null;
  
  grant(params: GrantParams): Promise<void>;
  revoke(userDid: string): Promise<void>;
  isGranting: boolean;
  isRevoking: boolean;
  
  refetch(): Promise<void>;
}
```

### `useHypercerts` / `useHypercert`

Hypercert operations with both list and singular variants.

```typescript
// List + create (with pagination)
interface UseHypercertsResult {
  hypercerts: Hypercert[];
  isLoading: boolean;
  error: Error | null;
  
  create(params: CreateHypercertParams): Promise<CreateResult>;
  isCreating: boolean;
  
  hasNextPage: boolean;
  fetchNextPage(): Promise<void>;
  
  refetch(): Promise<void>;
}

// Singular (for detail view with update/delete)
interface UseHypercertResult {
  hypercert: Hypercert | null;
  isLoading: boolean;
  error: Error | null;
  
  update(params: UpdateHypercertParams): Promise<void>;
  remove(): Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  
  refetch(): Promise<void>;
}
```

**Usage**:

```typescript
// List view
function HypercertList({ orgDid }) {
  const { hypercerts, create, hasNextPage, fetchNextPage } = useHypercerts(orgDid);
  // ...
}

// Detail view
function HypercertDetail({ uri }) {
  const { hypercert, update, remove, isDeleting } = useHypercert(uri);
  // ...
}
```

## Non-React Usage (Server Actions, Job Workers)

Server Actions and background jobs don't need React hooks or special helpers - they use `sdk-core` directly:

```typescript
// Server Action example
"use server";
import { createATProtoSDK } from "@hypercerts-org/sdk-core";
import { cookies } from "next/headers";

export async function createHypercert(data: FormData) {
  const sdk = createATProtoSDK(config);
  const sessionDid = cookies().get("atproto-session")?.value;
  const session = await sdk.restoreSession(sessionDid);
  const repo = sdk.repository(session);
  return repo.hypercerts.create({ ... });
}

// Job worker example
async function processJob(userDid: string) {
  const sdk = createATProtoSDK(config);
  const session = await sdk.restoreSession(userDid);
  // ... do work
}
```

No special wrappers needed - the core SDK handles these contexts directly.

## Type Safety & Tooling

- Hooks export precise TypeScript types; no `any`.
- Provide JSDoc/TSDoc comments so Typedoc generates accurate docs.
- Keep React as an optional peer dependency to avoid bloating non-React consumers.
