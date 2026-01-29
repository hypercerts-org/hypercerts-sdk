# SDK API Refinement Specification

## Overview

This spec outlines improvements to the `@hypercerts-org/sdk-core` API to make it more elegant and developer-friendly.
The key changes are:

1. **Multiple package entrypoints** for clean, focused imports
2. **Fluent session-bound API** to reduce boilerplate
3. **Consistent object parameters** throughout
4. **Smart defaults** for server URLs and lexicon registration
5. **Simplified service access** via repository properties

## 1. Package Entrypoints

### Structure

```
@hypercerts-org/sdk-core
├── (main)          → Primary API for most users
├── /types          → All TypeScript types and interfaces
├── /errors         → Error classes
├── /lexicons       → Lexicon definitions and constants
├── /storage        → Storage implementations
└── /testing        → Test utilities and mocks
```

### Import Examples

```typescript
// Main SDK (90% of use cases)
import { ATProtoSDK, createATProtoSDK } from "@hypercerts-org/sdk-core";

// Types only (for type annotations)
import type {
  Session,
  HypercertRecord,
  CollaboratorPermissions,
  ATProtoSDKConfig,
} from "@hypercerts-org/sdk-core/types";

// Errors (for catch blocks)
import { AuthenticationError, ValidationError, SDSRequiredError } from "@hypercerts-org/sdk-core/errors";

// Lexicons (for custom registration or inspection)
import { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS, LexiconRegistry } from "@hypercerts-org/sdk-core/lexicons";

// Storage (for custom implementations or defaults)
import { InMemorySessionStore, InMemoryStateStore } from "@hypercerts-org/sdk-core/storage";
import type { SessionStore, StateStore } from "@hypercerts-org/sdk-core/storage";

// Testing utilities
import { createMockSession, createMockSDK, MockSessionStore } from "@hypercerts-org/sdk-core/testing";
```

### Package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./types": {
      "types": "./dist/types.d.ts",
      "import": "./dist/types.mjs",
      "require": "./dist/types.cjs"
    },
    "./errors": {
      "types": "./dist/errors.d.ts",
      "import": "./dist/errors.mjs",
      "require": "./dist/errors.cjs"
    },
    "./lexicons": {
      "types": "./dist/lexicons.d.ts",
      "import": "./dist/lexicons.mjs",
      "require": "./dist/lexicons.cjs"
    },
    "./storage": {
      "types": "./dist/storage.d.ts",
      "import": "./dist/storage.mjs",
      "require": "./dist/storage.cjs"
    },
    "./testing": {
      "types": "./dist/testing.d.ts",
      "import": "./dist/testing.mjs",
      "require": "./dist/testing.cjs"
    }
  }
}
```

## 2. Entrypoint Contents

### Main Entrypoint (`index.ts`)

Minimal, focused exports for the primary use case:

```typescript
// Core SDK
export { ATProtoSDK, createATProtoSDK } from "./core/SDK.js";
export type { ATProtoSDKConfig, AuthorizeOptions } from "./core/config.js";

// Session type (needed for API signatures)
export type { Session } from "./core/types.js";

// Repository (returned from SDK)
export type { Repository } from "./repository/Repository.js";
```

### Types Entrypoint (`types.ts`)

All type definitions:

```typescript
// Core types
export type { DID, Session } from "./core/types.js";
export type { ATProtoSDKConfig, AuthorizeOptions } from "./core/config.js";
export type { SessionStore, StateStore, CacheInterface, LoggerInterface } from "./core/interfaces.js";

// Entity types
export type { Organization, Collaborator, CollaboratorPermissions } from "./core/types.js";

// Repository types
export type { Repository } from "./repository/Repository.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";

// Hypercert types
export type {
  HypercertRecord,
  RightsRecord,
  LocationRecord,
  ContributionRecord,
  MeasurementRecord,
  EvaluationRecord,
  CollectionRecord,
  HypercertEvidence,
  BlobRef,
} from "./services/hypercerts/types.js";

// Service types
export type { RepositoryRole, RepositoryAccessGrant } from "./services/repository/RepositoryAccessService.js";
export type { OrganizationInfo } from "./services/sds/SdsOrganizationService.js";

// Zod schemas (for runtime validation)
export {
  ATProtoSDKConfigSchema,
  OrganizationSchema,
  CollaboratorSchema,
  CollaboratorPermissionsSchema,
} from "./core/types.js";
```

### Errors Entrypoint (`errors.ts`)

```typescript
export {
  ATProtoSDKError,
  AuthenticationError,
  SessionExpiredError,
  ValidationError,
  NetworkError,
  SDSRequiredError,
} from "./core/errors.js";
```

### Lexicons Entrypoint (`lexicons.ts`)

```typescript
export { LexiconRegistry } from "./repository/LexiconRegistry.js";
export type { ValidationResult } from "./repository/LexiconRegistry.js";

export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "./lexicons/hypercerts/index.js";
```

### Storage Entrypoint (`storage.ts`)

```typescript
export { InMemorySessionStore } from "./storage/InMemorySessionStore.js";
export { InMemoryStateStore } from "./storage/InMemoryStateStore.js";

export type { SessionStore, StateStore, CacheInterface } from "./core/interfaces.js";
```

### Testing Entrypoint (`testing.ts`)

```typescript
export { createMockSession } from "./testing/mocks.js";
export { createMockSDK } from "./testing/mocks.js";
export { MockSessionStore, MockStateStore } from "./testing/stores.js";
export { createTestConfig } from "./testing/config.js";
```

## 3. Fluent Session-Bound API

### Current (Awkward)

```typescript
const sdk = new ATProtoSDK(config);
const session = await sdk.restoreSession(did);
const repo = sdk.getRepository(session, serverUrl);
const hypercerts = sdk.getHypercertService(repo);
await hypercerts.create({ repo: session.did, ... });
```

### Proposed (Fluent)

```typescript
const sdk = new ATProtoSDK(config);
const session = await sdk.restoreSession(did);

// Repository bound to session, uses configured PDS by default
const repo = sdk.repository(session);

// Services accessed as properties, repo DID implicit
await repo.hypercerts.create({ ... });
await repo.records.list({ collection: "..." });

// SDS repository uses configured SDS URL
const sdsRepo = sdk.repository(session, { server: "sds" });
await sdsRepo.organizations.create({ name: "My Org" });
await sdsRepo.collaborators.grant({ userDid, role: "editor" });

// Custom server URL still supported
const customRepo = sdk.repository(session, { serverUrl: "https://..." });
```

### Repository Interface

```typescript
interface Repository {
  // Identity
  readonly did: string; // Session DID (default repo)
  readonly serverUrl: string; // Server URL
  readonly isSDS: boolean; // Is shared data server

  // Low-level managers
  readonly records: RecordOperations;
  readonly blobs: BlobOperations;
  readonly profile: ProfileOperations;

  // High-level services (always available)
  readonly hypercerts: HypercertOperations;

  // SDS-only services (throw SDSRequiredError on PDS)
  readonly collaborators: CollaboratorOperations;
  readonly organizations: OrganizationOperations;

  // Work with a different repo DID (same server)
  repo(did: string): Repository;
}
```

### Operations Interfaces

```typescript
interface HypercertOperations {
  create(params: CreateHypercertParams): Promise<CreateHypercertResult>;
  update(params: UpdateHypercertParams): Promise<UpdateResult>;
  get(uri: string): Promise<Hypercert>;
  list(params?: ListParams): Promise<PaginatedList<Hypercert>>;
  delete(uri: string): Promise<void>;

  // Related records
  attachLocation(uri: string, location: LocationParams): Promise<UpdateResult>;
  addEvidence(uri: string, evidence: HypercertEvidence[]): Promise<UpdateResult>;
  addContribution(uri: string, contribution: ContributionParams): Promise<UpdateResult>;

  // Collections
  createCollection(params: CreateCollectionParams): Promise<CreateResult>;
  getCollection(uri: string): Promise<Collection>;
  listCollections(params?: ListParams): Promise<PaginatedList<Collection>>;

  // Events
  on<E extends keyof HypercertEvents>(event: E, handler: HypercertEvents[E]): void;
  off<E extends keyof HypercertEvents>(event: E, handler: HypercertEvents[E]): void;
}

interface RecordOperations {
  create(params: { collection: string; record: unknown; rkey?: string }): Promise<CreateResult>;
  update(params: { collection: string; rkey: string; record: unknown }): Promise<UpdateResult>;
  get(params: { collection: string; rkey: string }): Promise<Record>;
  list(params: { collection: string; limit?: number; cursor?: string }): Promise<PaginatedList<Record>>;
  delete(params: { collection: string; rkey: string }): Promise<void>;
}

interface CollaboratorOperations {
  grant(params: { userDid: string; role: RepositoryRole }): Promise<void>;
  revoke(params: { userDid: string }): Promise<void>;
  list(): Promise<RepositoryAccessGrant[]>;
  hasAccess(userDid: string): Promise<boolean>;
  getRole(userDid: string): Promise<RepositoryRole | null>;
}

interface OrganizationOperations {
  create(params: { name: string; description?: string; handle?: string }): Promise<OrganizationInfo>;
  get(did: string): Promise<OrganizationInfo | null>;
  list(): Promise<OrganizationInfo[]>;
}
```

## 4. Consistent Object Parameters

### Rules

1. All methods take a single object parameter (except simple getters with one ID)
2. `repo` parameter is implicit from Repository context
3. Optional parameters have sensible defaults

### Before/After Examples

```typescript
// BEFORE: Inconsistent
await profile.get(repo);                              // Positional
await collaborators.list(repo);                       // Positional
await collaborators.grant({ repo, userDid, ... });   // Object
await records.create({ repo, collection, ... });     // Object with redundant repo

// AFTER: Consistent (repo implicit)
await repo.profile.getBskyProfile();                 // No params needed
await repo.profile.getCertifiedProfile();            // Hypercerts-specific
await repo.collaborators.list();                     // No params needed
await repo.collaborators.grant({ userDid, role });   // Object, no repo
await repo.records.create({ collection, record });   // Object, no repo

// For operations on different DID
await repo.repo(otherDid).profile.getBskyProfile();
```

## 5. Smart Defaults

### Lexicon Auto-Registration

```typescript
// Lexicons registered automatically by default
const sdk = new ATProtoSDK({
  oauth: { ... },
  servers: { pds: "...", sds: "..." },
  // lexicons auto-registered
});

// Opt-out or customize
const sdk = new ATProtoSDK({
  oauth: { ... },
  lexicons: {
    autoRegister: false,     // Don't auto-register
    additional: [...],       // Extra lexicons to register
  },
});
```

### Server URL Defaults

```typescript
// Uses config.servers.pds
const pdsRepo = sdk.repository(session);

// Uses config.servers.sds
const sdsRepo = sdk.repository(session, { server: "sds" });

// Explicit URL overrides
const customRepo = sdk.repository(session, { serverUrl: "https://..." });
```

### Implicit Repo DID

```typescript
// Uses session.did by default
const repo = sdk.repository(session);
await repo.hypercerts.create({ ... }); // Creates in session.did

// Work with different repo
const orgRepo = repo.repo(orgDid);
await orgRepo.hypercerts.create({ ... }); // Creates in orgDid
```

## 6. Compound Operations

### Hypercert Creation with Related Records

```typescript
// BEFORE: Multiple calls
const { hypercertUri } = await hypercerts.create({ ... });
await hypercerts.attachLocation({ hypercertUri, ... });
await hypercerts.addContribution({ hypercertUri, ... });

// AFTER: Single call with optional related data
const result = await repo.hypercerts.create({
  title: "My Impact",
  description: "...",
  workScope: "...",
  workTimeframeFrom: "2024-01-01",
  workTimeframeTo: "2024-12-31",
  rights: {
    name: "Attribution",
    type: "CC-BY-4.0",
    description: "...",
  },

  // Optional: attached in same transaction
  image: imageBlob,
  location: {
    value: "New York, NY",
    geojson: geojsonBlob,
  },
  contributions: [{
    contributors: [did1, did2],
    role: "Researchers",
  }],
  evidence: [{
    uri: "https://...",
    title: "Research Paper",
  }],
});
```

## 7. Remove Redundant Workflow Classes

### Current State

- `HypercertCreationFlow` duplicates `HypercertService.create()`
- `SdsCollaborationFlow` duplicates `RepositoryAccessService`
- Workflows add step events but are awkward to use

### Proposal

Remove workflow classes, add progress callbacks to service methods:

```typescript
// Progress callback option
await repo.hypercerts.create({
  ...params,
  onProgress: (step) => {
    console.log(`${step.name}: ${step.status}`);
    // { name: "uploadImage", status: "start" | "success" | "error" }
  },
});

// Or use events
repo.hypercerts.on("progress", (step) => { ... });
```

## 8. File Structure Changes

### New Structure

```
packages/sdk-core/src/
├── index.ts                    # Main entrypoint (minimal exports)
├── types.ts                    # Types entrypoint
├── errors.ts                   # Errors entrypoint
├── lexicons.ts                 # Lexicons entrypoint
├── storage.ts                  # Storage entrypoint
├── testing.ts                  # Testing entrypoint
│
├── core/
│   ├── SDK.ts                  # ATProtoSDK class
│   ├── config.ts               # Configuration
│   ├── types.ts                # Core types
│   ├── interfaces.ts           # Storage/cache interfaces
│   └── errors.ts               # Error classes
│
├── repository/
│   ├── Repository.ts           # NEW: Unified repository interface
│   ├── RecordOperations.ts     # Record CRUD (renamed)
│   ├── BlobOperations.ts       # Blob operations (renamed)
│   ├── ProfileOperations.ts    # Profile operations (renamed)
│   ├── CollaboratorOperations.ts # SDS collaborators (renamed)
│   ├── OrganizationOperations.ts # SDS organizations (NEW, from service)
│   ├── HypercertOperations.ts  # Hypercert operations (from service)
│   └── LexiconRegistry.ts      # Lexicon management
│
├── storage/
│   ├── InMemorySessionStore.ts
│   └── InMemoryStateStore.ts
│
├── lexicons/
│   └── hypercerts/
│       ├── index.ts
│       └── *.json
│
└── testing/
    ├── mocks.ts
    ├── stores.ts
    └── config.ts
```

### Removed/Consolidated

- `services/hypercerts/HypercertService.ts` → `repository/HypercertOperations.ts`
- `services/repository/RepositoryAccessService.ts` → `repository/CollaboratorOperations.ts`
- `services/sds/SdsOrganizationService.ts` → `repository/OrganizationOperations.ts`
- `services/workflows/*` → Removed (progress callbacks instead)
- `repository/*Manager.ts` → Renamed to `*Operations.ts`
- `auth/OAuthClient.ts` → Internal to SDK (not exported)

## 9. Migration Guide

### For Existing Users

```typescript
// BEFORE
import {
  ATProtoSDK,
  HypercertService,
  RepositoryClient,
  ValidationError,
  HYPERCERT_LEXICONS,
  InMemorySessionStore,
} from "@hypercerts-org/sdk-core";

// AFTER
import { ATProtoSDK } from "@hypercerts-org/sdk-core";
import { ValidationError } from "@hypercerts-org/sdk-core/errors";
import { HYPERCERT_LEXICONS } from "@hypercerts-org/sdk-core/lexicons";
import { InMemorySessionStore } from "@hypercerts-org/sdk-core/storage";
import type { HypercertRecord } from "@hypercerts-org/sdk-core/types";

// BEFORE
const repo = sdk.getRepository(session, serverUrl);
const hypercerts = sdk.getHypercertService(repo);
await hypercerts.create({ repo: session.did, ... });

// AFTER
const repo = sdk.repository(session);
await repo.hypercerts.create({ ... });
```

## 10. Implementation Phases

### Phase 1: Multiple Entrypoints

- Create entrypoint files (`types.ts`, `errors.ts`, etc.)
- Update `package.json` exports
- Update Rollup config for multiple outputs
- Maintain backward compatibility in main export

### Phase 2: Repository Refactor

- Create new `Repository` class
- Rename managers to operations
- Move services into repository
- Add implicit repo DID handling

### Phase 3: API Consistency

- Convert all methods to object parameters
- Add smart defaults for server URLs
- Implement auto lexicon registration

### Phase 4: Compound Operations

- Add inline location/contribution/evidence to create
- Add progress callbacks
- Remove workflow classes

### Phase 5: Testing Utilities

- Create mock factories
- Add test helpers
- Document testing patterns

### Phase 6: Documentation

- Update README with new API
- Add migration guide
- Update all examples

## 11. Backward Compatibility

During transition, maintain old exports with deprecation warnings:

```typescript
// In main index.ts
/** @deprecated Import from "@hypercerts-org/sdk-core/errors" instead */
export * from "./core/errors.js";

/** @deprecated Use sdk.repository(session) instead */
export { RepositoryClient } from "./repository/RepositoryClient.js";
```

Remove deprecated exports in next major version.
