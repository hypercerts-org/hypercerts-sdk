/**
 * Mock factory for creating test ATProto React instances.
 *
 * @packageDocumentation
 */

import type { ATProtoSDK, Session } from "@hypercerts-org/sdk-core";
import { QueryClient } from "@tanstack/react-query";
import type { ATProtoReactInstance } from "../factory/createATProtoReact.js";
import { atprotoKeys } from "../queries/keys.js";
import type {
  UseAuthResult,
  UseCollaboratorsResult,
  UseHypercertResult,
  UseHypercertsResult,
  UseOrganizationResult,
  UseOrganizationsResult,
  UseProfileResult,
  UseProjectResult,
  UseProjectsResult,
  UseRepositoryResult,
} from "../types.js";
import { createMockProfile, createMockSession } from "./mocks.js";

/**
 * Options for creating a mock ATProto React instance.
 */
export interface MockATProtoReactOptions {
  /** Mock session to return from useAuth */
  session?: Session | null;

  /** Mock SDK overrides */
  sdk?: Partial<ATProtoSDK>;

  /** Custom query client */
  queryClient?: QueryClient;

  /** Mock hook return values */
  mockHooks?: {
    useAuth?: Partial<UseAuthResult>;
    useRepository?: Partial<UseRepositoryResult>;
    useProfile?: Partial<UseProfileResult>;
    useOrganizations?: Partial<UseOrganizationsResult>;
    useOrganization?: Partial<UseOrganizationResult>;
    useCollaborators?: Partial<UseCollaboratorsResult>;
    useHypercerts?: Partial<UseHypercertsResult>;
    useHypercert?: Partial<UseHypercertResult>;
    useProjects?: Partial<UseProjectsResult>;
    useProject?: Partial<UseProjectResult>;
  };
}

/**
 * Creates a mock ATProto React instance for integration testing.
 *
 * This creates a fully mocked instance that can be used in tests
 * without any real network calls.
 *
 * @param options - Mock configuration options
 * @returns A mocked ATProtoReactInstance
 *
 * @example Basic usage
 * ```typescript
 * const mockAtproto = createMockATProtoReact({
 *   session: createMockSession({ handle: "test.bsky.social" }),
 * });
 *
 * // Use in tests
 * const { Provider, useAuth } = mockAtproto;
 *
 * render(
 *   <Provider>
 *     <MyComponent />
 *   </Provider>
 * );
 * ```
 *
 * @example With custom hook mocks
 * ```typescript
 * const mockAtproto = createMockATProtoReact({
 *   mockHooks: {
 *     useAuth: {
 *       status: "authenticated",
 *       isLoading: false,
 *     },
 *     useProfile: {
 *       profile: createMockProfile({ displayName: "Test" }),
 *       isLoading: false,
 *     },
 *   },
 * });
 * ```
 */
export function createMockATProtoReact(options: MockATProtoReactOptions = {}): ATProtoReactInstance {
  const session = options.session ?? createMockSession();
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  // Create mock SDK
  const mockSDK = {
    authorize: async () => "https://auth.example.com",
    callback: async () => session,
    restoreSession: async () => session,
    revokeSession: async () => {},
    repository: () => {
      throw new Error("Mock repository - use mockHooks instead");
    },
    getLexiconRegistry: () => {
      throw new Error("Mock lexicon registry");
    },
    pdsUrl: "https://pds.example.com",
    sdsUrl: "https://sds.example.com",
    ...options.sdk,
  } as unknown as ATProtoSDK;

  // Default hook implementations
  const defaultAuth: UseAuthResult = {
    session,
    status: session ? "authenticated" : "idle",
    error: null,
    isValid: !!session,
    login: async () => {},
    logout: async () => {},
    refresh: async () => {},
    isLoading: false,
    ...options.mockHooks?.useAuth,
  };

  const defaultRepository: UseRepositoryResult = {
    repository: null,
    status: "idle",
    error: null,
    isSDS: false,
    serverUrl: null,
    ...options.mockHooks?.useRepository,
  };

  const defaultProfile: UseProfileResult = {
    profile: createMockProfile(),
    isLoading: false,
    error: null,
    update: async () => {},
    isUpdating: false,
    refetch: async () => {},
    ...options.mockHooks?.useProfile,
  };

  const defaultOrganizations: UseOrganizationsResult = {
    organizations: [],
    isLoading: false,
    error: null,
    create: async () => ({
      did: "did:plc:neworg123",
      handle: "neworg.sds.example.com",
      name: "New Organization",
      createdAt: new Date().toISOString(),
      accessType: "owner",
      permissions: {
        read: true,
        create: true,
        update: true,
        delete: true,
        admin: true,
        owner: true,
      },
    }),
    isCreating: false,
    refetch: async () => {},
    ...options.mockHooks?.useOrganizations,
  };

  const defaultOrganization: UseOrganizationResult = {
    organization: null,
    isLoading: false,
    error: null,
    refetch: async () => {},
    ...options.mockHooks?.useOrganization,
  };

  const defaultCollaborators: UseCollaboratorsResult = {
    collaborators: [],
    isLoading: false,
    error: null,
    grant: async () => {},
    revoke: async () => {},
    isGranting: false,
    isRevoking: false,
    refetch: async () => {},
    ...options.mockHooks?.useCollaborators,
  };

  const defaultHypercerts: UseHypercertsResult = {
    hypercerts: [],
    isLoading: false,
    error: null,
    create: async () => ({ hypercertUri: "", rightsUri: "", hypercertCid: "", rightsCid: "" }),
    isCreating: false,
    hasNextPage: false,
    fetchNextPage: async () => {},
    refetch: async () => {},
    ...options.mockHooks?.useHypercerts,
  };

  const defaultHypercert: UseHypercertResult = {
    hypercert: null,
    isLoading: false,
    error: null,
    update: async () => {},
    remove: async () => {},
    isUpdating: false,
    isDeleting: false,
    refetch: async () => {},
    ...options.mockHooks?.useHypercert,
  };

  const defaultProjects: UseProjectsResult = {
    projects: [],
    isLoading: false,
    error: null,
    create: async () => ({ uri: "", cid: "" }),
    isCreating: false,
    hasNextPage: false,
    fetchNextPage: async () => {},
    refetch: async () => {},
    ...options.mockHooks?.useProjects,
  };

  const defaultProject: UseProjectResult = {
    project: null,
    isLoading: false,
    error: null,
    update: async () => ({ uri: "", cid: "" }),
    remove: async () => {},
    isUpdating: false,
    isDeleting: false,
    refetch: async () => {},
    ...options.mockHooks?.useProject,
  };

  // Create mock Provider
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
  };

  return {
    sdk: mockSDK,
    queryClient,
    Provider,
    useSDK: () => mockSDK,
    useAuth: () => defaultAuth,
    useRepository: () => defaultRepository,
    useProfile: () => defaultProfile,
    useOrganizations: () => defaultOrganizations,
    useOrganization: () => defaultOrganization,
    useCollaborators: () => defaultCollaborators,
    useHypercerts: () => defaultHypercerts,
    useHypercert: () => defaultHypercert,
    useProjects: () => defaultProjects,
    useProject: () => defaultProject,
    queryKeys: atprotoKeys,
  };
}
