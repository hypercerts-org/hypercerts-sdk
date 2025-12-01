# Tooling, Documentation & Testing Specification

## Build & Tooling

- Emit both ESM and CJS bundles with declaration files and source maps.
- Use Rollup with TypeScript, CommonJS, NodeResolve, and DTS plugins.
- Enforce ESLint (flat config) + Prettier via pnpm scripts and Husky.
- Target Node 18+; ensure CI checks Node 18, 20, latest LTS.
- Integrate config validation (Zod) during builder initialization.
- Provide optional telemetry hooks (`onRequest`, `onResponse`, `onError`) and a lightweight event bus.

## Documentation Structure

1. `README.md` – positioning, quick start, minimal snippet.
2. `Concepts` guide – PDS vs SDS, sessions, lexicons, domain services.
3. `How-to` guides – hypercert creation, SDS collaboration, custom claims integration.
4. Typedoc-generated API reference – linked from README/docs site.
5. `docs/examples/` – runnable snippets (Drizzle store, Redis store, Next.js routes, Express routes, hypercert
   workflows).
6. `docs/MIGRATION.md` – mapping existing Ma Earth code to SDK constructs.
7. `docs/AGENTS.md` – automation/agent expectations.
8. Optional design notes for DPoP handling, caching strategy, builder rationale.

## Testing Strategy

- **Contract Tests**: shared suites for `SessionStore`, `StateStore`, and future extension points.
- **Repository Matrix**: cover PDS-only, SDS-only, mixed scenarios.
- **Workflow Tests**: simulate hypercert creation + SDS collaboration flows with mocked services.
- **Performance Smoke Tests**: ensure builder initialization and record creation stay within acceptable latency.
- **Fuzz/Property Tests**: validate lexicon-driven payloads to harden validation routines.
- **Snapshot Tests**: guard documentation example stability and API surface.
- **CI Gates**: separate jobs for lint, unit, integration, contract, docs build.

## Deliverables Checklist

- [ ] Build scripts (`pnpm build`, `pnpm build:types`) wired to Rollup config.
- [ ] Lint/test scripts integrated with CI workflow.
- [ ] Typedoc configuration producing a publishable site or markdown.
- [ ] Example projects runnable via `pnpm examples:<name>`.
- [ ] Coverage thresholds enforced (fail under <90% for core modules).
- [ ] Security scans (`pnpm audit`, optional Snyk) in CI.
- [ ] Publishing workflow (changesets/release please) with semantic versioning.
