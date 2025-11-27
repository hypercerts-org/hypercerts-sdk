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
│   └── sdk-core/           # Core SDK implementation
│       ├── src/
│       │   ├── auth/       # OAuth authentication client
│       │   ├── core/       # SDK main class, types, errors, config
│       │   ├── events/     # Event handling utilities
│       │   ├── lexicons/   # Hypercert lexicon definitions
│       │   ├── repository/ # Repository operations (CRUD, blobs, profiles)
│       │   ├── services/   # Domain services (hypercerts)
│       │   ├── storage/    # Storage implementations (in-memory)
│       │   └── testing/    # Testing utilities and mocks
│       └── tests/          # Test files organized by module
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

- `@atproto/*` - AT Protocol SDK packages (API, lexicon, OAuth)
- `zod` - Runtime schema validation
- `eventemitter3` - Event handling

## Development Commands

All commands run from the repository root:

```bash
# Install dependencies
pnpm install

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

From `packages/sdk-core/`:

```bash
pnpm test                 # Run sdk-core tests only
pnpm build                # Build sdk-core only
```

## Architecture

### Core Components

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

### Error Handling

Use the error hierarchy in `src/core/errors.ts`:

- `HypercertsError` - Base error class
- `ValidationError` - Schema/data validation failures
- `AuthenticationError` - OAuth/session errors
- `NetworkError` - HTTP/network failures
- `NotFoundError` - Resource not found

### Testing Requirements

- Minimum coverage: 70% (lines, functions, statements), 60% (branches)
- Use mocks from `src/testing/` for unit tests
- Test files: `*.test.ts` in `tests/` directory
- Use fixtures from `tests/utils/fixtures.ts`

## Build Output

The SDK produces multiple entrypoints:

| Entrypoint    | Import Path                          | Purpose                |
| ------------- | ------------------------------------ | ---------------------- |
| Main          | `@hypercerts-org/sdk`                | Full SDK               |
| Types         | `@hypercerts-org/sdk/types`          | TypeScript types only  |
| Errors        | `@hypercerts-org/sdk/errors`         | Error classes          |
| Lexicons      | `@hypercerts-org/sdk/lexicons`       | Lexicon definitions    |
| Storage       | `@hypercerts-org/sdk/storage`        | Storage implementations|
| Testing       | `@hypercerts-org/sdk/testing`        | Test utilities         |

Each entrypoint outputs:
- `.mjs` - ES Modules
- `.cjs` - CommonJS
- `.d.ts` - TypeScript declarations

## PR and Commit Guidelines

### Commit Messages

Follow conventional commits:

```
type(scope): description

feat(auth): add token refresh mechanism
fix(repository): handle missing profile gracefully
chore(deps): update dependencies
test(oauth): add callback handler tests
docs(readme): update installation instructions
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/sdk-core/src/core/SDK.ts` | Main SDK class |
| `packages/sdk-core/src/auth/OAuthClient.ts` | OAuth implementation |
| `packages/sdk-core/src/repository/Repository.ts` | Repository API |
| `packages/sdk-core/src/core/errors.ts` | Error definitions |
| `packages/sdk-core/src/services/hypercerts/types.ts` | Hypercert types |
| `packages/sdk-core/vitest.config.ts` | Test configuration |
| `packages/sdk-core/rollup.config.js` | Build configuration |

## Common Tasks

### Adding a New Record Type

1. Define types in `src/services/<domain>/types.ts`
2. Create Zod schemas in `src/services/<domain>/schemas.ts`
3. Register lexicon in `src/lexicons/<domain>/index.ts`
4. Add operations in `src/repository/<Domain>OperationsImpl.ts`
5. Expose via Repository class
6. Add tests in `tests/repository/`

### Adding a New API Method

1. Define interface in `src/repository/interfaces.ts`
2. Implement in appropriate `*OperationsImpl.ts`
3. Add to Repository class if needed
4. Write unit tests
5. Update type exports if public

### Debugging

- Source maps are generated for all builds
- Coverage reports in `packages/sdk-core/coverage/`

