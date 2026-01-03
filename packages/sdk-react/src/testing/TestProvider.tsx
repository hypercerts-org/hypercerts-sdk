/**
 * Test provider component for unit testing.
 *
 * @packageDocumentation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import type { ATProtoSDK, Session } from "@hypercerts-org/sdk-core";
import { ATProtoContext } from "../context/ATProtoContext.js";
import type { ATProtoContextValue } from "../context/types.js";

/**
 * Props for the TestProvider component.
 */
export interface TestProviderProps {
  /** Child components to render */
  children: ReactNode;

  /** Mock session to use */
  mockSession?: Session | null;

  /** Mock SDK instance (partial) */
  mockSDK?: Partial<ATProtoSDK>;

  /** Custom query client (creates one if not provided) */
  queryClient?: QueryClient;
}

/**
 * Creates a minimal mock SDK for testing.
 */
function createMinimalMockSDK(overrides: Partial<ATProtoSDK> = {}): ATProtoSDK {
  return {
    authorize: async () => "https://auth.example.com",
    callback: async () => ({}) as Session,
    restoreSession: async () => null,
    revokeSession: async () => {},
    repository: () => {
      throw new Error("Mock repository not implemented");
    },
    getLexiconRegistry: () => {
      throw new Error("Mock lexicon registry not implemented");
    },
    pdsUrl: "https://pds.example.com",
    sdsUrl: "https://sds.example.com",
    ...overrides,
  } as ATProtoSDK;
}

/**
 * Test provider for unit testing ATProto React hooks.
 *
 * Provides a minimal context that allows hooks to function in tests
 * without requiring a real SDK instance.
 *
 * @example Basic usage
 * ```typescript
 * import { TestProvider, createMockSession } from "@hypercerts-org/sdk-react/testing";
 * import { renderHook } from "@testing-library/react";
 *
 * test("useAuth returns session", async () => {
 *   const mockSession = createMockSession({ handle: "test.bsky.social" });
 *
 *   const { result } = renderHook(() => useAuth(), {
 *     wrapper: ({ children }) => (
 *       <TestProvider mockSession={mockSession}>
 *         {children}
 *       </TestProvider>
 *     ),
 *   });
 *
 *   expect(result.current.session).toBeDefined();
 * });
 * ```
 *
 * @example With custom SDK mock
 * ```typescript
 * const mockSDK = {
 *   restoreSession: vi.fn().mockResolvedValue(mockSession),
 * };
 *
 * <TestProvider mockSDK={mockSDK}>
 *   {children}
 * </TestProvider>
 * ```
 */
export function TestProvider({
  children,
  mockSession = null,
  mockSDK = {},
  queryClient: providedQueryClient,
}: TestProviderProps) {
  // Create query client with test-friendly defaults
  const queryClient = useMemo(
    () =>
      providedQueryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      }),
    [providedQueryClient],
  );

  // Create mock SDK
  const sdk = useMemo(() => createMinimalMockSDK(mockSDK), [mockSDK]);

  // Create context value
  const contextValue = useMemo<ATProtoContextValue>(
    () => ({
      sdk,
      queryClient,
      initialSession: mockSession,
      syncTabs: false, // Disable sync in tests
    }),
    [sdk, queryClient, mockSession],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ATProtoContext.Provider value={contextValue}>{children}</ATProtoContext.Provider>
    </QueryClientProvider>
  );
}
