/**
 * Hypercerts SDK - React Integration.
 *
 * This package provides React hooks and components for the ATProto SDK.
 * It follows a factory pattern similar to Wagmi v2 and tRPC.
 *
 * **Important:** You must provide `QueryClientProvider` at the top level.
 * This allows seamless integration with apps that already use React Query
 * (wagmi, tRPC, etc.) by sharing a single QueryClient instance.
 *
 * @remarks
 * **Quick Start**:
 * ```typescript
 * // 1. Create instance (typically in providers.ts)
 * import { createATProtoReact } from "@hypercerts-org/sdk-react";
 * import { QueryClientProvider } from "@tanstack/react-query";
 *
 * const atproto = createATProtoReact({
 *   config: {
 *     oauth: { ... },
 *     servers: { pds: "...", sds: "..." },
 *   },
 * });
 *
 * // 2. Export hooks and queryClient
 * export const {
 *   Provider,
 *   queryClient,
 *   useAuth,
 *   useProfile,
 *   useOrganizations,
 *   useHypercerts,
 * } = atproto;
 *
 * // 3. Wrap your app with QueryClientProvider
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <Provider>
 *         <MyApp />
 *       </Provider>
 *     </QueryClientProvider>
 *   );
 * }
 *
 * // 4. Use hooks in components
 * function AuthButton() {
 *   const { status, login, logout } = useAuth();
 *   // ...
 * }
 * ```
 *
 * **With wagmi (shared QueryClient)**:
 * ```typescript
 * const queryClient = new QueryClient();
 * const atproto = createATProtoReact({ config, queryClient });
 *
 * <QueryClientProvider client={queryClient}>
 *   <WagmiProvider config={wagmiConfig}>
 *     <atproto.Provider>
 *       <App />
 *     </atproto.Provider>
 *   </WagmiProvider>
 * </QueryClientProvider>
 * ```
 *
 * **Testing**:
 * ```typescript
 * import { TestProvider, createMockSession } from "@hypercerts-org/sdk-react/testing";
 * ```
 *
 * @packageDocumentation
 */

// Factory function
export { createATProtoReact } from "./factory/createATProtoReact.js";
export type { ATProtoReactInstance } from "./factory/createATProtoReact.js";

// Provider
export { ATProtoProvider } from "./context/ATProtoProvider.js";
export type { ATProtoProviderProps } from "./context/ATProtoProvider.js";

// Hooks
export { useATProtoSDK } from "./hooks/useATProtoSDK.js";
export { useATProtoAuth } from "./hooks/useATProtoAuth.js";
export { useRepository } from "./hooks/useRepository.js";
export { useProfile } from "./hooks/useProfile.js";
export { useOrganizations, useOrganization } from "./hooks/useOrganizations.js";
export { useCollaborators } from "./hooks/useCollaborators.js";
export { useHypercerts, useHypercert } from "./hooks/useHypercerts.js";

// Query keys (for manual cache management)
export { atprotoKeys } from "./queries/keys.js";
export type { ATProtoQueryKey } from "./queries/keys.js";

// SSR utilities
export { createSSRHelpers } from "./utils/ssr.js";

// Cross-tab sync utilities
export { broadcastSessionChange, useSessionSync } from "./utils/sync.js";

// Types
export type {
  // Factory types
  CreateATProtoReactOptions,
  ATProtoProviderProps as ProviderProps,

  // Auth types
  AuthStatus,
  UseAuthResult,

  // Repository types
  UseRepositoryOptions,
  UseRepositoryResult,

  // Profile types
  Profile,
  ProfileUpdate,
  UseProfileResult,

  // Organization types
  CreateOrganizationParams,
  UseOrganizationsResult,
  UseOrganizationResult,

  // Collaborator types
  GrantCollaboratorParams,
  UseCollaboratorsResult,

  // Hypercert types
  Hypercert,
  UpdateHypercertParams,
  UseHypercertsResult,
  UseHypercertResult,

  // SSR types
  SSRHelpers,

  // Sync types
  SyncMessage,

  // Re-exports from sdk-core
  ATProtoSDK,
  ATProtoSDKConfig,
  Session,
  Repository,
  Collaborator,
  CollaboratorPermissions,
  HypercertClaim,
  CreateHypercertParams,
  CreateHypercertResult,
  OrganizationInfo,
  RepositoryRole,
} from "./types.js";
