# ATProto SDK Implementation Plan

## Overview

This document outlines the plan to extract ATProto-related code from the Ma Earth application into a reusable SDK
abstraction. The SDK will provide a clean, framework-agnostic interface for ATProto authentication, record management,
and lexicon handling.

## Goals

1. **Extract ATProto functionality** into a reusable SDK
2. **Maintain framework-agnostic design** - works with Next.js, Express, Hono, etc.
3. **Keep SDK lightweight** - no unnecessary dependencies
4. **Provide clear interfaces** - easy to implement for any stack
5. **Support both PDS and SDS** - Personal Data Server and Shared Data Server operations
6. **Embed coding best practices** - type-safe APIs, linted/format-checked code, comprehensive tests, and documented
   contracts

## Architecture Decisions

### Core Principle: Interfaces Over Adapters

**Decision**: The SDK will provide **interfaces only**, not concrete adapter implementations.

**Rationale**:

- Storage interfaces (`SessionStore`, `StateStore`) are trivial (3 methods each)
- Users can implement them in ~20 lines with any storage backend
- Avoids dependency bloat (no need to support Drizzle, Prisma, TypeORM, Redis, etc.)
- Provides maximum flexibility for custom implementations
- Reduces maintenance burden

**What the SDK provides**:

- ✅ Clean TypeScript interfaces
- ✅ Core SDK functionality
- ✅ Documentation with examples
- ❌ No concrete adapter implementations (examples only)

### Framework Routes: Helpers, Not Adapters

<!---->

**Decision**: SDK provides framework-agnostic utilities; users build their own routes.

**Rationale**:

- OAuth flow is simple: `authorize()` returns URL, `callback()` processes params
- Each framework has different route handler patterns
- Users may need custom logic (user creation, redirects, etc.)
- Keeps SDK focused on ATProto, not framework specifics

### Package Split: Core SDK + React Package

**Decision**: Split into two packages: `@certified/sdk-core` (core) and `@certified/sdk-react` (React integration).

**Rationale**:

- **True framework-agnostic**: Core SDK has zero React dependencies, works in Node.js, Deno, Bun, Edge runtimes
- **Smaller bundles**: Non-React users don't pay for React code
- **Better tree-shaking**: Bundlers can eliminate React entirely if not used
- **Clear separation**: Core is pure TypeScript; React package is a thin wrapper
- **Industry pattern**: Follows best practices (like `@tanstack/query` + `@tanstack/react-query`)
- **Future-proof**: Can add Vue/Svelte packages later without bloating core

**Package Structure**:

- `@certified/sdk-core`: Core SDK with OAuth, repository operations, services, lexicons (no React)
- `@certified/sdk-react`: React hooks and components that import `@certified/sdk-core`

### Separation: SDK vs App-Specific Logic

**CRITICAL DISTINCTION**: The SDK abstracts **ATProto protocol operations**, not application-specific business logic.

**✅ IN SDK** (ATProto protocol operations):

- OAuth flow (authorization, callback, session management)
- PDS operations (profiles, records, blobs)
- SDS operations (organizations, collaborators, records)
- Lexicon registration and validation
- DPoP-bound token management

**❌ NOT IN SDK** (application-specific):

- Ma Earth's hierarchical claims system (org→project→site)
- Application-specific permission inheritance rules
- Custom authorization middleware
- User creation/management in app database
- App-specific caching strategies

**Instead, the SDK provides**:

- Clean interfaces and patterns for building custom permission systems
- Hooks for integrating app-specific authorization
- Examples showing how to build claims systems on top

### Coding Best Practices (Always On)

- **Type Safety**: Strict TypeScript configuration (`"strict": true`) with no `any` usage unless explicitly narrowed;
  public APIs carry precise generics and discriminated unions where appropriate.
- **Documentation**: All exported classes/functions include TSDoc comments so Typedoc can generate accurate references;
  README + AGENTS explain high-level usage and automation guidance.
- **Lint & Format**: ESLint (flat config) and Prettier enforced via pnpm scripts/husky to keep code style consistent
  across Node 18+ environments.
- **Testing Discipline**: Vitest coverage thresholds for core modules (auth, record services) plus contract tests for
  SessionStore/StateStore implementations to guarantee compatibility.
- **Error Handling & Logging**: Standard error classes with descriptive messages; never leak secrets. Provide structured
  logging hooks for host apps.
- **Release Hygiene**: Semantic versioning, changelog entries, and automated CI checks (lint/test/build) before
  publishing.

## Mental Model: PDS vs SDS

### PDS (Personal Data Server)

- **Native ATProto**: Standard protocol implementation
- **Single-user repositories**: One DID = one owner
- **Operations**: Create/read/update/delete records, upload blobs, manage profile

### SDS (Shared Data Server)

- **Extension of PDS**: Adds RBAC (Role-Based Access Control)
- **Multi-user repositories**: One DID = multiple collaborators
- **Operations**: All PDS operations + collaborator management (grant/revoke access)

### Key Principle

Both PDS and SDS are **repository servers**. The SDK provides a **unified repository interface** with SDS-specific
extensions for collaboration.

## Package Structure

The SDK is split into two packages for clear separation between core functionality and React integration:

### Core SDK (`@certified/sdk-core`)

```
packages/certified-sdk/
├── src/
│   ├── core/
│   │   ├── types.ts                    # Core types (DID, Session, Repository, etc.)
│   │   ├── interfaces.ts               # SessionStore, StateStore, Cache interfaces
│   │   ├── config.ts                   # Configuration interface
│   │   ├── errors.ts                   # SDK-specific errors
│   │   └── SDK.ts                      # Main SDK class
│   │
│   ├── auth/
│   │   ├── OAuthClient.ts              # OAuth client abstraction
│   │   └── AuthService.ts              # High-level auth service
│   │
│   ├── repository/
│   │   ├── RepositoryClient.ts         # Base repository client (works with PDS/SDS)
│   │   ├── RecordManager.ts            # Record CRUD operations
│   │   ├── BlobManager.ts              # Blob upload/download
│   │   ├── ProfileManager.ts           # Profile operations
│   │   └── CollaboratorManager.ts      # SDS-only: collaborator RBAC
│   │
│   ├── services/
│   │   ├── hypercerts/                 # HypercertService
│   │   ├── repository/                 # RepositoryAccessService
│   │   ├── sds/                        # SdsOrganizationService
│   │   └── workflows/                  # Workflow coordinators
│   │
│   ├── lexicons/
│   │   ├── hypercerts/                 # Hypercert lexicons
│   │   └── sds/                        # SDS-specific lexicons (RBAC)
│   │
│   └── index.ts                        # Main SDK export (no React)
│
├── docs/
│   ├── README.md                       # Human-friendly overview
│   ├── AGENTS.md                       # Expectations for automation/agents
│   └── examples/
│       ├── drizzle-session-store.ts    # Example Drizzle implementation
│       ├── redis-session-store.ts      # Example Redis implementation
│       ├── nextjs-routes.ts            # Example Next.js routes
│       ├── pds-repository.ts           # Example PDS usage
│       ├── sds-repository.ts           # Example SDS usage with RBAC
│       ├── custom-claims-system.ts     # Example claims system on SDK
│       └── express-routes.ts           # Example Express routes
│
└── tests/
    ├── unit/                           # Unit tests
    ├── integration/                    # Integration tests
    └── fixtures/                       # Shared test fixtures
```

### React Package (`@certified/sdk-react`)

```
packages/certified-sdk-react/
├── src/
│   ├── hooks/
│   │   ├── useATProtoAuth.ts           # Auth hook w/ redirects & status
│   │   ├── useATProtoSession.ts        # Session hook (DPoP aware)
│   │   ├── useRepository.ts            # Repository operations hook
│   │   └── useCollaborators.ts         # SDS collaborators hook
│   │
│   ├── components/
│   │   ├── ATProtoLoginButton.tsx      # Simple login button
│   │   └── ATProtoAuthProvider.tsx     # Context provider + SSR hydration
│   │
│   └── index.ts                        # React exports
│
├── package.json                        # Depends on @certified/sdk-core + React peer
└── README.md                           # React-specific documentation
```

**Key Points**:

- Core SDK (`@certified/sdk-core`) has **zero React dependencies** - works in any JavaScript runtime
- React package (`@certified/sdk-react`) imports and wraps core SDK functionality
- Both packages are versioned together (same monorepo, coordinated releases)
- Users install `@certified/sdk-core` for server-side/Node.js usage
- Users install `@certified/sdk-react` for React applications

## Specification Index

All detailed specs now live under `packages/certified-sdk/specs/` so we can iterate in focused chunks:

1. **Core & Auth** – `specs/01-core-and-auth.md`  
   Contracts for configuration, session/state/cache stores, SDK builder, OAuth flow, shared errors, and telemetry hooks.

2. **Repository & Lexicons** – `specs/02-repository-and-lexicons.md`  
   Unified repository client across PDS/SDS, record/blob/profile managers, collaborator handling, SDS repository
   lifecycle, lexicon registry.

3. **Domain Services & Workflows** – `specs/03-domain-services-and-workflows.md`  
   HypercertService, RepositoryAccessService, SDS organization helpers, workflow coordinators, event hooks.

4. **React & Client Interfaces** – `specs/04-react-and-clients.md`  
   React provider, hooks (`useATProtoAuth`, `useRepository`, etc.), and non-React helper clients for server actions/job
   workers.

5. **Tooling, Docs & Testing** – `specs/05-tooling-docs-testing.md`  
   Build pipeline, documentation structure, testing matrix, CI expectations, and release hygiene.

Use this plan for shared principles, sequencing, and cross-cutting concerns; reference the spec files above for
implementation details.

## Implementation Phases

### Phase 1: Extract Core Abstractions ✅

**Goal**: Create interfaces and core types  
**Spec Reference**: `specs/01-core-and-auth.md`

**Tasks**:

- [x] Create `core/types.ts` with core types (DID, Session, Organization, Collaborator)
- [x] Create `core/interfaces.ts` with SessionStore, StateStore, Cache interfaces
- [x] Create `core/config.ts` with configuration interface
- [x] Create `core/errors.ts` with SDK-specific error classes
- [x] Extract types from existing codebase
- [x] Add Zod schemas for runtime validation
- [x] Set up test suite with Vitest
- [x] Configure Rollup build for dual CJS/ESM output

**Files to extract from**:

- `src/lib/atproto-session-store.ts` → SessionStore interface
- `src/lib/atproto-server-client.ts` → Types and config
- `src/lib/atproto-config.ts` → Config interface
- `src/lib/sds/sds-client.ts` → Repository and Collaborator types

### Phase 2: Build Core SDK ✅

**Goal**: Implement main SDK class and OAuth client  
**Spec Reference**: `specs/01-core-and-auth.md`

**Tasks**:

- [x] Create `auth/OAuthClient.ts` - Extract OAuth logic with DPoP handling
- [x] Create `core/SDK.ts` - Main SDK class
- [x] Implement `authorize()` method
- [x] Implement `callback()` method
- [x] Implement `restoreSession()` method (with automatic token refresh)
- [x] Implement `revokeSession()` method
- [x] Add timeout configuration for PDS metadata requests
- [x] Make storage optional with in-memory defaults
- [x] Add comprehensive test suite (38 tests)

**Files to extract from**:

- `src/lib/atproto-server-client.ts` → OAuth client logic, DPoP handling
- `src/app/api/auth/atproto/authorize/route.ts` → Authorization flow
- `src/app/api/auth/atproto/callback/route.ts` → Callback processing

**Key Features**:

- Automatic token refresh via `restore()` - sessions transparently refresh when expired
- DPoP-bound access tokens for security
- Configurable timeouts for slow PDS servers

**Note**: The spec (`specs/01-core-and-auth.md`) shows additional SDK methods that belong to later phases:

- `getRepository()` → Phase 3 (Repository Layer)
- `registerLexicons()` / `validateRecord()` → Phase 6 (Lexicon Management)
- `events` (SDKEventEmitter) → Optional telemetry (not required for Phase 2)

### Phase 3: Build Repository Layer ✅

**Goal**: Create unified repository client for PDS and SDS  
**Spec Reference**: `specs/02-repository-and-lexicons.md`

**Tasks**:

- [ ] Create `repository/RepositoryClient.ts` - Unified repository client
- [ ] Create `repository/RecordManager.ts` - Record CRUD (works with both PDS/SDS)
- [ ] Create `repository/BlobManager.ts` - Blob operations (works with both PDS/SDS)
- [ ] Create `repository/ProfileManager.ts` - Profile operations (works with both PDS/SDS)
- [ ] Create `repository/CollaboratorManager.ts` - SDS-only RBAC operations
- [ ] Extract Agent initialization logic
- [ ] Extract DPoP fetch handler logic
- [ ] Implement lexicon registration

**Files to extract from**:

- `src/lib/sds/sds-client.ts` → Repository operations, collaborator RBAC
- `src/services/ATProtoService.ts` → Profile and record patterns

**Key Features**:

- Single `RepositoryClient` works with both PDS and SDS
- Determined by server URL, not client type
- Consistent method signatures across PDS/SDS
- SDS-only operations (collaborators) throw clear errors on PDS
- DPoP-bound session.fetchHandler for all operations

### Phase 4: Build SDS Extensions ✅

**Goal**: Add SDS-specific repository creation and discovery  
**Spec Reference**: `specs/02-repository-and-lexicons.md`

**Tasks**:

- [x] Add SDS repository creation operations
- [x] Add SDS repository listing operations
- [x] Implement server type detection (PDS vs SDS)
- [x] Add clear error messages when SDS operations used on PDS
- [x] Integrate SdsRepositoryManager into RepositoryClient
- [x] Add comprehensive test suite (10 tests)

**Files to extract from**:

- `src/lib/sds/sds-client.ts` → Repository creation, listing
- `src/services/ATProtoService.ts` → Service methods

**Key Features**:

- Create shared repositories on SDS
- List repositories user has access to
- Clear distinction between PDS (personal) and SDS (shared) repos
- Optional caching with configurable TTL

### Phase 5: Domain Services & Claims Workflow ✅

**Goal**: Encapsulate complex business flows (hypercerts, claims, SDS org operations) within reusable services.  
**Spec Reference**: `specs/03-domain-services-and-workflows.md`

**Tasks**:

- [x] Implement `HypercertService` with helpers for create/update/list workflows, evidence attachment, and lexicon
      coordination.
- [x] Implement `RepositoryAccessService` that wraps collaborator manager + exposes normalized permission DTOs.
- [x] Implement `SdsOrganizationService` for repository lifecycle (create/list/describe).
- [x] Add workflow coordinators (e.g., `HypercertCreationFlow`, `SdsCollaborationFlow`) with event emitters.
- [x] Wire services into `ATProtoSDK` (`sdk.hypercerts`, `sdk.claims`, `sdk.sdsOrganizations`).
- [x] Document service APIs via TSDoc and README how-to guides.

**Files to extract or reference**:

- `src/services/ATProtoService.ts` → Existing hypercert + collaborator flows.
- `src/lib/sds/sds-client.ts` → SDS organization helpers.
- `src/components/hypercerts/*` → Form/business logic to inform workflow steps.

### Phase 6: Lexicon Management ✅

**Goal**: Extract lexicon registry and validation  
**Spec Reference**: `specs/02-repository-and-lexicons.md`

**Tasks**:

- [x] Create lexicon registry with validation (`repository/LexiconRegistry.ts`)
- [x] Integrate validation utilities into registry (no separate validator.ts needed)
- [x] Move hypercert lexicons to `lexicons/hypercerts/`
- [x] Implement lexicon registration with Agent (`addToAgent()` method)
- [x] Add validation error messages (`ValidationResult` interface)
- [ ] Move SDS lexicons to `lexicons/sds/` (deferred until app migration - see Phase 10)

**Files to extract from**:

- `src/lib/hypercerts/lexicons.ts` → Lexicon definitions ✅
- `src/lib/sds/sds-lexicons.ts` → SDS lexicons (will be moved during migration)
- `src/lib/atproto/lexicon/*.json` → Lexicon JSON files

**Note**: SDS lexicons will be moved to `packages/certified-sdk/src/lexicons/sds/` during app migration (Phase 10) to
avoid breaking changes before the SDK is integrated.

### Phase 7: React Integration Package (Hybrid + Query Pattern)

**Goal**: Create separate React package with factory pattern, React Query integration, and SSR support  
**Spec Reference**: `specs/04-react-and-clients.md`

**Architecture Pattern**: Hybrid Factory + React Query Integration

This pattern is battle-tested by Wagmi v2, tRPC, and similar libraries. Key benefits:

- Factory function creates isolated instances (SSR-safe, testable)
- React Query integration for caching, loading states, and mutations
- Exposed query/mutation options for advanced usage
- Cross-tab session synchronization

#### Phase 7.1: Package Setup & Factory Foundation

**Tasks**:

- [ ] Create `packages/sdk-react/` package structure
- [ ] Set up `package.json` with peer dependencies:
  - `@hypercerts-org/sdk-core`
  - `@tanstack/react-query` (^5.0.0)
  - `react` (^18.0.0 || ^19.0.0)
- [ ] Configure Rollup build with multiple entrypoints (main, testing)
- [ ] Create factory function `createATProtoReact(options)`
- [ ] Create React context (`ATProtoContext`) for SDK instance
- [ ] Create Provider component with QueryClientProvider integration

**Factory Interface**:

```typescript
interface CreateATProtoReactOptions {
  config?: ATProtoSDKConfig;      // Creates new SDK
  sdk?: ATProtoSDK;               // Or use existing SDK
  queryClient?: QueryClient;      // Optional custom QueryClient
  initialSession?: Session | null; // SSR hydration
  syncTabs?: boolean;             // Cross-tab sync (default: true)
}

interface ATProtoReactInstance {
  sdk: ATProtoSDK;
  queryClient: QueryClient;
  Provider: React.FC<{ children: ReactNode }>;

  // ─────────────────────────────────────────────
  // Core
  // ─────────────────────────────────────────────
  useSDK: () => ATProtoSDK;

  // ─────────────────────────────────────────────
  // Auth (consolidated - no separate useSession)
  // ─────────────────────────────────────────────
  useAuth: () => UseAuthResult;

  // ─────────────────────────────────────────────
  // Profile (read + write combined)
  // ─────────────────────────────────────────────
  useProfile: (did?: string) => UseProfileResult;

  // ─────────────────────────────────────────────
  // Organizations (list + singular)
  // ─────────────────────────────────────────────
  useOrganizations: () => UseOrganizationsResult;
  useOrganization: (did: string) => UseOrganizationResult;

  // ─────────────────────────────────────────────
  // Collaborators
  // ─────────────────────────────────────────────
  useCollaborators: (repoDid: string) => UseCollaboratorsResult;

  // ─────────────────────────────────────────────
  // Hypercerts (list + singular)
  // ─────────────────────────────────────────────
  useHypercerts: (repoDid?: string) => UseHypercertsResult;
  useHypercert: (uri: string) => UseHypercertResult;

  // ─────────────────────────────────────────────
  // Low-level (escape hatch)
  // ─────────────────────────────────────────────
  useRepository: (opts?: UseRepositoryOptions) => UseRepositoryResult;

  // ─────────────────────────────────────────────
  // Advanced usage
  // ─────────────────────────────────────────────
  queryKeys: typeof atprotoKeys;  // Exposed for manual invalidation
  queryOptions: { ... };
  mutationOptions: { ... };
}
```

#### Phase 7.2: Query Infrastructure

**Tasks**:

- [ ] Create query key factory (`queries/keys.ts`)
- [ ] Create session query/mutation options (`queries/session.ts`)
- [ ] Create profile query/mutation options (`queries/profile.ts`)
- [ ] Create repository query options (`queries/repository.ts`)
- [ ] Create organizations query options (`queries/organizations.ts`)
- [ ] Create collaborators query options (`queries/collaborators.ts`)
- [ ] Create hypercerts query options (`queries/hypercerts.ts`)

**Query Key Structure**:

```typescript
const atprotoKeys = {
  all: ["atproto"] as const,
  session: () => [...atprotoKeys.all, "session"] as const,
  sessionByDid: (did: string) => [...atprotoKeys.session(), did] as const,
  profiles: () => [...atprotoKeys.all, "profile"] as const,
  profile: (did: string) => [...atprotoKeys.profiles(), did] as const,
  server: (did: string) => [...atprotoKeys.all, "server", did] as const,
  organizations: () => [...atprotoKeys.all, "organizations"] as const,
  collaborators: (repoDid: string) => [...atprotoKeys.all, "collaborators", repoDid] as const,
  hypercerts: (repoDid?: string) => [...atprotoKeys.all, "hypercerts", repoDid ?? "all"] as const,
  hypercert: (uri: string) => [...atprotoKeys.all, "hypercert", uri] as const,
};
```

#### Phase 7.3: Auth Hook

**Tasks**:

- [ ] Create `useATProtoSDK()` - Access SDK from context
- [ ] Create `useATProtoAuth()` - Consolidated auth state with discriminated status

**Design Decision**: Merged `useSession` into `useAuth` to avoid confusion about which hook to use. The single `useAuth`
hook provides session data, auth status, login/logout actions, and refresh capability.

**Auth Types**:

```typescript
type AuthStatus = "idle" | "authorizing" | "authenticated" | "error";

interface UseAuthResult {
  // Session data
  session: Session | null;
  status: AuthStatus;
  error: Error | null;
  isValid: boolean; // Whether session is valid and not expired

  // Actions
  login: (identifier: string, redirectUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>; // Force refresh session from storage/server

  // Loading states
  isLoading: boolean; // Any auth operation in progress
}
```

**Usage Examples**:

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

function SessionRefresh() {
  const { refresh, isValid } = useAuth();

  useEffect(() => {
    if (!isValid) refresh();
  }, [isValid, refresh]);
}
```

#### Phase 7.4: Repository Hooks with Smart Server Routing

**Tasks**:

- [ ] Create `useRepository(options)` with auto server resolution
- [ ] Create `useSDSRepository(orgDid?)` convenience hook
- [ ] Implement server resolution logic (DID → PDS/SDS)
- [ ] Add server resolution caching

**Server Resolution Strategy**:

```
Input: DID + Options
1. options.serverUrl provided? → Use that URL
2. options.server provided? → "sds" → config.servers.sds, "pds" → config.servers.pds
3. Auto-resolve by DID:
   a. Is DID a known SDS organization? → Use SDS
   b. Resolve DID document → Extract PDS endpoint
4. Cache result (1 hour TTL)
```

**Repository Hook Interface**:

```typescript
interface UseRepositoryOptions {
  repoDid?: string; // Defaults to session DID
  server?: "pds" | "sds"; // Force server type
  serverUrl?: string; // Force specific URL
}

interface UseRepositoryResult {
  repository: Repository | null;
  status: "idle" | "loading" | "ready" | "error";
  error: Error | null;
  isSDS: boolean;
  serverUrl: string | null;
}
```

#### Phase 7.5: Domain Hooks

**Tasks**:

- [ ] Create `useProfile(did?)` - Profile read + write combined
- [ ] Create `useOrganizations()` - SDS organization list + create
- [ ] Create `useOrganization(did)` - Single organization fetch
- [ ] Create `useCollaborators(repoDid)` - Collaborator management
- [ ] Create `useHypercerts(repoDid?)` - Hypercert list + create with pagination
- [ ] Create `useHypercert(uri)` - Single hypercert with update/delete

**Design Decisions**:

- Read + write combined in same hook (no separate `useProfileUpdate`)
- Both singular and plural variants for entities that need it
- Semantic property names (`profile`, `hypercerts`) not generic `data`

**Hook Interfaces**:

```typescript
// ─────────────────────────────────────────────
// Profile (read + write combined)
// ─────────────────────────────────────────────
interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;

  // Write
  update: (params: ProfileUpdate) => Promise<void>;
  isUpdating: boolean;

  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Organizations
// ─────────────────────────────────────────────
interface UseOrganizationsResult {
  organizations: Organization[];
  isLoading: boolean;
  error: Error | null;

  // Write
  create: (params: CreateOrgParams) => Promise<Organization>;
  isCreating: boolean;

  refetch: () => Promise<void>;
}

interface UseOrganizationResult {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Collaborators
// ─────────────────────────────────────────────
interface UseCollaboratorsResult {
  collaborators: Collaborator[];
  isLoading: boolean;
  error: Error | null;

  // Write
  grant: (params: GrantParams) => Promise<void>;
  revoke: (userDid: string) => Promise<void>;
  isGranting: boolean;
  isRevoking: boolean;

  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Hypercerts (list)
// ─────────────────────────────────────────────
interface UseHypercertsResult {
  hypercerts: Hypercert[];
  isLoading: boolean;
  error: Error | null;

  // Write
  create: (params: CreateHypercertParams) => Promise<CreateResult>;
  isCreating: boolean;

  // Pagination
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;

  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Hypercert (singular - for detail view)
// ─────────────────────────────────────────────
interface UseHypercertResult {
  hypercert: Hypercert | null;
  isLoading: boolean;
  error: Error | null;

  // Write
  update: (params: UpdateHypercertParams) => Promise<void>;
  remove: () => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;

  refetch: () => Promise<void>;
}
```

**Usage Examples**:

```typescript
// Profile with inline update
function ProfileEditor() {
  const { profile, update, isUpdating } = useProfile();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      update({ displayName: formData.displayName });
    }}>
      <input defaultValue={profile?.displayName} />
      <button disabled={isUpdating}>
        {isUpdating ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

// Hypercert list + detail pattern
function HypercertList({ orgDid }) {
  const { hypercerts, hasNextPage, fetchNextPage } = useHypercerts(orgDid);
  // ... render list
}

function HypercertDetail({ uri }) {
  const { hypercert, update, remove, isDeleting } = useHypercert(uri);
  // ... render detail with edit/delete actions
}
```

#### Phase 7.6: SSR Support

**Tasks**:

- [ ] Create `createSSRHelpers(sdk, queryClient)` utility
- [ ] Implement session prefetching for server components
- [ ] Implement profile prefetching
- [ ] Add dehydration/hydration support
- [ ] Create `ATProtoProviderProps` with `dehydratedState` support
- [ ] Document Next.js App Router integration

**SSR Helpers**:

```typescript
interface SSRHelpers {
  prefetchSession: (did: string) => Promise<void>;
  prefetchProfile: (did: string) => Promise<void>;
  getDehydratedState: () => unknown;
}

// Usage in Next.js App Router
export default async function RootLayout({ children }) {
  const atproto = createATProtoReact({ config });
  const ssr = createSSRHelpers(atproto.sdk, atproto.queryClient);

  const sessionDid = cookies().get("atproto-session")?.value;
  if (sessionDid) {
    await ssr.prefetchSession(sessionDid);
    await ssr.prefetchProfile(sessionDid);
  }

  return (
    <atproto.Provider dehydratedState={ssr.getDehydratedState()}>
      {children}
    </atproto.Provider>
  );
}
```

#### Phase 7.7: Cross-Tab Synchronization

**Tasks**:

- [ ] Create `useSessionSync(enabled)` hook using BroadcastChannel
- [ ] Integrate sync into Provider component
- [ ] Handle session change events
- [ ] Handle logout events (clear all tabs)
- [ ] Add fallback for environments without BroadcastChannel

**Sync Implementation**:

```typescript
const SYNC_CHANNEL = "atproto-session-sync";

interface SyncMessage {
  type: "session:changed" | "session:revoked";
  did?: string;
  timestamp: number;
}

// Broadcast on session changes
function broadcastSessionChange(type: SyncMessage["type"], did?: string);

// Listen and invalidate queries
function useSessionSync(enabled: boolean = true);
```

#### Phase 7.8: Testing Utilities

**Tasks**:

- [ ] Create `TestProvider` component for unit testing
- [ ] Create mock factories for Session, Profile, Organization, Hypercert
- [ ] Create `createMockATProtoReact()` for integration tests
- [ ] Document testing patterns

**Testing Exports** (`@hypercerts-org/sdk-react/testing`):

```typescript
export { TestProvider } from "./testing/TestProvider";
export {
  createMockSession,
  createMockProfile,
  createMockOrganization,
  createMockHypercert,
  createMockCollaborator,
} from "./testing/mocks";
export { createMockATProtoReact } from "./testing/factory";
```

**Usage Example**:

```typescript
import { TestProvider, createMockSession } from "@hypercerts-org/sdk-react/testing";
import { renderHook } from "@testing-library/react";

test("useProfile returns profile data", async () => {
  const mockSession = createMockSession({ handle: "test.bsky.social" });

  const { result } = renderHook(() => useProfile(), {
    wrapper: ({ children }) => (
      <TestProvider mockSession={mockSession}>
        {children}
      </TestProvider>
    ),
  });

  await waitFor(() => expect(result.current.profile).toBeDefined());
  expect(result.current.profile?.handle).toBe("test.bsky.social");
});
```

#### Phase 7.9: Documentation & Examples

**Tasks**:

- [ ] Write README with quick start guide
- [ ] Document all hooks with examples
- [ ] Create example: Basic auth flow
- [ ] Create example: Organization management
- [ ] Create example: Hypercert CRUD
- [ ] Create example: Next.js App Router SSR
- [ ] Create example: Testing patterns
- [ ] Create example: Server Actions (using sdk-core directly)
- [ ] Create example: Background jobs/cron workers (using sdk-core directly)
- [ ] Add migration guide from PoC hooks

**Note on Server Actions & Job Workers**:

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

No special wrappers needed - document these patterns in examples instead.

**Package Structure**:

```
packages/sdk-react/
├── package.json
├── README.md
├── src/
│   ├── index.ts                    # Main entrypoint
│   ├── types.ts                    # React-specific types
│   │
│   ├── factory/
│   │   └── createATProtoReact.ts   # Factory function
│   │
│   ├── context/
│   │   ├── ATProtoContext.ts       # React context
│   │   ├── ATProtoProvider.tsx     # Provider component
│   │   └── types.ts                # Context types
│   │
│   ├── hooks/
│   │   ├── useATProtoSDK.ts        # Access SDK from context
│   │   ├── useATProtoAuth.ts       # Consolidated auth (session + login/logout + refresh)
│   │   ├── useRepository.ts        # Low-level repository access (escape hatch)
│   │   ├── useProfile.ts           # Profile read + write
│   │   ├── useOrganizations.ts     # Organization list + create
│   │   ├── useOrganization.ts      # Single organization
│   │   ├── useCollaborators.ts     # Collaborator management
│   │   ├── useHypercerts.ts        # Hypercert list + create
│   │   └── useHypercert.ts         # Single hypercert + update/delete
│   │
│   ├── queries/
│   │   ├── keys.ts                 # Query key factory (exported for manual invalidation)
│   │   ├── auth.ts                 # Auth query/mutation options
│   │   ├── profile.ts              # Profile query/mutation options
│   │   ├── repository.ts           # Repository/server resolution options
│   │   ├── organizations.ts        # Organization query/mutation options
│   │   ├── collaborators.ts        # Collaborator query/mutation options
│   │   └── hypercerts.ts           # Hypercert query/mutation options
│   │
│   ├── utils/
│   │   ├── ssr.ts                  # SSR utilities (createSSRHelpers)
│   │   └── sync.ts                 # Cross-tab sync (BroadcastChannel)
│   │
│   └── testing/
│       ├── index.ts                # Testing entrypoint
│       ├── TestProvider.tsx        # Test wrapper component
│       ├── mocks.ts                # Mock factories
│       └── factory.ts              # createMockATProtoReact
│
└── tests/
    ├── hooks/
    ├── integration/
    └── ssr/
```

**Package.json**:

```json
{
  "name": "@hypercerts-org/sdk-react",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./testing": {
      "types": "./dist/testing.d.ts",
      "import": "./dist/testing.mjs",
      "require": "./dist/testing.cjs"
    }
  },
  "peerDependencies": {
    "@hypercerts-org/sdk-core": "^0.1.0",
    "@tanstack/react-query": "^5.0.0",
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

**Key Design Decisions**:

1. **Factory over singleton**: Each `createATProtoReact()` creates isolated instance for SSR safety
2. **React Query integration**: Hooks return familiar `isLoading`, `error`, `data` patterns
3. **Smart server routing**: SDK auto-resolves PDS vs SDS based on DID
4. **Discriminated status enums**: `AuthStatus` as union type, not separate booleans
5. **Exposed query options**: Advanced users can use `queryOptions`/`mutationOptions` directly
6. **Cross-tab sync**: BroadcastChannel keeps sessions synchronized across tabs

### Phase 8: Documentation & Developer Guidance

**Goal**: Create comprehensive documentation  
**Spec Reference**: `specs/05-tooling-docs-testing.md`

**Tasks**:

- [ ] Write main README.md (usage, quick start, troubleshooting)
- [ ] Create `docs/AGENTS.md` describing expectations for automation/agents
- [ ] Configure Typedoc to emit API docs from source comments
- [ ] Ensure public APIs include TSDoc/Typedoc comments
- [ ] Create example: Drizzle session store
- [ ] Create example: Redis session store
- [ ] Create example: Next.js routes
- [ ] Create example: Express routes
- [ ] Create example: Building custom claims system on SDK
- [ ] Add migration guide from current implementation
- [ ] Document DPoP handling and automatic token refresh

### Phase 9: Testing & Quality

**Goal**: Comprehensive test coverage  
**Spec Reference**: `specs/05-tooling-docs-testing.md`

**Tasks**:

- [ ] Write unit tests for core SDK
- [ ] Write unit tests for services
- [ ] Write integration tests for OAuth flow
- [ ] Write integration tests for PDS operations
- [ ] Write integration tests for SDS operations
- [ ] Create contract tests for SessionStore implementations
- [ ] Create contract tests for StateStore implementations
- [ ] Create mock factories for testing
- [ ] Set up CI/CD pipeline (Node 18, 20, LTS)
- [ ] Configure coverage thresholds

### Phase 10: Migration

**Goal**: Migrate app to use SDK  
**Spec Reference**: `specs/05-tooling-docs-testing.md` (release + migration guidance)

**Tasks**:

- [ ] Install SDK in app
- [ ] Create `DrizzleSessionStore` adapter in app
- [ ] Create `InMemoryStateStore` adapter in app
- [ ] Create SDK initialization function
- [ ] Update route handlers to use SDK
- [ ] Update hooks to use SDK
- [ ] Update services to use SDK
- [ ] Verify all existing functionality works
- [ ] Remove old implementations

## Migration Strategy

### Step 1: Create SDK Package Structure

```bash
cd packages/certified-sdk
mkdir -p src/{core,auth,clients,services,lexicons,react/hooks,react/components}
mkdir -p docs/examples
mkdir -p tests/{unit,integration,fixtures}
```

### Step 2: Extract Interfaces First

Start with interfaces to establish contracts before implementation.

### Step 3: Extract Core Functionality

Move OAuth client, session management, and basic operations.

### Step 4: Extract Services

Move higher-level services (records, profiles, blobs, organizations, collaborators).

### Step 5: Extract Lexicons

Move lexicon definitions and registry.

### Step 6: Extract React Components (Optional)

Create `@certified/sdk-react` package with React hooks and components that import `@certified/sdk-core`.

### Step 7: Update App to Use SDK

1. Create adapter implementations in app:

   ```typescript
   // src/lib/atproto/adapters.ts
   import { ATProtoSDK } from "@certified/sdk-core";
   import { DrizzleSessionStore } from "./DrizzleSessionStore";

   export function createAppATProtoSDK() {
     return new ATProtoSDK({
       oauth: {
         clientId: process.env.NEXT_PUBLIC_APP_URL + "/atproto-client-metadata.json",
         redirectUri: process.env.NEXT_PUBLIC_APP_URL + "/api/auth/atproto/callback",
         scope: getAuthorizeScope(),
         jwksUri: process.env.NEXT_PUBLIC_APP_URL + "/jwks.json",
         jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
       },
       servers: {
         pds: process.env.ATPROTO_PDS_URL,
         sds: process.env.NEXT_PUBLIC_SDS_SERVER_URL,
       },
       storage: {
         sessionStore: new DrizzleSessionStore(createDrizzleServiceDb()),
         stateStore: new InMemoryStateStore(),
       },
       timeouts: {
         pdsMetadata: 30000,
         apiRequests: 30000,
       },
     });
   }
   ```

2. Update route handlers:

   ```typescript
   // src/app/api/auth/atproto/authorize/route.ts
   import { createAppATProtoSDK } from "@/lib/atproto/adapters";

   export async function GET(request: NextRequest) {
     const sdk = createAppATProtoSDK();
     const identifier = request.nextUrl.searchParams.get("input");
     const authUrl = await sdk.authorize(identifier);
     return NextResponse.redirect(authUrl);
   }
   ```

3. Update hooks (if using React):

   ```typescript
   // src/hooks/useATProtoAuth.ts
   import { useATProtoAuth } from "@certified/sdk-react";
   import { createAppATProtoSDK } from "@/lib/atproto/adapters";

   export function useAppATProtoAuth() {
     const sdk = createAppATProtoSDK();
     return useATProtoAuth(sdk);
   }
   ```

   **Note**: Install both packages:

   ```bash
   pnpm add @certified/sdk-core @certified/sdk-react
   ```

4. Use repository operations:

   ```typescript
   // Working with a PDS repository (personal)
   const sdk = createAppATProtoSDK();
   const session = await sdk.restoreSession(did);
   const repo = sdk.getRepository(session); // Uses PDS by default

   // Create a record on PDS
   await repo.records.create({
     repo: session.did,
     collection: "app.bsky.feed.post",
     record: { text: "Hello world", createdAt: new Date().toISOString() },
   });

   // Working with an SDS repository (shared)
   const sdsRepo = sdk.getRepository(session, process.env.NEXT_PUBLIC_SDS_SERVER_URL);

   // Create a record on SDS
   await sdsRepo.records.create({
     repo: organizationDid,
     collection: "org.hypercerts.claim.record",
     record: {
       /* ... */
     },
   });

   // Manage collaborators (SDS only)
   await sdsRepo.collaborators.grant({
     repo: organizationDid,
     userDid: "did:plc:...",
     permissions: { read: true, create: true },
   });

   // This would throw SDSRequiredError:
   // await repo.collaborators.list(session.did); // Error: PDS doesn't support collaborators
   ```

5. Build app-specific claims system on top:

   ```typescript
   // src/services/AppClaimsService.ts
   import { ATProtoSDK, RecordService } from "@certified/sdk-core";

   /**
    * App-specific claims system built on ATProto SDK
    * Implements Ma Earth's hierarchical permission model
    */
   export class AppClaimsService {
     constructor(
       private sdk: ATProtoSDK,
       private db: Database,
     ) {}

     async grantOrganisationClaim(params: { organisationId: string; permission: Permission }) {
       // App-specific logic using SDK primitives
     }

     async resolveUserPermissions(params: { userId: string; resourceId: string; resourceType: string }) {
       // App-specific permission resolution
       // Uses database function, not ATProto
     }
   }
   ```

## Benefits of This Design

1. **Separation of Concerns**: Clear boundaries between auth, clients, services
2. **Testability**: Each layer can be tested independently
3. **Flexibility**: Easy to swap implementations (e.g., different session stores)
4. **Reusability**: Can be used in any framework, not just Next.js
5. **Type Safety**: Full TypeScript support throughout
6. **Extensibility**: Easy to add new lexicon types or services
7. **Lightweight**: No unnecessary dependencies
8. **Framework Agnostic**: Works with any Node.js framework
9. **DPoP Security**: Transparent DPoP-bound token handling
10. **Automatic Token Refresh**: Sessions refresh transparently when expired
11. **Clear SDK/App Boundary**: SDK handles ATProto protocol; apps build custom logic on top

## Dependencies

### Core SDK (`@certified/sdk-core`)

**Runtime Dependencies**:

- `@atproto/oauth-client-node` - OAuth client with DPoP support
- `@atproto/api` - ATProto API client
- `@atproto/lexicon` - Lexicon types and validation

**No Dependencies On**:

- ❌ React (zero React dependencies)
- ❌ Drizzle ORM
- ❌ Prisma
- ❌ Next.js
- ❌ Express
- ❌ Any specific storage backend
- ❌ Application-specific business logic

**Development Dependencies**:

- `typescript` - Type checking
- `vitest` - Testing framework
- `rollup` - Bundler
- `eslint` - Linting
- `prettier` - Code formatting
- `typedoc` - API documentation

### React Package (`@certified/sdk-react`)

**Runtime Dependencies**:

- `@certified/sdk-core` - Core SDK (peer dependency)
- `react` (peer dependency) - React library
- `react-dom` (peer dependency) - React DOM library

**Development Dependencies**:

- Same as core SDK
- `@testing-library/react` - React component testing
- `@testing-library/react-hooks` - React hooks testing (if needed)

## Key Technical Decisions

### 1. DPoP-Bound Tokens

All access tokens are DPoP-bound for security. The SDK:

- Generates DPoP proofs automatically
- Stores DPoP keys in session
- Uses `session.fetchHandler` which includes DPoP proofs

### 2. Automatic Token Refresh

The `restore(did)` method automatically refreshes expired tokens:

- No manual refresh handling needed
- Transparent to application code
- Uses refresh tokens stored in session

### 3. Server-Side OAuth Only

The SDK is designed for server-side OAuth:

- Private JWK authentication
- Database-backed session storage
- No browser-based OAuth (security risk)

### 4. Cache Strategy

Optional caching interface allows:

- Profile caching (reduces API calls)
- Metadata caching
- Users provide own implementation (Redis, etc.)
- SDK provides in-memory fallback

### 5. Error Handling

Standard error classes with:

- Specific error types (AuthenticationError, ValidationError, etc.)
- Error codes for programmatic handling
- HTTP status codes for API integration
- Original error cause for debugging

## Next Steps

1. ✅ Review and approve this plan
2. Create package structure
3. Begin Phase 1: Extract core abstractions
4. Iterate through phases sequentially
5. Test each phase before moving to next
6. Document as we go
7. Migrate app incrementally

## FAQ

### Q: What's the difference between PDS and SDS?

**A**:

- **PDS (Personal Data Server)**: Native ATProto. Single-user repositories. You own your data.
- **SDS (Shared Data Server)**: Extension of PDS with RBAC. Multi-user repositories with collaborator permissions.
- **Key point**: Both are repository servers with the same record/blob operations. SDS adds collaborator management.

### Q: Should I put my permission system in the SDK?

**A**: No. The SDK handles ATProto protocol operations (OAuth, records, SDS collaborators). Application-specific
permission systems (like Ma Earth's hierarchical claims) should be built on top of the SDK using your app's database and
business logic.

### Q: How do I handle token refresh?

**A**: The SDK handles this automatically. Call `sdk.restoreSession(did)` and it will transparently refresh if the token
is expired. You don't need to manually refresh tokens.

### Q: Can I use this SDK with Prisma/TypeORM/etc?

**A**: Yes! Implement the `SessionStore` and `StateStore` interfaces for your ORM. The interfaces are simple (3 methods
each) and work with any storage backend.

### Q: How do I know if I'm working with PDS or SDS?

**A**: Check the server URL when creating a repository client:

```typescript
const pdsRepo = sdk.getRepository(session); // Uses default PDS
const sdsRepo = sdk.getRepository(session, SDS_SERVER_URL); // Uses SDS
const isSDS = sdsRepo.isSharedDataServer(); // Returns true
```

### Q: Does this work with Express/Fastify/Hono?

**A**: Yes! The SDK is framework-agnostic. You build your own route handlers using the SDK's methods (`authorize()`,
`callback()`, etc.). See examples in `docs/examples/`.

### Q: How do I add custom lexicons?

**A**: Use `sdk.registerLexicons([...yourLexicons])`. The SDK validates records against registered lexicons.

### Q: Can I cache profile data?

**A**: Yes! Pass a `cache` option in the config implementing `CacheInterface`. The SDK will use it for profile caching.

### Q: Do I need both `@certified/sdk-core` and `@certified/sdk-react`?

**A**:

- **Server-side only** (Node.js, Edge functions, API routes): Install only `@certified/sdk-core`
- **React applications**: Install both `@certified/sdk-core` and `@certified/sdk-react`
- The React package depends on the core SDK, so you'll always need `@certified/sdk-core` if using React

### Q: Why are there two packages?

**A**: The split ensures the core SDK has zero React dependencies, making it truly framework-agnostic. This allows it to
work in Node.js, Deno, Bun, Edge runtimes, and any JavaScript environment without React. The React package is a thin
wrapper that provides hooks and components for React applications.
