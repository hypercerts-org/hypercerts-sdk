/**
 * Context types for ATProto React integration.
 *
 * @packageDocumentation
 */

import type { ATProtoSDK, Session } from "@hypercerts-org/sdk-core";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Value stored in the ATProto React context.
 */
export interface ATProtoContextValue {
  /** The SDK instance */
  sdk: ATProtoSDK;

  /** React Query client */
  queryClient: QueryClient;

  /** Initial session for hydration */
  initialSession: Session | null;

  /** Whether cross-tab sync is enabled */
  syncTabs: boolean;
}
