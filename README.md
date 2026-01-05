# Hypercerts SDK

A monorepo containing SDK packages for the Hypercerts protocol on ATProto.

## Packages

| Package                                             | Description                                                                                           | Status      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------- |
| [`@hypercerts-org/lexicon`](./packages/lexicon)     | ATProto lexicon definitions and generated TypeScript types for Hypercerts                             | ✅ Complete |
| [`@hypercerts-org/sdk-core`](./packages/sdk-core)   | Framework-agnostic core SDK for ATProto authentication, repository operations, and lexicon management | ✅ Complete |
| [`@hypercerts-org/sdk-react`](./packages/sdk-react) | React hooks and components for ATProto integration                                                    | ✅ Complete |

**Note:** The lexicon definitions are published separately at
[`@hypercerts-org/lexicon`](https://github.com/hypercerts-org/hypercerts-lexicon) and imported as a dependency.

**Note:** This SDK consumes the published
[`@hypercerts-org/lexicon`](https://github.com/hypercerts-org/hypercerts-lexicon) package for lexicon definitions and
types.

## Architecture

This SDK is designed around the ATProto (AT Protocol) ecosystem, providing tools for:

- **OAuth Authentication** - DPoP-bound token management with automatic refresh
- **Repository Operations** - Unified interface for PDS (Personal Data Server) and SDS (Shared Data Server)
- **Lexicon Management** - Schema validation and registration for hypercert record types
- **Domain Services** - High-level services for hypercerts, collaborators, and organizations
- **React Integration** - Hooks and providers with React Query for data fetching and caching

### Core Concepts

#### PDS vs SDS

- **PDS (Personal Data Server)**: Standard ATProto server for single-user repositories
- **SDS (Shared Data Server)**: Extended ATProto server with RBAC for multi-user collaboration

The SDK provides a unified `Repository` that works with both server types, with SDS-specific features (collaborator
management, organizations) available when connected to an SDS.

### Package Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│  @hypercerts-org/sdk-react                              │
│  - React hooks (useAuth, useProfile, useHypercerts)     │
│  - Factory pattern (createATProtoReact)                 │
│  - React Query integration                              │
├─────────────────────────────────────────────────────────┤
│  @hypercerts-org/sdk-core                               │
│  - ATProtoSDK (OAuth, session management)               │
│  - Repository (records, blobs, profiles)                │
│  - Domain services (hypercerts, organizations)          │
│  - Lexicon registry and validation                      │
│  - Re-exports types from @hypercerts-org/lexicon        │
├─────────────────────────────────────────────────────────┤
│  @hypercerts-org/lexicon (published package)            │
│  - ATProto lexicon JSON definitions                     │
│  - Generated TypeScript types (via @atproto/lex-cli)    │
│  - Runtime validation (isRecord, validateRecord)        │
└─────────────────────────────────────────────────────────┘
```

### Type Inheritance

Types flow from the lexicon package through sdk-core to sdk-react:

```
@hypercerts-org/lexicon          → Generated types with $type field
    ↓                               (OrgHypercertsClaim.Main, etc.)
@hypercerts-org/sdk-core         → Re-exports with friendly aliases
    ↓                               (HypercertClaim, HypercertRights, etc.)
@hypercerts-org/sdk-react        → Consumes types from sdk-core
                                    (Hypercert extends HypercertClaim)
```

This architecture ensures:

- **Single source of truth**: Lexicon definitions generate all types
- **Consistent validation**: Runtime validation using `@atproto/lexicon`
- **Clean API surface**: sdk-core provides user-friendly type aliases
- **Simplified dependencies**: sdk-react only depends on sdk-core

## Getting Started

### Installation

```bash
# Core SDK only (for Node.js or custom frameworks)
pnpm add @hypercerts-org/sdk-core

# React integration (includes sdk-core as peer dependency)
pnpm add @hypercerts-org/sdk-react @hypercerts-org/sdk-core @tanstack/react-query
```

### React Usage (Recommended)

```typescript
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { QueryClientProvider } from "@tanstack/react-query";

// 1. Create instance
const atproto = createATProtoReact({
  config: {
    oauth: {
      clientId: "https://your-app.com/client-metadata.json",
      redirectUri: "https://your-app.com/callback",
      scope: "atproto",
    },
  },
});

// 2. Export hooks
export const { Provider, queryClient, useAuth, useProfile, useHypercerts } = atproto;

// 3. Wrap app with providers
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

### Core SDK Usage (Framework-Agnostic)

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

// 1. Create SDK instance
const sdk = createATProtoSDK({
  oauth: {
    clientId: "https://your-app.com/client-metadata.json",
    redirectUri: "https://your-app.com/callback",
    scope: "atproto",
  },
});

// 2. Start OAuth flow → redirect user to authUrl
const authUrl = await sdk.authorize("user.bsky.social");

// 3. Handle callback at redirectUri
const session = await sdk.callback(params);

// 4. Use session for repository operations
const repo = sdk.getRepository(session);
await repo.hypercerts.create({
  title: "My Hypercert",
  description: "Impact claim description",
  workScope: "Climate",
  workTimeframeFrom: "2024-01-01",
  workTimeframeTo: "2024-12-31",
  rights: { name: "CC-BY", type: "license", description: "Attribution" },
});

// For returning users, restore session by DID
const existingSession = await sdk.restoreSession("did:plc:...");
```

### Integration with Wagmi

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
</QueryClientProvider>
```

## Development

This monorepo uses [Turborepo](https://turbo.build/repo) for build orchestration and [pnpm](https://pnpm.io) for package
management.

### Prerequisites

- Node.js >= 20
- pnpm >= 9.2.0

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Turborepo Commands

Turborepo orchestrates tasks across all packages with smart caching:

```bash
# Run a task across all packages
pnpm turbo <task>

# Run with no cache (force re-run)
pnpm turbo <task> --force

# Run only for specific package
pnpm turbo <task> --filter=@hypercerts-org/sdk-core

# View dependency graph
pnpm turbo <task> --graph
```

Available tasks defined in `turbo.json`:

| Task        | Description                                    |
| ----------- | ---------------------------------------------- |
| `build`     | Build all packages (outputs cached in `dist/`) |
| `test`      | Run tests across all packages                  |
| `lint`      | Run ESLint across all packages                 |
| `typecheck` | Run TypeScript type checking                   |
| `dev`       | Start development mode (persistent, no cache)  |
| `clean`     | Remove build artifacts                         |

### Project Structure

```
hypercerts-sdk/
├── packages/
│   ├── sdk-core/           # Core SDK package
│   │   ├── src/
│   │   │   ├── auth/       # OAuth client
│   │   │   ├── core/       # SDK class, types, errors
│   │   │   ├── repository/ # Repository operations
│   │   │   ├── services/   # Domain services (re-exports lexicon types)
│   │   │   └── storage/    # In-memory stores
│   │   └── tests/
│   └── sdk-react/          # React package
│       └── src/
│           ├── context/    # Provider, context
│           ├── factory/    # createATProtoReact
│           ├── hooks/      # React hooks
│           ├── queries/    # Query keys
│           ├── testing/    # TestProvider, mocks
│           └── utils/      # SSR, sync utilities
├── specs/                  # Implementation specifications
├── turbo.json              # Turborepo configuration
├── pnpm-workspace.yaml     # pnpm workspace configuration
└── package.json            # Root package.json
```

### Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with appropriate name and scripts
3. Extend shared configs:
   - ESLint: `import baseConfig from "../../eslint.config.mjs"`
   - TypeScript: `"extends": "../../tsconfig.json"`
4. Prettier config is inherited from root automatically

## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for version management and npm publishing.

### Release Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  feature/* ──────────────────┐                                     │
│       │                      │                                     │
│       │  pnpm changeset      │ PR                                  │
│       │  (describe changes)  │                                     │
│       ▼                      ▼                                     │
│  ┌─────────┐  merge    ┌──────────┐                               │
│  │ commit  │ ────────► │ develop  │ ──► Auto-publish @beta        │
│  │  + .md  │           └────┬─────┘     (0.2.0-beta.0)            │
│  └─────────┘                │                                      │
│                             │ PR (after: pnpm changeset pre exit)  │
│                             ▼                                      │
│                        ┌────────┐                                  │
│                        │  main  │ ──► Creates "Release PR"         │
│                        └────┬───┘                                  │
│                             │                                      │
│                             │ merge Release PR                     │
│                             ▼                                      │
│                     ┌──────────────┐                               │
│                     │ npm publish  │ ──► @latest (0.2.0)           │
│                     └──────────────┘                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### For Contributors

When making changes to packages, add a changeset:

```bash
pnpm changeset
```

Follow the prompts to:

1. Select changed packages
2. Choose version bump type (major/minor/patch)
3. Write a summary for the changelog

### Installing Pre-release Versions

```bash
# Install beta versions
npm install @hypercerts-org/sdk-core@beta
npm install @hypercerts-org/sdk-react@beta
```

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.MD) - Detailed architecture and implementation phases
- [Core & Auth Spec](./specs/01-core-and-auth.md) - OAuth and session management
- [Repository & Lexicons Spec](./specs/02-repository-and-lexicons.md) - Repository operations
- [Domain Services Spec](./specs/03-domain-services-and-workflow.md) - High-level services
- [React & Clients Spec](./specs/04-react-and-clients.md) - React integration
- [Tooling & Testing Spec](./specs/05-tooling-docs-testing.md) - Build and test infrastructure

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
