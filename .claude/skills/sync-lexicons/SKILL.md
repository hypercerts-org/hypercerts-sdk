---
name: sync-lexicons
description: >
  Sync Hypercerts SDK with latest lexicons from the develop branch. Use when updating SDK dependencies, comparing
  lexicon versions, or reconciling changes between SDK and lexicons repository. Always check the CHANGELOG.md and diffs
  first to see exactly what changed between versions.
---

# Sync Lexicons Skill

Compare the Hypercerts lexicons repository changes between the version the SDK currently depends on and the latest
develop branch, then update SDK files accordingly.

## When to Use This Skill

- When updating `@hypercerts-org/lexicon` dependency in SDK
- When users ask "what changed in lexicons since the SDK version?"
- Before SDK releases to ensure lexicon alignment
- When reconciling SDK imports with new lexicons

## How It Works

1. **Extract current dependency**: Read SDK's `packages/sdk-core/package.json` for current `@hypercerts-org/lexicon`
   version
2. **Fetch develop branch**: Get latest from lexicons repo develop branch
3. **Compare versions**: Determine semantic version difference
4. **Generate git diff**: Show changes between the two versions in lexicons repo
5. **Update SDK files**: Modify SDK source files to reflect new lexicon imports/exports

## Key Paths

- **SDK root**: `.` (current working directory)
- **SDK package.json**: `packages/sdk-core/package.json`
- **SDK lexicons source**: `packages/sdk-core/src/lexicons.ts`
- **Lexicons repo**: `../hypercerts-lexicon`

## Usage

### Step 1: Check version of current dependency

```bash
OLD_VERSION=$(jq -r '.dependencies["@hypercerts-org/lexicon"]' packages/sdk-core/package.json)
echo "Current SDK dependency: @hypercerts-org/lexicon@${OLD_VERSION}"
```

**Note**: `OLD_VERSION` is extracted without the `v` prefix (e.g., `0.10.0-beta.4`). When using with git commands,
prepend `v` to match git tag format.

### Step 2: Fetch latest develop and tags

```bash
git -C ../hypercerts-lexicon fetch --tags origin
```

### Step 3: Update SDK package.json to exact latest version

```bash
# Get the latest version tag from the lexicons repo (strip 'v' prefix for package manager)
NEW_VERSION=$(git -C ../hypercerts-lexicon tag --list 'v*' --sort=-version:refname | head -1 | sed 's/^v//')
echo "Latest lexicon version: ${NEW_VERSION}"

# Update to exact version (no ^ operator) using pnpm add with --save-exact
pnpm --filter @hypercerts-org/sdk-core add --save-exact @hypercerts-org/lexicon@${NEW_VERSION}
```

**Note**: `NEW_VERSION` is now set without the `v` prefix (e.g., `0.10.0-beta.11`) for use with package managers. When
using with git commands in subsequent steps, prepend `v` to match git tag format.

### Step 4: Check CHANGELOG.md

After updating the dependency, read the lexicons CHANGELOG to understand what changed:

```bash
cat packages/sdk-core/node_modules/@hypercerts-org/lexicon/CHANGELOG.md
```

Look for:

- Breaking changes that require SDK updates
- Renamed exports (e.g., `HELPER_WORK_SCOPE_VERSION_*` → `WORK_SCOPE_VERSION_*`)
- New lexicons added
- Deprecated/removed constants

### Step 5: Compare versions and diff

```bash
# NEW_VERSION already set in Step 3 from package.json (without 'v' prefix)
# If running Step 5 independently, re-extract it:
# NEW_VERSION=$(jq -r '.dependencies["@hypercerts-org/lexicon"]' packages/sdk-core/package.json)

echo "Comparing ${OLD_VERSION} (previous) to ${NEW_VERSION} (updated)"

# Show files that changed between old and new versions
# Note: Prepend 'v' to version numbers to match git tag format
git -C ../hypercerts-lexicon diff v${OLD_VERSION}..v${NEW_VERSION} --stat

# Show detailed changes in lexicon JSON files
git -C ../hypercerts-lexicon diff v${OLD_VERSION}..v${NEW_VERSION} -- '*.json' | head -200
```

### Step 6: Create structured plan and get user approval

**CRITICAL: Do NOT proceed beyond this step without explicit user approval.**

Based on the CHANGELOG and git diff analysis, create a detailed plan document
(`specs/lexicon-sync/v{OLD_VERSION}-v{NEW_VERSION}.md`) that:

1. **Groups changes by logical feature** (not by file or lexicon)
   - Each feature should be a self-contained unit of work
   - Examples: "Collection Item Weights", "Work Scope Logic Expressions", "Collection Avatar/Banner"

2. **For each feature, document**:
   - CHANGELOG reference (PR number, version)
   - What changed in the lexicon
   - SDK tasks needed:
     - Documentation updates
     - Type exports/aliases to add
     - Helper types needed
     - Usage examples to add
   - Validation steps (build, test, type checking)
   - Changeset requirements (bump type and justification)

3. **Order changes logically**:
   - Group related changes together
   - Put simpler changes before complex ones
   - Consider dependencies between changes

4. **Write the plan to `specs/lexicon-sync/v{OLD_VERSION}-v{NEW_VERSION}.md`**
   - Create the `specs/lexicon-sync/` directory if it doesn't exist
   - Use the exact version numbers from package.json

Example plan structure:

```markdown
# Lexicon Sync Plan: v{OLD} → v{NEW}

## Current Status

- Old version: ...
- New version: ...
- Build status: ...
- Test status: ...

## Changes to Implement

### Change 1: [Feature Name] (beta.X)

**CHANGELOG Reference**: PR #XXX - ...

**What Changed**:

- Bullet points describing the lexicon changes

**SDK Tasks**:

- [ ] Add/update documentation for X
- [ ] Add type exports for Y
- [ ] Add usage examples
- [ ] Build and test
- [ ] Create changeset (minor/major - reason)

**Validation**:

- [ ] Format check passes (`pnpm format:check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Types export correctly

**Status**: ⏳ Pending / 🚧 In Progress / ✅ Complete

---

### Change 2: [Next Feature] (beta.Y)

**CHANGELOG Reference**: PR #YYY - ...

**What Changed**:

- ...

**SDK Tasks**:

- [ ] Task 1
- [ ] Task 2
- [ ] ...

**Validation**:

- [ ] Format check passes (`pnpm format:check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Types export correctly

**Status**: ⏳ Pending

---
```

Present this plan to the user and ask:

> "I've analyzed the changes between v{OLD_VERSION} and v{NEW_VERSION} and created a plan in
> `specs/lexicon-sync/v{OLD_VERSION}-v{NEW_VERSION}.md`.
>
> The plan breaks down the sync into {N} logical changes that will be implemented one at a time.
>
> Should I proceed with implementing Change 1: [Feature Name]?"

**Wait for explicit user confirmation before proceeding to Step 7.**

### Step 7: Implement ONE logical change at a time

**IMPORTANT**: Only work on ONE change from the plan at a time.

For the current change (e.g., "Change 1: Collection Item Weights"):

1. **Update documentation** in `packages/sdk-core/src/services/hypercerts/types.ts`:
   - Add JSDoc comments for new/changed types
   - Add usage examples
   - Document breaking changes if any

2. **Add type exports** if needed:
   - Add type aliases for new lexicon types
   - Add helper types for SDK operations
   - Export from appropriate modules

3. **Update SDK code** if needed:
   - Modify operations to support new fields
   - Update validation logic
   - Add helper functions

4. **Validate changes**:

   ```bash
   pnpm --filter @hypercerts-org/sdk-core format:check
   pnpm --filter @hypercerts-org/sdk-core lint
   pnpm --filter @hypercerts-org/sdk-core typecheck
   pnpm --filter @hypercerts-org/sdk-core build
   pnpm --filter @hypercerts-org/sdk-core test
   ```

5. **Create changeset** for this specific change (only after all validation passes):

   ```bash
   pnpm changeset
   ```

   - Follow guidance from `writing-changesets` skill
   - Reference the specific feature being added
   - Use appropriate bump type

**After completing these steps for the current change:**

Ask the user:

> "Change {N}: {Feature Name} is complete.
>
> - Documentation added: ✅
> - Types updated: ✅
> - Format check passing: ✅
> - Lint passing: ✅
> - Typecheck passing: ✅
> - Build passing: ✅
> - Tests passing: ✅
> - Changeset created: ✅
>
> Should I proceed with Change {N+1}: {Next Feature Name}?"

**Repeat Step 7 for each change in the plan, getting approval between each one.**

### Step 8: Final validation and cleanup

After ALL changes are implemented:

1. **Run full test suite**:

   ```bash
   pnpm test
   pnpm build
   ```

2. **Review all changesets**:
   - Check if multiple changesets should be combined
   - Ensure consistency in messaging
   - Verify bump types are correct

3. **Update any top-level documentation**:
   - README changes if needed
   - AGENTS.md updates if needed

4. **Mark plan as complete**:
   - Update the plan file with final status
   - All changes should show ✅ Complete

5. **Present final summary** to user with:
   - All changes implemented
   - All changesets created
   - Build/test status
   - Any remaining manual steps needed

## Common Anti-Patterns to Avoid

### Don't Hardcode Lexicon Names

- ❌ `if (lexicon === "HYPERCERTS_LEXICONS") ...`
- ✅ Read dynamically from the lexicons package exports

### Don't Skip the CHANGELOG

- ❌ Immediately update without reviewing changes
- ✅ Always check `CHANGELOG.md` first to see exactly what changed between versions
- ✅ Then run `git diff` for additional context

### Don't Skip the Diff Step

- ❌ Immediately update without reviewing changes
- ✅ Always run `git diff` to see what actually changed

### Don't Forget to Rebuild

- ❌ Update imports and ship
- ✅ Run `pnpm build` to verify type compatibility

## What Gets Synced

The sync process focuses on making SDK changes visible and usable to developers. For each logical change:

### Documentation Updates

1. **Type documentation** - JSDoc comments explaining new features
2. **Usage examples** - Code snippets showing how to use new fields/types
3. **Breaking change notes** - Clear warnings about incompatible changes

### Type System Updates

1. **Type aliases** - Friendly names for lexicon types (e.g., `HypercertClaim = OrgHypercertsClaimActivity.Main`)
2. **Helper types** - SDK-specific types for common operations (e.g., `CreateClaimParams`)
3. **Union types** - Combined types for flexible APIs (e.g., `ImageInput = string | Blob`)

### Code Updates (when needed)

1. **New lexicons**:
   - Add `*_LEXICON_JSON` imports from `@hypercerts-org/lexicon`
   - Add to `HYPERCERT_LEXICONS` array
   - Add NSID to `HYPERCERT_COLLECTIONS` object if it's a record type

2. **Modified lexicons**:
   - Update type exports if schema changed
   - Add helper types for new fields
   - Update operations to support new features

3. **Removed lexicons**:
   - Remove imports and exports
   - Add deprecation notices
   - Maintain backward compatibility if possible

### Validation

Each change must pass:

- Formatting (`pnpm format:check`)
- Linting (`pnpm lint`)
- TypeScript typechecking (`pnpm typecheck`)
- TypeScript compilation (`pnpm build`)
- All existing tests (`pnpm test`)
- Type export verification

### Changesets

Each logical change gets its own changeset:

- **minor** - New features, backward-compatible changes
- **major** - Breaking changes (rare, requires migration guide)
- **patch** - Bug fixes, documentation only (very rare for lexicon syncs)

## Iterative Process Summary

**DO**: Work on one logical feature at a time, validate, get approval, repeat **DON'T**: Try to sync everything at once
in a big batch

This ensures:

- Each change is reviewable in isolation
- Problems are caught early
- Changesets accurately describe what changed
- User has control over the process
