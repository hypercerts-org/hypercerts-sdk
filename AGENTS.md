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

**Prefer running commands from within the package directory** (cleaner output, easier to pass args):

```bash
# sdk-core
cd packages/sdk-core
pnpm test                    # Run all tests
pnpm test SomeFile           # Run specific test file
pnpm build
pnpm lint

# sdk-react
cd packages/sdk-react
pnpm test
pnpm build
pnpm typecheck
pnpm lint
```

Alternative using `--filter` from repository root (useful for CI/scripts):

```bash
pnpm --filter @hypercerts-org/sdk-core test
pnpm --filter @hypercerts-org/sdk-react build
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

### SDK Type Design Principles

- Types like `HypercertClaim` should always be used rather than underlying types like `OrgHypercertsClaimActivity.Main`
  which are exported from the lexicons package

- Whenever an SDK method creates a record, there should be a corresponding type like `CreateCollectionParams` defined,
  which is derived from `HypercertCollection`, but with `$type` and `createdAt` made optional. Then the method should
  ensure that those are auto-populated if missing.

- For any methods which can refer to a _potentially_ existing record, e.g. update methods or attach methods like
  `attachLocationToProject()`, then the user should be able to reference that object in three different ways:
  1. provide an AT-URI pointing to an existing record
  2. provide a StrongRef pointing to an existing record
  3. provide an object of a type named like `Create*Params` where \* can be Collection / Activity etc. as appropriate

  These possibilities should be a union type called something like `CollectionParams`.

- There should also be types like `UpdateCollectionParams` which should be a `Partial` allowing the update methods to
  perform selective updates on just some parts of the record.

- So in summary, for each lexicon entity type, there should be five types, e.g. for the `org.hypercerts.claim.rights`
  lexicon there should be:
  1. `OrgHypercertsClaimRights.Main` (from the lexicon package)
  2. `HypercertRights` - the same as 1, as syntactic sugar defined by the SDK. These should all be defined in the same
     place in the same file.
  3. `CreateRightsParams` - `SetOptional<HypercertRights, "$type" | "createdAt">` should be the basis for this
     definition. However if the lexicon contains strongRefs to other lexicons, this should be further wrapped with
     `OverrideProperties` from the `type-fest` package to replace any nested objects with the equivalent `Create*Params`
     type, so that creation of multiple records can be achieved by calling a single create method for the main record.
  4. `UpdateRightsParams` - `Partial<CreateRightsParams>`
  5. `RightsParams` - union type `string | StrongRef | CreateRightsParams`

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
cd packages/sdk-core
pnpm test

# 3. Run linting (from repo root)
cd ../..
pnpm lint

# 4. Verify the build works (from repo root)
pnpm build

# 5. Stage changes
git add <files>

# 6. Commit (hooks will run automatically)
git commit -m "feat(hypercerts): add project CRUD operations"

# The pre-commit hook will:
# - Build all packages
# - Warn if changeset is needed
# - Block commit if build fails

# 7. If prompted, add changeset for user-facing changes
# See "Release Process" section - use the writing-changesets skill
git add .changeset/*.md
git commit -m "chore: add changeset for project operations"
```

### Pre-push Verification Checklist

**IMPORTANT: Before pushing, always run all three quality gates to match CI:**

```bash
pnpm test    # All tests pass
pnpm lint    # No lint errors (unused imports, etc.)
pnpm build   # Build succeeds
```

Skipping `pnpm lint` is a common mistake that leads to CI failures, since `pnpm build` and `pnpm test` do not catch
ESLint errors like unused imports or variables.

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

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are
stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
