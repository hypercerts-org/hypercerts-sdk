# Publishing Guide for Maintainers

This document describes how to publish the `@hypercerts-org/sdk-core` and `@hypercerts-org/sdk-react` packages to npm
using GitHub Actions workflows with Changesets. The workflow uses separate branches for beta and stable releases, with
all releases manually triggered to give you full control over when releases are made.

## Branch Strategy

- **`develop` branch**: Beta/prerelease versions
- **`main` branch**: Stable releases

**Suggested Flow:** `feature` → `develop` (beta) → `main` (stable)

**Note:** Direct development on `main` is also supported. The `develop` → `main` flow is suggested when you want to
publish beta versions for testing before stable releases. If you work directly on `main`, you can skip the beta testing
phase and go straight to stable releases.

### Release Flow

```text
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  feature/* ──────────────────┐                                    │
│       │                      │                                    │
│       │  pnpm changeset      │ PR                                 │
│       │  (describe changes)  │                                    │
│       ▼                      ▼                                    │
│  ┌─────────┐  merge    ┌──────────┐                               │
│  │ commit  │ ────────► │ develop  │ ──► Manual publish @beta      │
│  │  + .md  │           └────┬─────┘     (0.2.0-beta.1)            │
│  └─────────┘                │                                     │
│                             │ PR (after: pnpm changeset pre exit) │
│                             ▼                                     │
│                        ┌────────┐                                 │
│                        │  main  │ ──► Creates "Release PR"        │
│                        └────┬───┘                                 │
│                             │                                     │
│                             │ merge Release PR                    │
│                             ▼                                     │
│                     ┌──────────────┐                              │
│                     │ npm publish  │ ──► @latest (0.2.0)          │
│                     └──────────────┘                              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before publishing, ensure you have:

1. **npm Trusted Publisher configured:**
   - The workflow uses npm Trusted Publishers via GitHub OIDC for secure, token-less publishing
   - Configure on npmjs.com: Package settings → Publishing access → Add a GitHub Actions publisher
   - **Required settings:**
     - Organization/User: `hypercerts-org`
     - Repository: `hypercerts-sdk`
     - Workflow filename: `release.yml` (must match exactly, case-sensitive)
   - The npm CLI (v11.5.1+) automatically detects OIDC and uses it
   - See: <https://docs.npmjs.com/trusted-publishers>
   - **No `NPM_TOKEN` secret is required** - Trusted Publishers eliminates the need for long-lived tokens

2. **Repository URL in package.json:**
   - Each package (`@hypercerts-org/sdk-core` and `@hypercerts-org/sdk-react`) must have a `repository.url` field in
     their `package.json`
   - This is required for npm Trusted Publishers to verify the package source
   - The packages already have this configured correctly

## Adding Changesets

Before publishing, you need to create changesets for any user-facing changes:

```bash
pnpm changeset
```

This will:

1. Prompt you to select which packages changed (`@hypercerts-org/sdk-core`, `@hypercerts-org/sdk-react`, or both)
2. Ask for the version bump type (major/minor/patch)
3. Create a markdown file in `.changeset/` with your changes

**Note:** Changesets generates files with random names (e.g., `beige-clowns-relax.md`). This is intentional to prevent
filename collisions when multiple contributors create changesets simultaneously. The filename doesn't affect version
ordering—Changesets uses git history to determine the order of changes. You can rename these files if desired, but it's
not necessary.

## Publishing a Stable Release

**If merging from `develop` → `main`:** Before merging, you must exit prerelease mode on the `develop` branch:

```bash
# On develop branch
pnpm changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"
git push
```

This sets the exit intent in `pre.json`, which is required before merging to `main`. The workflow will verify this.

**If working directly on `main`:** You can skip this step since `pre.json` won't exist.

To publish a stable release to npm:

1. **If merging from `develop` → `main`:**
   - Run `pnpm changeset pre exit` on `develop` branch
   - Commit and push the change
   - Merge `develop` → `main`

   **If working directly on `main`:**
   - Skip this step and proceed to step 2

2. **Run the workflow:**
   - Navigate to: <https://github.com/hypercerts-org/hypercerts-sdk/actions/workflows/release.yml>
   - Click "Run workflow"
   - Select the branch: **`main`** (the workflow automatically detects this is a stable release)
   - Click "Run workflow" to start

3. **What happens:**
   - The workflow validates the code, builds packages, and runs tests
   - If `pre.json` exists (from `develop`), verifies that prerelease mode has been exited
   - If there are pending changesets, it creates a "Release Pull Request"
   - The Release PR will remove prerelease tags (if any) and exit prerelease mode
   - Merge the Release PR to publish to npm with the `latest` tag
   - If no changesets exist, nothing is published

## Publishing a Beta Release

To publish a beta/prerelease version:

1. **Run the workflow:**
   - Navigate to: <https://github.com/hypercerts-org/hypercerts-sdk/actions/workflows/release.yml>
   - Click "Run workflow"
   - Select the branch: **`develop`** (the workflow automatically detects this is a beta release)
   - Click "Run workflow"

2. **What happens:**
   - The workflow validates the code, builds packages, and runs tests
   - Enters beta prerelease mode (if not already) and commits `pre.json` to `develop`
   - Versions packages based on pending changesets
   - Publishes to npm with the `beta` tag
   - Version format: `0.2.0-beta.1`, `0.2.0-beta.2`, etc.
   - Commits and pushes version changes back to the `develop` branch
   - Pushes git tags created by changeset publish

**Note:** Beta releases run on the `develop` branch, so no special permissions are needed (unlike protected `main`
branch).

## Validating Releases (PRs)

When you open a pull request to `main`, you should verify:

- Check if package changes have corresponding changesets
- Warn if changesets are missing
- **Verify that `pre.json` exists with exit intent** - This only applies when merging from `develop` to `main`. It
  ensures prerelease mode has been properly exited before merging. Direct work on `main` doesn't have `pre.json`, so
  this check is skipped.

This helps ensure all user-facing changes are properly documented and that prerelease mode is correctly managed when
using the `develop` → `main` flow.

## Version Management

Versions are determined by Changesets:

- **Patch**: Bug fixes and minor updates (0.2.0 → 0.2.1)
- **Minor**: New features (0.2.0 → 0.3.0)
- **Major**: Breaking changes (0.2.0 → 1.0.0)

You specify the version bump type when creating a changeset with `pnpm changeset`.

The `release` script ensures packages are built before publishing, so the published packages always include the latest
compiled code.

## Monorepo Considerations

This repository contains multiple packages:

- `@hypercerts-org/sdk-core` - Core SDK implementation
- `@hypercerts-org/sdk-react` - React hooks and components

When creating changesets, you can select which packages are affected. Changesets will independently version each package
based on its changes, allowing for independent versioning when appropriate.
