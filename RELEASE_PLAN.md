# Release Strategy: Changesets + Turborepo + GitHub Actions

## Overview

Automated package releases using Changesets with:
- Beta releases on `develop` branch pushes
- Stable releases on `main` branch merges
- Automatic changelog generation with GitHub PR/commit links
- Hierarchical dependency handling (lexicon > core > react)
- Husky pre-commit warning for missing changesets

## Package Dependency Hierarchy

```
@hypercerts-org/lexicon (base - no internal deps)
       |
@hypercerts-org/sdk-core (depends on lexicon)
       |
@hypercerts-org/sdk-react (depends on sdk-core)
```

## Implementation Steps

### Step 1: Install Changesets

```bash
pnpm add -Dw @changesets/cli @changesets/changelog-github
pnpm changeset init
```

### Step 2: Create .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "hypercerts-org/hypercerts-sdk" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Key setting: `updateInternalDependencies: "patch"` ensures when lexicon bumps, sdk-core dependency updates automatically.

### Step 3: Update Root package.json Scripts

Add these scripts:

```json
{
  "scripts": {
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build && changeset publish"
  }
}
```

### Step 4: Update .husky/pre-commit

Replace contents with:

```bash
pnpm build

# Warn if committing package changes without a changeset
if git diff --cached --name-only | grep -q "^packages/" && \
   ! git diff --cached --name-only | grep -q "^\.changeset/.*\.md$"; then
  echo ""
  echo "Warning: You are committing package changes without a changeset."
  echo "Run 'pnpm changeset' before pushing if this includes user-facing changes."
  echo ""
fi
```

### Step 5: Create GitHub Workflows

#### A. .github/workflows/pr-check.yml

```yaml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm lint

  changeset-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - name: Check for changeset
        run: |
          if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -q "^packages/"; then
            if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -q "^\.changeset/.*\.md$"; then
              echo "Changeset found"
            else
              echo "::warning::No changeset found. Run 'pnpm changeset' if this PR includes user-facing changes."
            fi
          else
            echo "No package changes detected"
          fi
```

#### B. .github/workflows/release.yml (Stable from main)

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
          title: "chore: release packages"
          commit: "chore: release packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Log published packages
        if: steps.changesets.outputs.published == 'true'
        run: echo "Published - ${{ steps.changesets.outputs.publishedPackages }}"
```

#### C. .github/workflows/release-beta.yml (Beta from develop)

```yaml
name: Release Beta

on:
  push:
    branches: [develop]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release-beta:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test

      - name: Enter prerelease mode (if not already)
        run: |
          if [ ! -f .changeset/pre.json ]; then
            pnpm changeset pre enter beta
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add .changeset/pre.json
            git commit -m "chore: enter beta prerelease mode"
          fi

      - name: Version packages
        run: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish beta packages
        run: pnpm changeset publish --tag beta
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Commit and push version changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git diff --staged --quiet || git commit -m "chore: version packages (beta)"
          git push
```

### Step 6: Delete Old Workflows

Remove these files:
- .github/workflows/create-release-sdk.yml
- .github/workflows/create-prerelease-sdk.yml
- .github/workflows/dryrun-release-ci-sdk.yml

## Files Summary

| File | Action |
|------|--------|
| .changeset/config.json | Create |
| package.json (root) | Add 3 scripts |
| .husky/pre-commit | Update |
| .github/workflows/pr-check.yml | Create |
| .github/workflows/release.yml | Create |
| .github/workflows/release-beta.yml | Create |
| .github/workflows/create-release-sdk.yml | Delete |
| .github/workflows/create-prerelease-sdk.yml | Delete |
| .github/workflows/dryrun-release-ci-sdk.yml | Delete |

## Developer Workflow

### Adding a Changeset

```bash
pnpm changeset
# 1. Select packages (space to select, enter to confirm)
# 2. Choose bump type (major/minor/patch)
# 3. Write changelog summary
```

### Release Flow

**Stable (main):**
1. Merge PR with changeset to main
2. Action creates "Release PR" accumulating changes
3. Merge Release PR to publish @latest

**Beta (develop):**
1. Merge PR with changeset to develop
2. Action auto-publishes to npm @beta
3. Install via: npm install @hypercerts-org/sdk-core@beta

### Exiting Beta (before merging develop to main)

```bash
pnpm changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"
```

## Required GitHub Secrets

- NPM_TOKEN: npm automation token (npmjs.com > Access Tokens > Automation)

## Optional: Changeset Bot

Install Changeset Bot (https://github.com/apps/changeset-bot) for PR comments about missing changesets.
