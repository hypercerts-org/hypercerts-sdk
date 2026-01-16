/**
 * Factory function for creating ATProto React instances.
 *
 * @packageDocumentation
 */

import { createATProtoSDK, type ATProtoSDK } from "@hypercerts-org/sdk-core";
import { QueryClient, type DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ATProtoProvider } from "../context/ATProtoProvider.js";
import type { ATProtoContextValue } from "../context/types.js";
import { useATProtoSDK } from "../hooks/useATProtoSDK.js";
import { useATProtoAuth } from "../hooks/useATProtoAuth.js";
import { useRepository } from "../hooks/useRepository.js";
import { useProfile } from "../hooks/useProfile.js";
import { useOrganizations, useOrganization } from "../hooks/useOrganizations.js";
import { useCollaborators } from "../hooks/useCollaborators.js";
import { useHypercerts, useHypercert } from "../hooks/useHypercerts.js";
import { atprotoKeys } from "../queries/keys.js";
import type {
  CreateATProtoReactOptions,
  UseAuthResult,
  UseRepositoryOptions,
  UseRepositoryResult,
  UseProfileResult,
  UseOrganizationsResult,
  UseOrganizationResult,
  UseCollaboratorsResult,
  UseHypercertsResult,
  UseHypercertResult,
} from "../types.js";

/**
 * The ATProto React instance returned by createATProtoReact.
 */
export interface ATProtoReactInstance {
  /** The underlying SDK instance */
  sdk: ATProtoSDK;

  /** React Query client */
  queryClient: QueryClient;

  /** Provider component - wrap your app with this */
  Provider: React.FC<{ children: ReactNode; dehydratedState?: DehydratedState }>;

  // ─────────────────────────────────────────────
  // Core
  // ─────────────────────────────────────────────

  /** Access the SDK instance from context */
  useSDK: () => ATProtoSDK;

  // ─────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────

  /** Authentication state and actions */
  useAuth: () => UseAuthResult;

  // ─────────────────────────────────────────────
  // Repository
  // ─────────────────────────────────────────────

  /** Get a repository client with smart server routing */
  useRepository: (options?: UseRepositoryOptions) => UseRepositoryResult;

  // ─────────────────────────────────────────────
  // Profile
  // ─────────────────────────────────────────────

  /** Profile read + write */
  useProfile: (did?: string) => UseProfileResult;

  // ─────────────────────────────────────────────
  // Organizations
  // ─────────────────────────────────────────────

  /** SDS organization list + create */
  useOrganizations: () => UseOrganizationsResult;

  /** Single organization */
  useOrganization: (did: string) => UseOrganizationResult;

  // ─────────────────────────────────────────────
  // Collaborators
  // ─────────────────────────────────────────────

  /** Collaborator management (SDS only) */
  useCollaborators: (repoDid: string) => UseCollaboratorsResult;

  // ─────────────────────────────────────────────
  // Hypercerts
  // ─────────────────────────────────────────────

  /** Hypercert list + create */
  useHypercerts: (repoDid?: string) => UseHypercertsResult;

  /** Single hypercert with update/delete */
  useHypercert: (uri: string) => UseHypercertResult;

  // ─────────────────────────────────────────────
  // Advanced
  // ─────────────────────────────────────────────

  /** Query keys for manual cache management */
  queryKeys: typeof atprotoKeys;
}

/**
 * Creates an ATProto React instance with bound hooks and a Provider component.
 *
 * This factory function follows the pattern used by Wagmi v2 and tRPC,
 * creating an isolated instance that's SSR-safe and testable.
 *
 * **Important:** You must wrap your app with `QueryClientProvider` at the top level.
 * The ATProto Provider does NOT include QueryClientProvider, allowing seamless
 * integration with apps that already use React Query (wagmi, tRPC, etc.).
 *
 * @param options - Configuration options
 * @returns An ATProtoReactInstance with Provider and hooks
 *
 * @example Basic usage
 * ```typescript
 * // Create instance (typically in a providers.ts file)
 * const atproto = createATProtoReact({
 *   config: {
 *     oauth: { ... },
 *     servers: { pds: "...", sds: "..." },
 *   },
 * });
 *
 * // Export hooks for use in components
 * export const {
 *   Provider,
 *   useAuth,
 *   useProfile,
 *   useOrganizations,
 *   useHypercerts,
 *   queryClient,
 * } = atproto;
 *
 * // In your app root - wrap with QueryClientProvider
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <Provider>
 *         <MyApp />
 *       </Provider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example With wagmi (shared QueryClient)
 * ```typescript
 * // Share QueryClient with wagmi for unified caching
 * const queryClient = new QueryClient();
 * const atproto = createATProtoReact({ config, queryClient });
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <WagmiProvider config={wagmiConfig}>
 *         <atproto.Provider>
 *           <MyApp />
 *         </atproto.Provider>
 *       </WagmiProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example With existing SDK instance
 * ```typescript
 * const sdk = createATProtoSDK(config);
 * const atproto = createATProtoReact({ sdk });
 * ```
 *
 * @example With custom QueryClient
 * ```typescript
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: { staleTime: 60000 },
 *   },
 * });
 * const atproto = createATProtoReact({ config, queryClient });
 * ```
 *
 * @example Local Development
 * ```typescript
 * // For local development, use HTTP loopback URLs
 * const atproto = createATProtoReact({
 *   config: {
 *     oauth: {
 *       clientId: "http://localhost/",
 *       redirectUri: "http://127.0.0.1:3000/api/auth/callback",
 *       scope: "atproto",
 *       jwksUri: "http://127.0.0.1:3000/.well-known/jwks.json",
 *       jwkPrivate: process.env.ATPROTO_JWK_PRIVATE!,
 *       developmentMode: true, // Suppresses loopback warnings
 *     },
 *     servers: {
 *       pds: "http://localhost:2583", // Local PDS for testing
 *     },
 *     logger: console, // Enable debug logging
 *   },
 * });
 * ```
 */
export function createATProtoReact(options: CreateATProtoReactOptions): ATProtoReactInstance {
  // Validate options
  if (!options.config && !options.sdk) {
    throw new Error("createATProtoReact requires either 'config' or 'sdk' option");
  }

  // Create or use provided SDK
  const sdk = options.sdk ?? createATProtoSDK(options.config!);

  // Create or use provided QueryClient
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: 1,
        },
      },
    });

  // Create context value
  const contextValue: ATProtoContextValue = {
    sdk,
    queryClient,
    initialSession: options.initialSession ?? null,
    syncTabs: options.syncTabs ?? true,
  };

  // Create Provider component
  const Provider: React.FC<{ children: ReactNode; dehydratedState?: DehydratedState }> = ({
    children,
    dehydratedState,
  }) => (
    <ATProtoProvider value={contextValue} dehydratedState={dehydratedState}>
      {children}
    </ATProtoProvider>
  );

  // Return instance with bound hooks
  return {
    sdk,
    queryClient,
    Provider,

    // Hooks - these use context internally
    useSDK: useATProtoSDK,
    useAuth: useATProtoAuth,
    useRepository,
    useProfile,
    useOrganizations,
    useOrganization,
    useCollaborators,
    useHypercerts,
    useHypercert,

    // Query keys for advanced usage
    queryKeys: atprotoKeys,
  };
}
