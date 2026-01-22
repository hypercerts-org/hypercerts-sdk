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
  // set up with your pds url.
  // entryway doesn't work for this. Has to be a PDS URL.
  servers: {
    pds: "https://pds-eu-west4.test.certified.app",
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
  shortDescription: "1000 trees planted in rainforest",
  description: "Planted 1000 trees in the Amazon rainforest region",
  workScope: "Environmental Conservation",
  workTimeFrameFrom: "2025-01-01T00:00:00Z",
  workTimeFrameTo: "2025-12-31T23:59:59Z",
  rights: {
    name: "Attribution",
    type: "license",
    description: "CC-BY-4.0",
  },
});
```

## Local Development

For local development and testing, you can use HTTP loopback URLs with `localhost` or `127.0.0.1`:

### NextJS App Router Example

```typescript
// lib/atproto.ts
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

const sdk = createATProtoSDK({
  oauth: {
    // Use localhost for client_id (loopback client)
    clientId: "http://localhost/",

    // Use 127.0.0.1 with your app's port for redirect
    redirectUri: "http://127.0.0.1:3000/api/auth/callback",

    scope: "atproto",

    // Serve JWKS from your app
    jwksUri: "http://127.0.0.1:3000/.well-known/jwks.json",

    // Load from environment variable
    jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,

    // Optional: suppress warnings
    developmentMode: true,
  },
  servers: {
    // Point to local PDS for testing
    pds: "http://localhost:2583",
  },
  logger: console, // Enable debug logging
});

export default sdk;
```

### API Route Setup

```typescript
// app/api/auth/callback/route.ts
import sdk from "@/lib/atproto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const session = await sdk.callback(searchParams);

    // Store session (use secure httpOnly cookie in production)
    return Response.json({ success: true, did: session.sub });
  } catch (error) {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }
}
```

### Serve JWKS Endpoint

```typescript
// app/.well-known/jwks.json/route.ts
export async function GET() {
  const jwk = JSON.parse(process.env.ATPROTO_JWK_PRIVATE!);

  // Return public keys only (remove private key 'd' parameter)
  const publicKeys = jwk.keys.map(({ d, ...publicKey }) => publicKey);

  return Response.json({ keys: publicKeys });
}
```

### Environment Variables

```bash
# .env.local
ATPROTO_JWK_PRIVATE='{"keys":[{"kty":"EC","crv":"P-256",...}]}'
```

### Important Notes

> **Authorization Server Support**: The AT Protocol OAuth spec makes loopback support **optional**. Most AT Protocol
> servers support loopback clients for development, but verify your target authorization server supports this feature.

> **Port Matching**: Redirect URIs can use any port - the authorization server ignores port numbers when validating
> loopback redirects (only the path must match).

> **Production Use**: ⚠️ Never use HTTP loopback URLs in production. Always use HTTPS with proper TLS certificates.

> **IP vs Hostname**: Use `http://localhost/` for `clientId` and `http://127.0.0.1:<port>` for `redirectUri` and
> `jwksUri` (this is the recommended pattern per AT Protocol spec).

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

The SDK uses a `ConfigurableAgent` to route requests to different servers while maintaining your OAuth authentication:

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
   - Each Repository uses a `ConfigurableAgent` that wraps your OAuth session's fetch handler
   - The agent routes all requests to the specified server URL (PDS, SDS, or custom)
   - When you call `.repo(did)`, a new Repository is created with the same server configuration
   - Your OAuth session provides authentication (DPoP, access tokens), while the agent handles routing
   - This enables simultaneous connections to multiple servers with one authentication session

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

### 2. Authentication & OAuth Permissions

The SDK uses OAuth 2.0 for authentication with granular permission control.

#### Basic Authentication

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

#### OAuth Scopes & Permissions

Control exactly what your app can access using type-safe permission builders:

```typescript
import { PermissionBuilder, ScopePresets, buildScope } from "@hypercerts-org/sdk-core";

// Use ready-made presets
const scope = ScopePresets.EMAIL_AND_PROFILE; // Request email + profile access
const scope = ScopePresets.POSTING_APP; // Full posting capabilities

// Or build custom permissions
const scope = buildScope(
  new PermissionBuilder()
    .accountEmail("read") // Read user's email
    .repoWrite("app.bsky.feed.post") // Create/update posts
    .blob(["image/*", "video/*"]) // Upload media
    .build(),
);

// Use in OAuth configuration
const sdk = createATProtoSDK({
  oauth: {
    clientId: "your-client-id",
    redirectUri: "https://your-app.com/callback",
    scope: scope, // Your custom scope
    // ... other config
  },
});
```

**Available Presets:**

- `EMAIL_READ` - User's email address
- `PROFILE_READ` / `PROFILE_WRITE` - Profile access
- `POST_WRITE` - Create posts
- `SOCIAL_WRITE` - Likes, reposts, follows
- `MEDIA_UPLOAD` - Image and video uploads
- `POSTING_APP` - Full posting with media
- `EMAIL_AND_PROFILE` - Common combination

See [OAuth Permissions Documentation](./docs/implementations/atproto_oauth_scopes.md) for detailed usage.

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
const hypercert = await repo.hypercerts.get("at://did:plc:user123/org.hypercerts.claim/abc123");

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
await repo.hypercerts.update("at://did:plc:user123/org.hypercerts.claim/abc123", {
  title: "Updated Climate Research Project",
  description: "Expanded scope to include renewable energy",
  impact: {
    scope: ["Climate Change", "Carbon Capture", "Renewable Energy"],
    work: { from: "2024-01-01", to: "2026-12-31" },
    contributors: ["did:plc:researcher1", "did:plc:researcher2"],
  },
});
```

#### Deleting a Hypercert

```typescript
await repo.hypercerts.delete("at://did:plc:user123/org.hypercerts.claim/abc123");
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

### 5. Collections and Projects

Collections organize multiple hypercerts into logical groupings. Projects are a special type of collection with
`type="project"`.

#### Creating a Collection

```typescript
// Create a collection with weighted items
const collection = await repo.hypercerts.createCollection({
  title: "Climate Projects 2024",
  shortDescription: "Our climate impact portfolio",
  description: "A curated collection of climate-related hypercerts",
  items: [
    {
      itemIdentifier: { uri: hypercert1Uri, cid: hypercert1Cid },
      itemWeight: "0.5",
    },
    {
      itemIdentifier: { uri: hypercert2Uri, cid: hypercert2Cid },
      itemWeight: "0.3",
    },
    {
      itemIdentifier: { uri: hypercert3Uri, cid: hypercert3Cid },
      itemWeight: "0.2",
    },
  ],
  avatar: avatarBlob, // optional
  banner: bannerBlob, // optional
});

console.log("Created collection:", collection.uri);
```

#### Creating a Project

Projects are collections with automatic `type="project"`:

```typescript
const project = await repo.hypercerts.createProject({
  title: "Rainforest Restoration",
  shortDescription: "Multi-year restoration initiative",
  description: "Comprehensive rainforest restoration project",
  items: [
    {
      itemIdentifier: { uri: activity1Uri, cid: activity1Cid },
      itemWeight: "0.6",
    },
    {
      itemIdentifier: { uri: activity2Uri, cid: activity2Cid },
      itemWeight: "0.4",
    },
  ],
});
```

#### Attaching Locations

Both collections and projects can have location data attached as a sidecar record:

```typescript
// Attach location to a project
const locationResult = await repo.hypercerts.attachLocationToProject(projectUri, {
  lpVersion: "1.0",
  srs: "EPSG:4326",
  locationType: "coordinate-decimal",
  location: "https://example.com/location.geojson", // or use a Blob
  name: "Project Site",
  description: "Main restoration site coordinates",
});

// Also works for collections
await repo.hypercerts.attachLocationToCollection(collectionUri, locationParams);
```

#### Listing and Retrieving

```typescript
// Get a specific collection
const collection = await repo.hypercerts.getCollection(collectionUri);

// List all collections
const { records } = await repo.hypercerts.listCollections();

// Get a specific project
const project = await repo.hypercerts.getProject(projectUri);

// List all projects
const { records } = await repo.hypercerts.listProjects();
```

#### Updating Collections and Projects

```typescript
// Update collection
await repo.hypercerts.updateCollection(collectionUri, {
  title: "Updated Title",
  items: [
    /* updated items */
  ],
  avatar: newAvatarBlob, // or null to remove
});

// Update project (same API)
await repo.hypercerts.updateProject(projectUri, {
  shortDescription: "Updated description",
  banner: null, // removes banner
});
```

#### Deleting

```typescript
// Delete collection
await repo.hypercerts.deleteCollection(collectionUri);

// Delete project
await repo.hypercerts.deleteProject(projectUri);

// Remove location from project
await repo.hypercerts.removeLocationFromProject(projectUri);
```

### 6. Blob Operations (Images & Files)

```typescript
// Upload an image or file
const blobResult = await repo.blobs.upload(imageFile);
console.log("Blob uploaded:", blobResult.ref.$link);

// Download a blob
const blobData = await repo.blobs.get("did:plc:user123", "bafyreiabc123...");
```

### 7. Organizations (SDS only)

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

### 8. Collaborator Management (SDS only)

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

### 9. Generic Record Operations

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

### 10. Profile Management (PDS only)

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

| Operation          | Method                                           | PDS | SDS | Returns                      |
| ------------------ | ------------------------------------------------ | --- | --- | ---------------------------- |
| **Records**        |                                                  |     |     |                              |
| Create record      | `repo.records.create()`                          | ✅  | ✅  | `{ uri, cid }`               |
| Get record         | `repo.records.get()`                             | ✅  | ✅  | Record data                  |
| Update record      | `repo.records.update()`                          | ✅  | ✅  | `{ uri, cid }`               |
| Delete record      | `repo.records.delete()`                          | ✅  | ✅  | void                         |
| List records       | `repo.records.list()`                            | ✅  | ✅  | `{ records, cursor? }`       |
| **Hypercerts**     |                                                  |     |     |                              |
| Create hypercert   | `repo.hypercerts.create()`                       | ✅  | ✅  | `{ uri, cid, value }`        |
| Get hypercert      | `repo.hypercerts.get()`                          | ✅  | ✅  | Full hypercert               |
| Update hypercert   | `repo.hypercerts.update()`                       | ✅  | ✅  | `{ uri, cid }`               |
| Delete hypercert   | `repo.hypercerts.delete()`                       | ✅  | ✅  | void                         |
| List hypercerts    | `repo.hypercerts.list()`                         | ✅  | ✅  | `{ records, cursor? }`       |
| Add contribution   | `repo.hypercerts.addContribution()`              | ✅  | ✅  | Contribution                 |
| Add measurement    | `repo.hypercerts.addMeasurement()`               | ✅  | ✅  | Measurement                  |
| **Collections**    |                                                  |     |     |                              |
| Create collection  | `repo.hypercerts.createCollection()`             | ✅  | ✅  | `{ uri, cid, record }`       |
| Get collection     | `repo.hypercerts.getCollection()`                | ✅  | ✅  | Collection data              |
| List collections   | `repo.hypercerts.listCollections()`              | ✅  | ✅  | `{ records, cursor? }`       |
| Update collection  | `repo.hypercerts.updateCollection()`             | ✅  | ✅  | `{ uri, cid }`               |
| Delete collection  | `repo.hypercerts.deleteCollection()`             | ✅  | ✅  | void                         |
| Attach location    | `repo.hypercerts.attachLocationToCollection()`   | ✅  | ✅  | `{ uri, cid }`               |
| Remove location    | `repo.hypercerts.removeLocationFromCollection()` | ✅  | ✅  | void                         |
| **Projects**       |                                                  |     |     |                              |
| Create project     | `repo.hypercerts.createProject()`                | ✅  | ✅  | `{ uri, cid, record }`       |
| Get project        | `repo.hypercerts.getProject()`                   | ✅  | ✅  | Project data                 |
| List projects      | `repo.hypercerts.listProjects()`                 | ✅  | ✅  | `{ records, cursor? }`       |
| Update project     | `repo.hypercerts.updateProject()`                | ✅  | ✅  | `{ uri, cid }`               |
| Delete project     | `repo.hypercerts.deleteProject()`                | ✅  | ✅  | void                         |
| Attach location    | `repo.hypercerts.attachLocationToProject()`      | ✅  | ✅  | `{ uri, cid }`               |
| Remove location    | `repo.hypercerts.removeLocationFromProject()`    | ✅  | ✅  | void                         |
| **Blobs**          |                                                  |     |     |                              |
| Upload blob        | `repo.blobs.upload()`                            | ✅  | ✅  | `{ ref, mimeType, size }`    |
| Get blob           | `repo.blobs.get()`                               | ✅  | ✅  | Blob data                    |
| **Profile**        |                                                  |     |     |                              |
| Get profile        | `repo.profile.get()`                             | ✅  | ❌  | Profile data                 |
| Update profile     | `repo.profile.update()`                          | ✅  | ❌  | void                         |
| **Organizations**  |                                                  |     |     |                              |
| Create org         | `repo.organizations.create()`                    | ❌  | ✅  | `{ did, name, ... }`         |
| Get org            | `repo.organizations.get()`                       | ❌  | ✅  | Organization                 |
| List orgs          | `repo.organizations.list()`                      | ❌  | ✅  | `{ organizations, cursor? }` |
| **Collaborators**  |                                                  |     |     |                              |
| Grant access       | `repo.collaborators.grant()`                     | ❌  | ✅  | void                         |
| Revoke access      | `repo.collaborators.revoke()`                    | ❌  | ✅  | void                         |
| List collaborators | `repo.collaborators.list()`                      | ❌  | ✅  | `{ collaborators, cursor? }` |
| Check access       | `repo.collaborators.hasAccess()`                 | ❌  | ✅  | boolean                      |
| Get role           | `repo.collaborators.getRole()`                   | ❌  | ✅  | Role string                  |
| Get permissions    | `repo.collaborators.getPermissions()`            | ❌  | ✅  | Permissions                  |
| Transfer ownership | `repo.collaborators.transferOwnership()`         | ❌  | ✅  | void                         |

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

| Lexicon Type                          | SDK Alias               |
| ------------------------------------- | ----------------------- |
| `OrgHypercertsClaim.Main`             | `HypercertClaim`        |
| `OrgHypercertsClaimRights.Main`       | `HypercertRights`       |
| `OrgHypercertsClaimContribution.Main` | `HypercertContribution` |
| `OrgHypercertsClaimMeasurement.Main`  | `HypercertMeasurement`  |
| `OrgHypercertsClaimEvaluation.Main`   | `HypercertEvaluation`   |
| `OrgHypercertsCollection.Main`        | `HypercertCollection`   |
| `AppCertifiedLocation.Main`           | `HypercertLocation`     |

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

### Multi-Server Routing with ConfigurableAgent

The `ConfigurableAgent` allows you to create custom agents that route to specific servers:

```typescript
import { ConfigurableAgent } from "@hypercerts-org/sdk-core";

// Authenticate once with your PDS
const session = await sdk.callback(params);

// Create agents for different servers using the same session
const pdsAgent = new ConfigurableAgent(session, "https://bsky.social");
const sdsAgent = new ConfigurableAgent(session, "https://sds.hypercerts.org");
const orgAgent = new ConfigurableAgent(session, "https://sds-org-a.example.com");

// Use agents directly with AT Protocol APIs
await pdsAgent.com.atproto.repo.createRecord({...});
await sdsAgent.com.atproto.repo.listRecords({...});

// Or pass to Repository for high-level operations
// (Repository internally uses ConfigurableAgent)
```

This is useful for:

- Connecting to multiple SDS instances simultaneously
- Testing against different server environments
- Building tools that work across multiple organizations
- Direct AT Protocol API access with custom routing

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

The SDK exports lexicon types and validation utilities from the `@hypercerts-org/lexicon` package for direct record
manipulation and validation.

#### Lexicon Types

All lexicon types are available with proper TypeScript support:

```typescript
import type {
  HypercertClaim,
  HypercertRights,
  HypercertContribution,
  HypercertCollection,
  HypercertMeasurement,
  HypercertEvaluation,
  HypercertLocation,
  StrongRef,
} from "@hypercerts-org/sdk-core";

// Create a properly typed hypercert claim
const claim: HypercertClaim = {
  $type: "org.hypercerts.claim",
  title: "Community Garden Project",
  shortDescription: "Urban garden serving 50 families", // REQUIRED
  description: "Detailed description...",
  workScope: "Food Security",
  workTimeFrameFrom: "2024-01-01T00:00:00Z", // Note: Capital 'F'
  workTimeFrameTo: "2024-12-31T00:00:00Z", // Note: Capital 'F'
  rights: { uri: "at://...", cid: "..." },
  createdAt: new Date().toISOString(),
};
```

#### Validation

Validate records before creating them:

```typescript
import { validate, OrgHypercertsClaim, HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";

// Validate using the lexicon package
const validation = validate(
  HYPERCERT_COLLECTIONS.CLAIM, // "org.hypercerts.claim"
  claim,
);

if (!validation.valid) {
  console.error("Validation failed:", validation.error);
}

// Or use type-specific validators
const isValid = OrgHypercertsClaim.isMain(claim);
const validationResult = OrgHypercertsClaim.validateMain(claim);
```

#### Using LexiconRegistry

The SDK automatically initializes a LexiconRegistry with all hypercert lexicons. You can access it to validate records
or register custom lexicons:

```typescript
// Access the registry from the SDK
const registry = sdk.getLexiconRegistry();

// Validate a record
const result = registry.validate("org.hypercerts.claim.activity", claimData);

if (!result.valid) {
  console.error("Invalid record:", result.error);
}

// Register a custom lexicon
registry.registerFromJSON({
  lexicon: 1,
  id: "org.myapp.customRecord",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["$type", "title"],
        properties: {
          $type: { type: "string", const: "org.myapp.customRecord" },
          title: { type: "string" },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
});

// Check if a lexicon is registered
if (registry.isRegistered("org.myapp.customRecord")) {
  console.log("Custom lexicon is ready to use");
}
```

You can also access the registry from a Repository instance:

```typescript
const repo = sdk.repository(session);
const registry = repo.getLexiconRegistry();
```

#### Creating Records with Proper Types

```typescript
import type { HypercertContribution, StrongRef } from "@hypercerts-org/sdk-core";
import { HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";

// Create a contribution record
const contribution: HypercertContribution = {
  $type: HYPERCERT_COLLECTIONS.CONTRIBUTION,
  hypercert: {
    uri: "at://did:plc:abc/org.hypercerts.claim/xyz",
    cid: "bafyrei...",
  } as StrongRef,
  contributors: ["did:plc:contributor1", "did:plc:contributor2"],
  role: "implementer",
  description: "On-ground implementation team",
  workTimeframeFrom: "2024-01-01T00:00:00Z", // Note: lowercase 'f' for contributions
  workTimeframeTo: "2024-06-30T00:00:00Z", // Note: lowercase 'f' for contributions
  createdAt: new Date().toISOString(),
};

// Use with repository operations
await repo.records.create({
  collection: HYPERCERT_COLLECTIONS.CONTRIBUTION,
  record: contribution,
});
```

#### Available Lexicon Collections

```typescript
import { HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";

// Collection NSIDs
HYPERCERT_COLLECTIONS.CLAIM; // "org.hypercerts.claim"
HYPERCERT_COLLECTIONS.RIGHTS; // "org.hypercerts.claim.rights"
HYPERCERT_COLLECTIONS.CONTRIBUTION; // "org.hypercerts.claim.contribution"
HYPERCERT_COLLECTIONS.MEASUREMENT; // "org.hypercerts.claim.measurement"
HYPERCERT_COLLECTIONS.EVALUATION; // "org.hypercerts.claim.evaluation"
HYPERCERT_COLLECTIONS.EVIDENCE; // "org.hypercerts.claim.evidence"
HYPERCERT_COLLECTIONS.COLLECTION; // "org.hypercerts.collection"
HYPERCERT_COLLECTIONS.LOCATION; // "app.certified.location"
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
