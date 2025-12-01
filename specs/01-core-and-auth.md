# Core & Auth Specification

## Scope

- Define the foundational configuration, storage contracts, and OAuth-enabled SDK surface.
- Provide shared error types, event emitters, and builder patterns that every other spec depends on.
- Keep implementation language-agnostic but TypeScript-first.

## Configuration Interface

```typescript
export interface ATProtoSDKConfig {
  // OAuth Configuration
  oauth: {
    clientId: string;
    redirectUri: string;
    scope: string;
    jwksUri: string;
    jwkPrivate: string; // JWK private key
  };

  // Server Configuration
  servers: {
    pds?: string; // Default PDS URL
    sds?: string; // SDS server URL
  };

  // Storage Adapters (user implements interfaces)
  storage: {
    sessionStore: SessionStore;
    stateStore: StateStore;
  };

  // Optional: Custom fetch handler
  fetch?: typeof fetch;

  // Optional: Timeout configuration
  timeouts?: {
    pdsMetadata?: number; // Default: 30000ms
    apiRequests?: number; // Default: 30000ms
  };

  // Optional: Cache interface for profiles/sessions
  cache?: CacheInterface;

  // Optional: Logger for debugging
  logger?: LoggerInterface;
}
```

## Session Store Interface

```typescript
/**
 * Session store for OAuth sessions
 * Stores NodeSavedSession objects which include DPoP keys, tokens, and OAuth state
 */
export interface SessionStore {
  get(did: string): Promise<NodeSavedSession | undefined>;
  set(did: string, session: NodeSavedSession): Promise<void>;
  del(did: string): Promise<void>;
}
```

### Example Implementation (Drizzle)

```typescript
export class DrizzleSessionStore implements SessionStore {
  constructor(private db: Database) {}

  async get(did: string) {
    const result = await this.db.select().from(oauthClientSessions).where(eq(oauthClientSessions.sub, did)).limit(1);
    return result[0] ? JSON.parse(result[0].sessionData) : undefined;
  }

  async set(did: string, session: NodeSavedSession) {
    await this.db
      .insert(oauthClientSessions)
      .values({ sub: did, sessionData: JSON.stringify(session) })
      .onConflictDoUpdate({
        target: oauthClientSessions.sub,
        set: {
          sessionData: JSON.stringify(session),
          updatedAt: new Date(),
        },
      });
  }

  async del(did: string) {
    await this.db.delete(oauthClientSessions).where(eq(oauthClientSessions.sub, did));
  }
}
```

## State Store Interface

```typescript
/**
 * State store for OAuth state/PKCE parameters
 * Temporary storage during OAuth flow
 */
export interface StateStore {
  get(key: string): Promise<NodeSavedState | undefined>;
  set(key: string, state: NodeSavedState): Promise<void>;
  del(key: string): Promise<void>;
}
```

## Optional Cache Interface

```typescript
/**
 * Optional cache interface for profile and metadata caching
 * SDK provides in-memory implementation; users can provide Redis/etc.
 */
export interface CacheInterface {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Main SDK Client

```typescript
export class ATProtoSDK {
  private oauthClient: OAuthClient;
  private lexiconRegistry: LexiconRegistry;
  private config: ATProtoSDKConfig;

  constructor(config: ATProtoSDKConfig) {
    // Initialize clients with config
  }

  // Auth methods
  async authorize(identifier: string, options?: AuthOptions): Promise<string>;
  async callback(params: URLSearchParams): Promise<Session>;
  async restoreSession(did: string): Promise<Session | null>;
  async revokeSession(did: string): Promise<void>;

  // Repository client factory
  getRepository(session: Session, serverUrl?: string): RepositoryClient;

  // Lexicon management
  registerLexicons(lexicons: LexiconDoc[]): void;
  validateRecord(collection: string, record: unknown): ValidationResult;

  // Events
  readonly events: SDKEventEmitter;
}
```

## Builder / Factory Pattern

- Export `createATProtoSDK(config: ATProtoSDKConfig): ATProtoSDK`.
- Provide `ATProtoSDKBuilder` for advanced customization (middleware, telemetry hooks, dependency injection).
- Validate configuration via Zod at build time and emit detailed error messages.
- Expose events such as `session:restored`, `session:revoked`, `request:start`, `request:end`.

## Error Handling

```typescript
export class ATProtoSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "ATProtoSDKError";
  }
}

export class AuthenticationError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, cause);
  }
}

export class SessionExpiredError extends ATProtoSDKError {
  constructor(message: string = "Session expired", cause?: unknown) {
    super(message, "SESSION_EXPIRED", 401, cause);
  }
}

export class ValidationError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", 400, cause);
  }
}

export class NetworkError extends ATProtoSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", 503, cause);
  }
}

export class SDSRequiredError extends ATProtoSDKError {
  constructor(message: string = "This operation requires a Shared Data Server (SDS)", cause?: unknown) {
    super(message, "SDS_REQUIRED", 400, cause);
  }
}
```

## Shared Telemetry & Hooks

- Provide lifecycle hooks (`onRequest`, `onResponse`, `onError`) configurable via builder.
- Allow dependency injection of logger/tracer implementations.
- Keep hook signatures simple (`(context: RequestContext) => void`), so consumers can bridge to OpenTelemetry or custom
  loggers.
