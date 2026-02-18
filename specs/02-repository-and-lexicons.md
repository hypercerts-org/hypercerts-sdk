# Repository & Lexicon Specification

## Scope

- Define the unified repository client that works across PDS and SDS.
- Describe record/blob/profile managers plus SDS-only collaborator features.
- Capture SDS repository lifecycle helpers and lexicon registration/validation.

## Repository Client

```typescript
export class RepositoryClient {
  constructor(
    private session: Session,
    private serverUrl: string,
    private lexiconRegistry: LexiconRegistry,
  ) {}

  readonly records: RecordManager;
  readonly blobs: BlobManager;
  readonly profile: ProfileManager;
  readonly collaborators: CollaboratorManager; // throws on PDS

  isSharedDataServer(): boolean;
  getServerUrl(): string;
  getRepo(): string;
}
```

### RecordManager

```typescript
export class RecordManager {
  async create(params: {
    repo: string;
    collection: string;
    record: unknown;
    rkey?: string;
  }): Promise<{ uri: string; cid: string }>;

  async update(params: {
    repo: string;
    collection: string;
    rkey: string;
    record: unknown;
  }): Promise<{ uri: string; cid: string }>;

  async get(params: {
    repo: string;
    collection: string;
    rkey: string;
  }): Promise<{ uri: string; cid: string; value: unknown }>;

  async list(params: { repo: string; collection: string; limit?: number; cursor?: string }): Promise<{
    records: Array<{ uri: string; cid: string; value: unknown }>;
    cursor?: string;
  }>;

  async delete(params: { repo: string; collection: string; rkey: string }): Promise<void>;
}
```

### BlobManager

```typescript
export class BlobManager {
  async upload(params: { repo: string; blob: Blob }): Promise<{
    $type: string;
    ref: { $link: string };
    mimeType: string;
    size: number;
  }>;

  async get(params: { repo: string; cid: string }): Promise<{
    data: Uint8Array;
    mimeType: string;
  }>;
}
```

### ProfileManager

The ProfileManager supports dual profile types: Bluesky (standard AT Protocol) and Certified (hypercerts-specific with
additional fields).

```typescript
export class ProfileManager {
  // Bluesky profiles (app.bsky.actor.profile)
  async getBskyProfile(): Promise<BskyProfile>;
  async createBskyProfile(params: CreateBskyProfileParams): Promise<CreateResult>;
  async updateBskyProfile(params: UpdateBskyProfileParams): Promise<UpdateResult>;

  // Certified profiles (app.certified.actor.profile)
  async getCertifiedProfile(): Promise<CertifiedProfile>;
  async createCertifiedProfile(params: CreateCertifiedProfileParams): Promise<CreateResult>;
  async updateCertifiedProfile(params: UpdateCertifiedProfileParams): Promise<UpdateResult>;
}

// Types
export type BskyProfile = AppBskyActorDefs.ProfileViewDetailed;

export interface CertifiedProfile {
  handle?: string;
  displayName?: string;
  description?: string;
  avatar?: string; // Blob URL
  banner?: string; // Blob URL
  pronouns?: string; // Max 20 graphemes
  website?: string;
}

export interface CreateBskyProfileParams {
  displayName?: string;
  description?: string;
  avatar?: Blob;
  banner?: Blob;
}

export interface UpdateBskyProfileParams {
  displayName?: string | null;
  description?: string | null;
  avatar?: Blob | null;
  banner?: Blob | null;
}

export interface CreateCertifiedProfileParams {
  displayName?: string;
  description?: string;
  avatar?: Blob;
  banner?: Blob;
  pronouns?: string;
  website?: string;
}

export interface UpdateCertifiedProfileParams {
  displayName?: string | null;
  description?: string | null;
  avatar?: Blob | null;
  banner?: Blob | null;
  pronouns?: string | null;
  website?: string | null;
}
```

### CollaboratorManager (SDS-only)

```typescript
export class CollaboratorManager {
  constructor(
    private session: Session,
    private serverUrl: string,
  ) {
    if (!this.isSDSServer()) {
      throw new SDSRequiredError(
        "Collaborator management requires a Shared Data Server (SDS). This repository is on a Personal Data Server (PDS).",
      );
    }
  }

  async grant(params: {
    repo: string;
    userDid: string;
    permissions: {
      read: boolean;
      create?: boolean;
      update?: boolean;
      delete?: boolean;
      admin?: boolean;
      owner?: boolean;
    };
  }): Promise<void>;

  async revoke(params: { repo: string; userDid: string }): Promise<void>;

  async list(repo: string): Promise<
    Array<{
      userDid: string;
      permissions: {
        read: boolean;
        create: boolean;
        update: boolean;
        delete: boolean;
        admin: boolean;
        owner: boolean;
      };
      grantedBy: string;
      grantedAt: string;
      revokedAt?: string;
    }>
  >;

  async hasAccess(params: { repo: string; userDid: string }): Promise<boolean>;

  async getPermissions(params: { repo: string; userDid: string }): Promise<{
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    admin: boolean;
    owner: boolean;
  } | null>;

  private isSDSServer(): boolean {
    // Concrete implementation checks server URL
    return this.serverUrl.includes(process.env.NEXT_PUBLIC_SDS_SERVER_URL || "");
  }
}
```

## SDS Repository Operations

```typescript
export interface SDSRepositoryOperations {
  createRepository(params: { name: string; description?: string; handle?: string }): Promise<{
    did: string;
    handle: string;
    name: string;
    description?: string;
    createdAt: string;
  }>;

  listRepositories(userDid: string): Promise<
    Array<{
      did: string;
      handle: string;
      name: string;
      description?: string;
      accessType: "owner" | "collaborator";
      permissions: {
        read: boolean;
        create: boolean;
        update: boolean;
        delete: boolean;
        admin: boolean;
        owner: boolean;
      };
    }>
  >;
}
```

## Lexicon Registry

```typescript
export class LexiconRegistry {
  private lexicons = new Map<string, LexiconDoc>();

  register(lexicon: LexiconDoc): void;
  registerMany(lexicons: LexiconDoc[]): void;
  get(id: string): LexiconDoc | undefined;
  validate(collection: string, record: unknown): ValidationResult;
  addToAgent(agent: Agent): void;
}
```

### Hypercert & SDS Lexicons

- Hypercert lexicons live under `lexicons/hypercerts/`.
- SDS lexicons (org creation, collaborator permissions) live under `lexicons/sds/`.
- Registry initialization ensures these lexicons are registered before any repository operations.
