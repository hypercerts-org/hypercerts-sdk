---
name: writing-changesets
description:
  Create changeset files for user-facing changes. Use when making API changes, modifying types, adding features, or any
  change that affects package consumers.
---

# Writing Changesets

Create a changeset file to document user-facing changes for release.

## When to Use

Add a changeset when making changes that affect consumers:

- Adding new SDK methods or operations (createProject, addEvidence, etc.)
- Modifying existing API signatures (breaking or non-breaking)
- Changing TypeScript type exports or interfaces
- Adding new React hooks or components
- Renaming any exported constants, types, functions, or hooks
- Changing behavior of existing operations
- Bug fixes that affect external behavior
- Any change that requires a version bump or affects package consumers

Skip changesets for internal changes (build scripts, tests, refactoring, documentation only).

## Packages

The SDK has two publishable packages:

- `@hypercerts-org/sdk-core` - Core SDK
- `@hypercerts-org/sdk-react` - React hooks etc.

## Format

Create in `.changeset/` a Markdown file with a descriptive kebab-case name (e.g., `fix-collection-type-alignment.md`) in
this format:

```markdown
---
"@hypercerts-org/sdk-core": minor
---

Align collection/project CRUD types with lexicon definitions
```

For changes affecting both packages:

```markdown
---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": minor
---

Add comprehensive project support to SDK

**Core SDK (`@hypercerts-org/sdk-core`):**

- Add project CRUD operations (createProject, getProject, listProjects)
- Add project events (projectCreated, projectUpdated, projectDeleted)
- Support for avatar and banner blob uploads

**React SDK (`@hypercerts-org/sdk-react`):**

- Add useProjects and useProject hooks
- Project query keys for cache management
- TypeScript types for projects
```

### Frontmatter Fields

There should be a frontmatter field for each package being changed. The field name should be the package name, and the
field value should be one of the following change types:

- `patch` - Bug fixes, non-breaking changes
- `minor` - New features, non-breaking additions (also breaking changes if the version in `package.json` is still 0.x.y)
- `major` - Breaking changes (_ONLY_ use if the version in `package.json` is already greater than 0.x.y)

**Current versions are 0.x.y, so use `minor` for breaking changes.**

### Description

In the body after the frontmatter field(s), write a clear, concise description following conventional commit style.
Focus on what changed and why. For multi-package changes, use sections to separate changes.

## Example Changesets

**New SDK feature:**

```markdown
---
"@hypercerts-org/sdk-core": minor
---

Add project CRUD operations to repository interface
```

**API signature change:**

```markdown
---
"@hypercerts-org/sdk-core": minor
---

Evidence records are now created separately instead of being embedded inline in hypercerts

**Breaking Changes:**

- Evidence is no longer embedded in the hypercert record - use `result.evidenceUris` to access evidence record URIs
- `addEvidence()` now accepts a single `CreateHypercertEvidenceParams` object instead of
  `(uri: string, evidence: HypercertEvidence[])`
```

**Type/interface change:**

```markdown
---
"@hypercerts-org/sdk-core": minor
---

Align collection/project CRUD types with lexicon definitions

- Update CreateCollectionParams to match lexicon schema
- Add CreateCollectionResult type with optional location URI
- Simplify project operations to delegate to collection operations
```

**React hook addition:**

```markdown
---
"@hypercerts-org/sdk-react": minor
---

Add useProjects and useProject hooks for project management
```

**Bug fix:**

```markdown
---
"@hypercerts-org/sdk-core": patch
---

Fix SDS routing for organization endpoints
```

## Key Files

- `.changeset/config.json` - Changeset configuration
- Existing changeset files in `.changeset/` - Reference for naming and format
- `package.json` - Contains version and release scripts
- `packages/sdk-core/package.json` - Core SDK version
- `packages/sdk-react/package.json` - React SDK version
