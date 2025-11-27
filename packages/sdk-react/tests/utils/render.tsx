/**
 * Custom render utilities for testing React components with providers.
 *
 * Uses TestProvider from src/testing for consistency.
 */

import React from "react";
import { QueryClient } from "@tanstack/react-query";
import type { Session, ATProtoSDK } from "@hypercerts-org/sdk-core";
import { TestProvider } from "../../src/testing/TestProvider.js";

/**
 * Options for creating a test wrapper.
 */
export interface TestWrapperOptions {
  /** Mock session to use */
  session?: Session | null;
  /** Mock SDK instance */
  sdk?: Partial<ATProtoSDK>;
  /** Custom query client */
  queryClient?: QueryClient;
}

/**
 * Create a query client configured for testing.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Create a test wrapper using TestProvider.
 *
 * @example
 * ```tsx
 * const { result } = renderHook(() => useAuth(), {
 *   wrapper: createWrapper({ session: mockSession }),
 * });
 * ```
 */
export function createWrapper(options: TestWrapperOptions = {}) {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider mockSession={options.session} mockSDK={options.sdk} queryClient={options.queryClient}>
      {children}
    </TestProvider>
  );

  return Wrapper;
}
