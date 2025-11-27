/**
 * ATProto Provider component.
 *
 * @packageDocumentation
 */

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import type { ATProtoContextValue } from "./types.js";
import { ATProtoContext } from "./ATProtoContext.js";
import { useSessionSync } from "../utils/sync.js";

/**
 * Props for the ATProtoProvider component.
 */
export interface ATProtoProviderProps {
  /** Context value from factory */
  value: ATProtoContextValue;
  /** Child components */
  children: ReactNode;
  /** Dehydrated state from server for SSR hydration */
  dehydratedState?: DehydratedState;
}

/**
 * Internal component that handles session sync.
 */
function SessionSyncHandler({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  useSessionSync(enabled);
  return <>{children}</>;
}

/**
 * Provider component for ATProto React integration.
 *
 * Provides SDK context, SSR hydration, and cross-tab session synchronization.
 *
 * **Important:** This provider does NOT include QueryClientProvider.
 * You must wrap your app with QueryClientProvider at the top level.
 * This allows integration with apps that already use React Query (wagmi, tRPC, etc.).
 *
 * @example Basic usage
 * ```tsx
 * const atproto = createATProtoReact({ config });
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={atproto.queryClient}>
 *       <atproto.Provider>
 *         <MyApp />
 *       </atproto.Provider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example With wagmi (shared QueryClient)
 * ```tsx
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
 */
export function ATProtoProvider({ value, children, dehydratedState }: ATProtoProviderProps) {
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => value, [value]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <ATProtoContext.Provider value={contextValue}>
        <SessionSyncHandler enabled={value.syncTabs}>{children}</SessionSyncHandler>
      </ATProtoContext.Provider>
    </HydrationBoundary>
  );
}
