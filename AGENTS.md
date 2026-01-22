# AGENTS.MD - AI Agent Instructions for Hypercerts SDK

This document provides instructions for AI agents working in the Hypercerts SDK repository.

## Project Overview

The Hypercerts SDK is a TypeScript SDK for the Hypercerts protocol built on AT Protocol (ATProto). It provides OAuth
authentication, repository operations, and domain-specific services for managing hypercerts, collaborators, and
organizations.

## Repository Structure

```
hypercerts-sdk/
├── packages/
│   ├── sdk-core/           # Core SDK implementation (framework-agnostic)
│   │   ├── src/
│   │   │   ├── auth/       # OAuth authentication client
│   │   │   ├── core/       # SDK main class, types, errors, config
│   │   │   ├── events/     # Event handling utilities
│   │   │   ├── lexicons/   # Hypercert lexicon definitions
│   │   │   ├── repository/ # Repository operations (CRUD, blobs, profiles)
│   │   │   ├── services/   # Domain services (hypercerts)
│   │   │   ├── storage/    # Storage implementations (in-memory)
│   │   │   └── testing/    # Testing utilities and mocks
│   │   └── tests/          # Test files organized by module
│   └── sdk-react/          # React hooks and components
│       └── src/
│           ├── context/    # ATProtoProvider, context types
│           ├── factory/    # createATProtoReact factory function
│           ├── hooks/      # React hooks (useAuth, useProfile, etc.)
│           ├── queries/    # Query keys for React Query
│           ├── testing/    # TestProvider, mocks
│           └── utils/      # SSR helpers, cross-tab sync
├── specs/                  # Implementation specifications
├── .github/                # CI/CD workflows
└── .husky/                 # Git hooks
```

## Tech Stack

- **Language**: TypeScript 5.8+ with strict mode
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm (with workspaces)
- **Build**: Rollup (ESM + CJS dual output)
- **Testing**: Vitest with v8 coverage
- **Linting**: ESLint 9 with typescript-eslint
- **Formatting**: Prettier
- **Monorepo**: Turborepo for task orchestration

### Key Dependencies

#### sdk-core

- `@atproto/*` - AT Protocol SDK packages (API, lexicon, OAuth)
- `zod` - Runtime schema validation
- `eventemitter3` - Event handling

#### sdk-react

- `@tanstack/react-query` - Data fetching and caching
- `react` - React 18/19

## Development Commands

All commands run from the repository root:

```bash
# Install dependencies
pnpm install

# Build / check / test everything
pnpm check

# Build all packages
pnpm build

# Run tests
pnpm test                 # Run all tests
pnpm test:coverage        # Run with coverage report
pnpm test:ui              # Interactive test UI

# Code quality
pnpm lint                 # Run ESLint
pnpm format               # Format with Prettier
pnpm format:check         # Check formatting
pnpm typecheck            # TypeScript type checking

# Cleanup
pnpm clean                # Remove build artifacts
```

### Package-specific commands

```bash
# sdk-core
pnpm --filter @hypercerts-org/sdk-core build
pnpm --filter @hypercerts-org/sdk-core test
pnpm --filter @hypercerts-org/sdk-core lint

# sdk-react
pnpm --filter @hypercerts-org/sdk-react build
pnpm --filter @hypercerts-org/sdk-react typecheck
pnpm --filter @hypercerts-org/sdk-react lint
```

## Architecture

### Package Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                     │
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
└─────────────────────────────────────────────────────────┘
```

### Core Components (sdk-core)

1. **ATProtoSDK** (`src/core/SDK.ts`) - Main SDK entry point
   - `authorize(identifier)` - Start OAuth flow
   - `callback(params)` - Handle OAuth callback
   - `restoreSession(did)` - Restore existing session
   - `getRepository(session)` - Get repository client

2. **Repository** (`src/repository/Repository.ts`) - Fluent API for data operations
   - `.records` - CRUD operations for AT Protocol records
   - `.blobs` - Binary data upload/retrieval
   - `.profile` - User profile management
   - `.hypercerts` - Hypercert-specific operations
   - `.collaborators` - Collaborator management (SDS only)
   - `.organizations` - Organization operations (SDS only)

3. **OAuthClient** (`src/auth/OAuthClient.ts`) - OAuth 2.0 with DPoP
   - PKCE support
   - Automatic token refresh
   - DPoP-bound tokens

4. **LexiconRegistry** (`src/repository/LexiconRegistry.ts`) - Schema validation
   - Runtime validation using Zod
   - Lexicon registration and lookup

### React Components (sdk-react)

1. **createATProtoReact** (`src/factory/createATProtoReact.tsx`) - Factory function
   - Creates isolated SDK instances (SSR-safe)
   - Returns Provider component and bound hooks
   - Follows Wagmi v2 / tRPC pattern

2. **Hooks**
   - `useAuth()` - Authentication state and actions
   - `useProfile(did?)` - Profile read/write
   - `useRepository(opts?)` - Repository client with smart server routing
   - `useOrganizations()` / `useOrganization(did)` - Organization management
   - `useCollaborators(did)` - Collaborator management
   - `useHypercerts(did?)` / `useHypercert(uri)` - Hypercert CRUD

3. **Query Keys** (`src/queries/keys.ts`) - For manual cache management

### Data Flow

```
User → ATProtoSDK → OAuthClient → AT Protocol Server
                  → Repository → PDS/SDS Operations
```

## Coding Guidelines

### TypeScript Standards

- Use strict TypeScript (`strict: true`)
- Avoid `any` types (warns in ESLint)
- Prefix unused variables with `_`
- Use Zod schemas for runtime validation
- Export types from dedicated entrypoints

### File Organization

- One class/module per file
- Group related files in directories
- Test files mirror source structure in `tests/`
- Use barrel exports (`index.ts`) for public APIs

### Naming Conventions

- Classes: PascalCase (`OAuthClient`, `Repository`)
- Files: PascalCase for classes, camelCase for utilities
- Types/Interfaces: PascalCase with descriptive names
- Constants: UPPER_SNAKE_CASE
- React hooks: camelCase with `use` prefix

### Error Handling

Use the error hierarchy in `sdk-core/src/core/errors.ts`:

- `HypercertsError` - Base error class
- `ValidationError` - Schema/data validation failures
- `AuthenticationError` - OAuth/session errors
- `NetworkError` - HTTP/network failures
- `NotFoundError` - Resource not found
- `SDSRequiredError` - Operation requires SDS

### Testing Requirements

- Minimum coverage: 70% (lines, functions, statements), 60% (branches)
- Use mocks from `src/testing/` for unit tests
- Test files: `*.test.ts` in `tests/` directory
- Use fixtures from `tests/utils/fixtures.ts`

## Build Output

### sdk-core

| Entrypoint | Import Path                         | Purpose                 |
| ---------- | ----------------------------------- | ----------------------- |
| Main       | `@hypercerts-org/sdk-core`          | Full SDK                |
| Types      | `@hypercerts-org/sdk-core/types`    | TypeScript types only   |
| Errors     | `@hypercerts-org/sdk-core/errors`   | Error classes           |
| Lexicons   | `@hypercerts-org/sdk-core/lexicons` | Lexicon definitions     |
| Storage    | `@hypercerts-org/sdk-core/storage`  | Storage implementations |
| Testing    | `@hypercerts-org/sdk-core/testing`  | Test utilities          |

### sdk-react

| Entrypoint | Import Path                         | Purpose               |
| ---------- | ----------------------------------- | --------------------- |
| Main       | `@hypercerts-org/sdk-react`         | Factory, hooks, types |
| Testing    | `@hypercerts-org/sdk-react/testing` | TestProvider, mocks   |

Each entrypoint outputs:

- `.mjs` - ES Modules
- `.cjs` - CommonJS
- `.d.ts` - TypeScript declarations

## Release Process

Uses [Changesets](https://github.com/changesets/changesets) for versioning.

**Branch flow:** `feature` → `develop` (beta) → `main` (stable)

### Creating Changesets

**REQUIRED: All user-facing changes must include a changeset.**

To create a changeset, use the `writing-changesets` skill.

**The skill is the single source of truth for:**

- When changesets are required vs optional
- How to format changeset files correctly
- Which packages to include in the frontmatter
- Changeset type selection (patch/minor/major)
- Examples for different types of changes

Do not attempt to create changesets without consulting this skill first.

### Release Branches

- **develop**: Auto-publishes `@beta` tag (e.g., `0.2.0-beta.0`)
- **main**: Creates Release PR → merge to publish `@latest`

### Before merging develop → main

You should never do this unless explicitly requested by the user:

```bash
pnpm changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"
```

### Key Files

- `.changeset/config.json` - Configuration
- `.changeset/*.md` - Pending changesets
- `.github/workflows/release.yml` - Stable releases
- `.github/workflows/release-beta.yml` - Beta releases

## PR and Commit Guidelines

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

feat(auth): add token refresh mechanism
fix(repository): handle missing profile gracefully
chore(deps): update dependencies
test(oauth): add callback handler tests
docs(readme): update installation instructions
```

**Common types:**

- `feat`: New feature or enhancement
- `fix`: Bug fix
- `test`: Adding or updating tests
- `refactor`: Code refactoring without behavior change
- `docs`: Documentation changes
- `chore`: Maintenance tasks (deps, configs, etc.)
- `perf`: Performance improvements
- `style`: Code style/formatting changes

**Scope examples:** `auth`, `repository`, `oauth`, `sdk-core`, `sdk-react`, `hooks`, `deps`

### Commit Requirements

**IMPORTANT: Always run commits with pre-commit hooks enabled. Never use `--no-verify`.**

The repository has Git hooks that ensure code quality:

1. **Pre-commit hooks** (via Husky):
   - Run `pnpm build` to verify the code compiles
   - Check formatting and linting
   - Warn about missing changesets

2. **Testing requirements**:
   - All tests must pass before committing changes to business logic
   - Run `pnpm test` to verify all tests pass
   - Run `pnpm --filter <package> test` for package-specific tests
   - Changes to business logic (non-test code) require passing tests

3. **Git hooks must not be skipped**:
   - ✅ **DO**: `git commit -m "message"` (runs hooks)
   - ❌ **DON'T**: `git commit --no-verify -m "message"` (skips hooks)
   - The hooks ensure code quality and prevent broken builds

4. **Use conventional commits**:
   - Structure: `type(scope): description`
   - Keep descriptions concise and clear
   - Use imperative mood ("add" not "added")

### Commit Workflow

```bash
# 1. Make changes
# ... edit files ...

# 2. Run tests for affected packages
pnpm --filter @hypercerts-org/sdk-core test

# 3. Verify the build works
pnpm build

# 4. Stage changes
git add <files>

# 5. Commit (hooks will run automatically)
git commit -m "feat(hypercerts): add project CRUD operations"

# The pre-commit hook will:
# - Build all packages
# - Warn if changeset is needed
# - Block commit if build fails

# 6. If prompted, add changeset for user-facing changes
# See "Release Process" section - use the writing-changesets skill
git add .changeset/*.md
git commit -m "chore: add changeset for project operations"
```

## Key Files Reference

### sdk-core

| File                                                 | Purpose               |
| ---------------------------------------------------- | --------------------- |
| `packages/sdk-core/src/core/SDK.ts`                  | Main SDK class        |
| `packages/sdk-core/src/auth/OAuthClient.ts`          | OAuth implementation  |
| `packages/sdk-core/src/repository/Repository.ts`     | Repository API        |
| `packages/sdk-core/src/core/errors.ts`               | Error definitions     |
| `packages/sdk-core/src/services/hypercerts/types.ts` | Hypercert types       |
| `packages/sdk-core/src/repository/interfaces.ts`     | Repository interfaces |

### sdk-react

| File                                                    | Purpose              |
| ------------------------------------------------------- | -------------------- |
| `packages/sdk-react/src/factory/createATProtoReact.tsx` | Factory function     |
| `packages/sdk-react/src/context/ATProtoProvider.tsx`    | Provider component   |
| `packages/sdk-react/src/hooks/useATProtoAuth.ts`        | Auth hook            |
| `packages/sdk-react/src/hooks/useHypercerts.ts`         | Hypercerts hooks     |
| `packages/sdk-react/src/queries/keys.ts`                | Query key factory    |
| `packages/sdk-react/src/types.ts`                       | React-specific types |

## Common Tasks

### Adding a New Record Type

1. Define types in `sdk-core/src/services/<domain>/types.ts`
2. Create Zod schemas in `sdk-core/src/services/<domain>/schemas.ts`
3. Register lexicon in `sdk-core/src/lexicons/<domain>/index.ts`
4. Add operations in `sdk-core/src/repository/<Domain>OperationsImpl.ts`
5. Expose via Repository class
6. Add tests in `sdk-core/tests/repository/`
7. (Optional) Add React hook in `sdk-react/src/hooks/`

### Adding a New React Hook

1. Create hook file in `sdk-react/src/hooks/use<Name>.ts`
2. Define types in `sdk-react/src/types.ts`
3. Add query key in `sdk-react/src/queries/keys.ts`
4. Export from `sdk-react/src/index.ts`
5. Add to `ATProtoReactInstance` interface in factory
6. Return from `createATProtoReact`

### Adding a New API Method

1. Define interface in `sdk-core/src/repository/interfaces.ts`
2. Implement in appropriate `*OperationsImpl.ts`
3. Add to Repository class if needed
4. Write unit tests
5. Update type exports if public

### Debugging

- Source maps are generated for all builds
- Coverage reports in `packages/sdk-core/coverage/`
