# Hypercerts SDK

A monorepo containing SDK packages for the Hypercerts protocol on ATProto.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@hypercerts-org/sdk-core`](./packages/sdk-core) | Framework-agnostic core SDK for ATProto authentication, repository operations, and lexicon management | ✅ Complete |
| `@hypercerts-org/sdk-react` | React hooks and components for ATProto integration | 🚧 Planned |

## Architecture

This SDK is designed around the ATProto (AT Protocol) ecosystem, providing tools for:

- **OAuth Authentication** - DPoP-bound token management with automatic refresh
- **Repository Operations** - Unified interface for PDS (Personal Data Server) and SDS (Shared Data Server)
- **Lexicon Management** - Schema validation and registration for hypercert record types
- **Domain Services** - High-level services for hypercerts, collaborators, and organizations

### Core Concepts

#### PDS vs SDS

- **PDS (Personal Data Server)**: Standard ATProto server for single-user repositories
- **SDS (Shared Data Server)**: Extended ATProto server with RBAC for multi-user collaboration

The SDK provides a unified `RepositoryClient` that works with both server types, with SDS-specific features (collaborator management) available when connected to an SDS.

### Package Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│  @hypercerts-org/sdk-react (optional)                   │
│  - React hooks (useATProtoAuth, useRepository, etc.)    │
│  - Context providers                                     │
├─────────────────────────────────────────────────────────┤
│  @hypercerts-org/sdk-core                               │
│  - ATProtoSDK (OAuth, session management)               │
│  - RepositoryClient (records, blobs, profiles)          │
│  - Domain services (hypercerts, organizations)          │
│  - Lexicon registry and validation                      │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

### Installation

```bash
# Core SDK (required)
pnpm add @hypercerts-org/sdk-core

# React integration (optional)
pnpm add @hypercerts-org/sdk-react
```

### Basic Usage

```typescript
import { ATProtoSDK } from "@hypercerts-org/sdk-core";

// Initialize the SDK
const sdk = new ATProtoSDK({
  oauth: {
    clientId: "https://your-app.com/client-metadata.json",
    redirectUri: "https://your-app.com/callback",
    scope: "atproto transition:generic",
  },
  servers: {
    pds: "https://bsky.social",
    sds: "https://your-sds.example.com",
  },
});

// Start OAuth flow
const authUrl = await sdk.authorize("user.bsky.social");

// After callback, restore session
const session = await sdk.restoreSession(did);

// Get repository client
const repo = sdk.getRepository(session);

// Create a record
await repo.records.create({
  repo: session.did,
  collection: "org.hypercerts.hypercert",
  record: {
    title: "My Hypercert",
    description: "Impact claim description",
    // ...
  },
});
```

## Development

This monorepo uses [Turborepo](https://turbo.build/repo) for build orchestration and [pnpm](https://pnpm.io) for package management.

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

| Task | Description |
|------|-------------|
| `build` | Build all packages (outputs cached in `dist/`) |
| `test` | Run tests across all packages |
| `lint` | Run ESLint across all packages |
| `typecheck` | Run TypeScript type checking |
| `dev` | Start development mode (persistent, no cache) |
| `clean` | Remove build artifacts |

### Project Structure

```
hypercerts-sdk/
├── packages/
│   ├── sdk-core/           # Core SDK package
│   │   ├── src/
│   │   │   ├── auth/       # OAuth client
│   │   │   ├── core/       # SDK class, types, errors
│   │   │   ├── repository/ # Repository operations
│   │   │   ├── services/   # Domain services
│   │   │   ├── lexicons/   # Hypercert lexicons
│   │   │   └── storage/    # In-memory stores
│   │   └── tests/
│   └── sdk-react/          # React package (planned)
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

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.MD) - Detailed architecture and implementation phases
- [Core & Auth Spec](./specs/01-core-and-auth.md) - OAuth and session management
- [Repository & Lexicons Spec](./specs/02-repository-and-lexicons.md) - Repository operations
- [Domain Services Spec](./specs/03-domain-services-and-workflow.md) - High-level services
- [React & Clients Spec](./specs/04-react-and-clients.md) - React integration
- [Tooling & Testing Spec](./specs/05-tooling-docs-testing.md) - Build and test infrastructure

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
