# Domain Services & Workflow Specification

## Scope

- Capture higher-level business flows that sit on top of repository primitives.
- Provide re-usable services for hypercert records, repository access, and SDS organizations.
- Define workflow coordinators and event contracts for long-running processes.

## HypercertService

- Location: `services/hypercerts/HypercertService.ts`
- Responsibilities:
  - Register required hypercert lexicons on initialization.
  - Provide helpers such as `createHypercert`, `updateHypercert`, `addEvidence`, `attachLocation`, `listHypercerts`.
  - Automatically route records to PDS or SDS based on repository DID.
  - Validate payloads against lexicons before persisting, surface `ValidationError` with actionable messages.
  - Manage supporting blobs (images, geojson) via `BlobManager`, handling MIME validation and retries.
- API Sketch:

```typescript
const hypercerts = sdk.hypercerts;

await hypercerts.create({
  repo: organizationDid,
  record: HypercertRecordInput,
  blobs: { image, geojson },
});
```

## RepositoryAccessService

- Location: `services/repository/RepositoryAccessService.ts`
- Responsibilities:
  - Wrap SDS collaborator operations with higher-level helpers (`grantAccess`, `revokeAccess`, `listAccess`,
    `hasAccess`).
  - Normalize permission sets into DTOs (e.g., `RepositoryRole`, `RepositoryAccessGrant`) so host apps can map them into
    custom claim hierarchies.
  - Expose optional callbacks/hooks so host apps can mirror repository access in their own databases.
- API Sketch:

```typescript
await sdk.repositoryAccess.grant({
  repo: organizationDid,
  userDid: targetDid,
  role: "editor",
});
```

## SdsOrganizationService

- Location: `services/sds/SdsOrganizationService.ts`
- Responsibilities:
  - Create/list SDS repositories.
  - Provide metadata helpers (`getRepositoryInfo`, `isSharedRepository`).
  - Surface typed responses: DID, handle, description, access type, collaborator counts.
- API Sketch:

```typescript
const { organization } = await sdk.sdsOrganizations.create({
  name: "Ma Earth Org",
  description: "...",
});
```

## Workflow Coordinators

- Provide opinionated orchestration for multi-step flows:
  - `HypercertCreationFlow`: upload blobs → create records → link evidence/locations → emit completion events.
  - `SdsCollaborationFlow`: ensure session → create SDS org → grant collaborators → sync status back to host app.
- Implemented as lightweight classes/functions accepting dependencies (`RepositoryClient`, `HypercertService`, etc.).
- Emit lifecycle events (`onStepStart`, `onStepSuccess`, `onStepError`) and support cancellation/timeouts.

## Event Hooks

- Each domain service exposes typed event emitters to observe lifecycle events without monkey patching.
- Example: `hypercertService.on("recordCreated", handler)` receives `{ repo, uri, cid, payload }`.
- Host apps can wire these into logging/auditing systems or analytics pipelines.
