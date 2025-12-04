# @hypercerts-org/sdk-core

Framework-agnostic ATProto SDK for Hypercerts. Create, manage, and collaborate on hypercerts using the AT Protocol.

```bash
pnpm add @hypercerts-org/sdk-core
```

## Quick Start

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

// 1. Create SDK with OAuth configuration
const sdk = createATProtoSDK({
  oauth: {
    clientId: "https://your-app.com/client-metadata.json",
    redirectUri: "https://your-app.com/callback",
    scope: "atproto",
    jwksUri: "https://your-app.com/jwks.json",
    jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
  },
});

// 2. Authenticate user
const authUrl = await sdk.authorize("user.bsky.social");
// Redirect user to authUrl...

// 3. Handle OAuth callback
const session = await sdk.callback(callbackParams);

// 4. Get repository and start creating hypercerts
const repo = sdk.getRepository(session);
const claim = await repo.hypercerts.create({
  title: "Tree Planting Initiative 2025",
  description: "Planted 1000 trees in the rainforest",
  impact: {
    scope: ["Environmental Conservation"],
    work: { from: "2025-01-01", to: "2025-12-31" },
    contributors: ["did:plc:contributor1"],
  },
});
```

## Core Concepts

### 1. PDS vs SDS: Understanding Server Types

The SDK supports two types of AT Protocol servers:

#### Personal Data Server (PDS)
- **Purpose**: User's own data storage (e.g., Bluesky)
- **Use case**: Individual hypercerts, personal records
- **Features**: Profile management, basic CRUD operations
- **Example**: `bsky.social`, any Bluesky PDS

#### Shared Data Server (SDS)
- **Purpose**: Collaborative data storage with access control
- **Use case**: Organization hypercerts, team collaboration
- **Features**: Organizations, multi-user access, role-based permissions
- **Example**: `sds.hypercerts.org`

```typescript
// Connect to user's PDS (default)
const pdsRepo = sdk.repository(session);
await pdsRepo.hypercerts.create({ ... }); // Creates in user's PDS

// Connect to SDS for collaboration features
const sdsRepo = sdk.repository(session, { server: "sds" });
await sdsRepo.organizations.create({ name: "My Org" }); // SDS-only feature

// Switch to organization repository (still on SDS)
const orgs = await sdsRepo.organizations.list();
const orgRepo = sdsRepo.repo(orgs.organizations[0].did);
await orgRepo.hypercerts.list(); // Queries organization's hypercerts on SDS
```

#### How Repository Routing Works

When you create or switch repositories, the SDK ensures requests are routed to the correct server:

1. **Initial Repository Creation**
   ```typescript
   // User authenticates (OAuth session knows user's PDS)
   const session = await sdk.callback(params);
   
   // Create PDS repository - routes to user's PDS
   const pdsRepo = sdk.repository(session);
   
   // Create SDS repository - routes to SDS server
   const sdsRepo = sdk.repository(session, { server: "sds" });
   ```

2. **Switching Repositories with `.repo()`**
   ```typescript
   // Start with user's SDS repository
   const userSdsRepo = sdk.repository(session, { server: "sds" });
   
   // Switch to organization's repository
   const orgRepo = userSdsRepo.repo("did:plc:org-did");
   
   // All operations on orgRepo still route to SDS, not user's PDS
   await orgRepo.hypercerts.list(); // ✅ Queries SDS
   await orgRepo.collaborators.list(); // ✅ Queries SDS
   ```

3. **Key Implementation Details**
   - The SDK configures the AT Protocol Agent's service URL when creating repositories
   - When you call `.repo(did)`, a new Repository instance is created that maintains the same server URL
   - This ensures that even when querying different DIDs, requests go to the intended server
   - User's OAuth session provides authentication, but doesn't determine routing

#### Common Patterns

```typescript
// Pattern 1: Personal hypercerts on PDS
const myRepo = sdk.repository(session);
await myRepo.hypercerts.create({ title: "My Personal Impact" });

// Pattern 2: Organization hypercerts on SDS
const sdsRepo = sdk.repository(session, { server: "sds" });
const orgRepo = sdsRepo.repo(organizationDid);
await orgRepo.hypercerts.create({ title: "Team Impact" });

// Pattern 3: Reading another user's hypercerts
const otherUserRepo = myRepo.repo("did:plc:other-user");
await otherUserRepo.hypercerts.list(); // Read-only access to their PDS

// Pattern 4: Collaborating on organization data
const sdsRepo = sdk.repository(session, { server: "sds" });
await sdsRepo.collaborators.grant({
  userDid: "did:plc:teammate",
  role: "editor",
});
const orgRepo = sdsRepo.repo(organizationDid);
// Teammate can now access orgRepo and create hypercerts
```

### 2. Authentication

The SDK uses OAuth 2.0 for authentication with support for both PDS (Personal Data Server) and SDS (Shared Data Server).

```typescript
// First-time user authentication
const authUrl = await sdk.authorize("user.bsky.social");
// Redirect user to authUrl to complete OAuth flow

// Handle the OAuth callback
const session = await sdk.callback({
  code: "...",
  state: "...",
  iss: "...",
});

// Restore existing session for returning users
const session = await sdk.restoreSession("did:plc:user123");

// Get repository for authenticated user
const repo = sdk.getRepository(session);
```

### 3. Working with Hypercerts

#### Creating a Hypercert

```typescript
const hypercert = await repo.hypercerts.create({
  title: "Climate Research Project",
  description: "Research on carbon capture technologies",
  image: imageBlob, // optional: File or Blob
  externalUrl: "https://example.com/project",
  
  impact: {
    scope: ["Climate Change", "Carbon Capture"],
    work: {
      from: "2024-01-01",
      to: "2025-12-31",
    },
    contributors: ["did:plc:researcher1", "did:plc:researcher2"],
  },
  
  rights: {
    license: "CC-BY-4.0",
    allowsDerivatives: true,
    transferrable: false,
  },
});

console.log("Created hypercert:", hypercert.uri);
```

#### Retrieving Hypercerts

```typescript
// Get a specific hypercert by URI
const hypercert = await repo.hypercerts.get(
  "at://did:plc:user123/org.hypercerts.claim/abc123"
);

// List all hypercerts in the repository
const { records } = await repo.hypercerts.list();
for (const claim of records) {
  console.log(claim.value.title);
}

// List with pagination
const { records, cursor } = await repo.hypercerts.list({ limit: 10 });
if (cursor) {
  const nextPage = await repo.hypercerts.list({ limit: 10, cursor });
}
```

#### Updating a Hypercert

```typescript
// Update an existing hypercert
await repo.hypercerts.update(
  "at://did:plc:user123/org.hypercerts.claim/abc123",
  {
    title: "Updated Climate Research Project",
    description: "Expanded scope to include renewable energy",
    impact: {
      scope: ["Climate Change", "Carbon Capture", "Renewable Energy"],
      work: { from: "2024-01-01", to: "2026-12-31" },
      contributors: ["did:plc:researcher1", "did:plc:researcher2"],
    },
  }
);
```

#### Deleting a Hypercert

```typescript
await repo.hypercerts.delete(
  "at://did:plc:user123/org.hypercerts.claim/abc123"
);
```

### 4. Contributions and Measurements

#### Adding Contributions

```typescript
// Add a contribution to a hypercert
const contribution = await repo.hypercerts.addContribution({
  claim: "at://did:plc:user123/org.hypercerts.claim/abc123",
  contributor: "did:plc:contributor456",
  description: "Led the research team and conducted field studies",
  contributionType: "Work",
  percentage: 40.0,
});
```

#### Adding Measurements

```typescript
// Add a measurement/evaluation
const measurement = await repo.hypercerts.addMeasurement({
  claim: "at://did:plc:user123/org.hypercerts.claim/abc123",
  type: "Impact",
  value: 1000,
  unit: "trees planted",
  verifiedBy: "did:plc:auditor789",
  verificationMethod: "On-site inspection with GPS verification",
  measuredAt: new Date().toISOString(),
});
```

### 5. Blob Operations (Images & Files)

```typescript
// Upload an image or file
const blobResult = await repo.blobs.upload(imageFile);
console.log("Blob uploaded:", blobResult.ref.$link);

// Download a blob
const blobData = await repo.blobs.get(
  "did:plc:user123",
  "bafyreiabc123..."
);
```

### 6. Organizations (SDS only)

Organizations allow multiple users to collaborate on shared repositories.

```typescript
// Create an organization
const org = await repo.organizations.create({
  name: "Climate Research Institute",
  description: "Leading research on climate solutions",
  handle: "climate-research", // optional: unique handle
});

console.log("Organization DID:", org.did);

// List all organizations you belong to
const { organizations } = await repo.organizations.list();
for (const org of organizations) {
  console.log(`${org.name} (${org.role})`);
}

// List with pagination
const { organizations, cursor } = await repo.organizations.list({ limit: 10 });

// Get a specific organization
const org = await repo.organizations.get("did:plc:org123");
console.log(`${org.name} - ${org.description}`);
```

### 7. Collaborator Management (SDS only)

Manage who has access to your repository and what they can do.

#### Granting Access

```typescript
// Grant different levels of access
await repo.collaborators.grant({
  userDid: "did:plc:user123",
  role: "editor", // viewer | editor | admin | owner
});

// Roles explained:
// - viewer: Read-only access
// - editor: Can create and edit records
// - admin: Can manage collaborators and settings
// - owner: Full control (same as repository owner)
```

#### Managing Collaborators

```typescript
// List all collaborators with pagination
const { collaborators, cursor } = await repo.collaborators.list();
for (const collab of collaborators) {
  console.log(`${collab.userDid} - ${collab.role}`);
}

// List next page
if (cursor) {
  const nextPage = await repo.collaborators.list({ cursor, limit: 20 });
}

// Check if a user has access
const hasAccess = await repo.collaborators.hasAccess("did:plc:user123");

// Get a specific user's role
const role = await repo.collaborators.getRole("did:plc:user123");
console.log(`User role: ${role}`); // "editor", "admin", etc.

// Get current user's permissions
const permissions = await repo.collaborators.getPermissions();
if (permissions.admin) {
  console.log("You can manage collaborators");
}
if (permissions.create) {
  console.log("You can create records");
}
```

#### Revoking Access

```typescript
// Remove a collaborator
await repo.collaborators.revoke({
  userDid: "did:plc:user123",
});
```

#### Transferring Ownership

```typescript
// Transfer repository ownership (irreversible!)
await repo.collaborators.transferOwnership({
  newOwnerDid: "did:plc:newowner456",
});
```

### 8. Generic Record Operations

For working with any ATProto record type:

```typescript
// Create a generic record
const record = await repo.records.create({
  collection: "org.hypercerts.claim",
  record: {
    $type: "org.hypercerts.claim",
    title: "My Claim",
    // ... record data
  },
});

// Get a record
const record = await repo.records.get({
  collection: "org.hypercerts.claim",
  rkey: "abc123",
});

// Update a record
await repo.records.update({
  collection: "org.hypercerts.claim",
  rkey: "abc123",
  record: {
    $type: "org.hypercerts.claim",
    title: "Updated Title",
    // ... updated data
  },
});

// Delete a record
await repo.records.delete({
  collection: "org.hypercerts.claim",
  rkey: "abc123",
});

// List records with pagination
const { records, cursor } = await repo.records.list({
  collection: "org.hypercerts.claim",
  limit: 50,
});
```

### 9. Profile Management (PDS only)

```typescript
// Get user profile
const profile = await repo.profile.get();
console.log(`${profile.displayName} (@${profile.handle})`);

// Update profile
await repo.profile.update({
  displayName: "Jane Researcher",
  description: "Climate scientist and hypercert enthusiast",
  avatar: avatarBlob, // optional
  banner: bannerBlob, // optional
});
```

## API Reference

### Repository Operations

| Operation | Method | PDS | SDS | Returns |
|-----------|--------|-----|-----|---------|
| **Records** | | | | |
| Create record | `repo.records.create()` | ✅ | ✅ | `{ uri, cid }` |
| Get record | `repo.records.get()` | ✅ | ✅ | Record data |
| Update record | `repo.records.update()` | ✅ | ✅ | `{ uri, cid }` |
| Delete record | `repo.records.delete()` | ✅ | ✅ | void |
| List records | `repo.records.list()` | ✅ | ✅ | `{ records, cursor? }` |
| **Hypercerts** | | | | |
| Create hypercert | `repo.hypercerts.create()` | ✅ | ✅ | `{ uri, cid, value }` |
| Get hypercert | `repo.hypercerts.get()` | ✅ | ✅ | Full hypercert |
| Update hypercert | `repo.hypercerts.update()` | ✅ | ✅ | `{ uri, cid }` |
| Delete hypercert | `repo.hypercerts.delete()` | ✅ | ✅ | void |
| List hypercerts | `repo.hypercerts.list()` | ✅ | ✅ | `{ records, cursor? }` |
| Add contribution | `repo.hypercerts.addContribution()` | ✅ | ✅ | Contribution |
| Add measurement | `repo.hypercerts.addMeasurement()` | ✅ | ✅ | Measurement |
| **Blobs** | | | | |
| Upload blob | `repo.blobs.upload()` | ✅ | ✅ | `{ ref, mimeType, size }` |
| Get blob | `repo.blobs.get()` | ✅ | ✅ | Blob data |
| **Profile** | | | | |
| Get profile | `repo.profile.get()` | ✅ | ❌ | Profile data |
| Update profile | `repo.profile.update()` | ✅ | ❌ | void |
| **Organizations** | | | | |
| Create org | `repo.organizations.create()` | ❌ | ✅ | `{ did, name, ... }` |
| Get org | `repo.organizations.get()` | ❌ | ✅ | Organization |
| List orgs | `repo.organizations.list()` | ❌ | ✅ | `{ organizations, cursor? }` |
| **Collaborators** | | | | |
| Grant access | `repo.collaborators.grant()` | ❌ | ✅ | void |
| Revoke access | `repo.collaborators.revoke()` | ❌ | ✅ | void |
| List collaborators | `repo.collaborators.list()` | ❌ | ✅ | `{ collaborators, cursor? }` |
| Check access | `repo.collaborators.hasAccess()` | ❌ | ✅ | boolean |
| Get role | `repo.collaborators.getRole()` | ❌ | ✅ | Role string |
| Get permissions | `repo.collaborators.getPermissions()` | ❌ | ✅ | Permissions |
| Transfer ownership | `repo.collaborators.transferOwnership()` | ❌ | ✅ | void |

## Type System

Types are generated from ATProto lexicon definitions and exported with friendly aliases:

```typescript
import type {
  HypercertClaim,
  HypercertRights,
  HypercertContribution,
  HypercertMeasurement,
  HypercertEvaluation,
  HypercertCollection,
  HypercertLocation,
} from "@hypercerts-org/sdk-core";

// For validation, use namespaced imports
import { OrgHypercertsClaim } from "@hypercerts-org/sdk-core";

if (OrgHypercertsClaim.isRecord(data)) {
  // data is typed as HypercertClaim
}
```

| Lexicon Type | SDK Alias |
|--------------|-----------|
| `OrgHypercertsClaim.Main` | `HypercertClaim` |
| `OrgHypercertsClaimRights.Main` | `HypercertRights` |
| `OrgHypercertsClaimContribution.Main` | `HypercertContribution` |
| `OrgHypercertsClaimMeasurement.Main` | `HypercertMeasurement` |
| `OrgHypercertsClaimEvaluation.Main` | `HypercertEvaluation` |
| `OrgHypercertsCollection.Main` | `HypercertCollection` |
| `AppCertifiedLocation.Main` | `HypercertLocation` |

## Error Handling

```typescript
import {
  ValidationError,
  NetworkError,
  AuthenticationError,
  SDSRequiredError,
} from "@hypercerts-org/sdk-core/errors";

try {
  await repo.hypercerts.create({ ... });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid hypercert data:", error.message);
  } else if (error instanceof NetworkError) {
    console.error("Network issue:", error.message);
  } else if (error instanceof AuthenticationError) {
    console.error("Authentication failed:", error.message);
  } else if (error instanceof SDSRequiredError) {
    console.error("This operation requires SDS:", error.message);
  }
}
```

## Package Entrypoints

```
@hypercerts-org/sdk-core
├── /              → Full SDK (createATProtoSDK, Repository, types, errors)
├── /types         → TypeScript types (re-exported from @hypercerts-org/lexicon)
├── /errors        → Error classes
├── /lexicons      → LexiconRegistry, HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS
├── /storage       → InMemorySessionStore, InMemoryStateStore
└── /testing       → createMockSession, MockSessionStore
```

## Advanced Usage

### Custom Session Storage

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";
import { InMemorySessionStore } from "@hypercerts-org/sdk-core/storage";

const sdk = createATProtoSDK({
  oauth: { ... },
  sessionStore: new InMemorySessionStore(),
});
```

### Testing with Mocks

```typescript
import { createMockSession, MockSessionStore } from "@hypercerts-org/sdk-core/testing";

const mockSession = createMockSession({
  did: "did:plc:test123",
  handle: "test.user",
});

const mockStore = new MockSessionStore();
await mockStore.set(mockSession);
```

### Working with Lexicons

```typescript
import {
  LexiconRegistry,
  HYPERCERT_LEXICONS,
  HYPERCERT_COLLECTIONS,
} from "@hypercerts-org/sdk-core/lexicons";

const registry = new LexiconRegistry();
registry.registerLexicons(HYPERCERT_LEXICONS);

// Validate a record
const isValid = registry.validate(
  "org.hypercerts.claim",
  claimData
);
```

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build the package
pnpm test           # Run tests
pnpm test:coverage  # Run tests with coverage
pnpm test:watch     # Run tests in watch mode
```

## License

MIT

## Resources

- [ATProto Documentation](https://atproto.com/docs)
- [Hypercerts Documentation](https://hypercerts.org)
- [GitHub Repository](https://github.com/hypercerts-org/hypercerts-sdk)
