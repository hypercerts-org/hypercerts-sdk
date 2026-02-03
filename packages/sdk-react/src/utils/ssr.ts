/**
 * Server-side rendering utilities.
 *
 * @packageDocumentation
 */

import { dehydrate } from "@tanstack/react-query";
import type { ATProtoSDK } from "@hypercerts-org/sdk-core";
import type { QueryClient } from "@tanstack/react-query";
import { atprotoKeys } from "../queries/keys.js";
import type { SSRHelpers } from "../types.js";

/**
 * Creates SSR helper functions for prefetching data on the server.
 *
 * Use this in server components (e.g., Next.js App Router layouts)
 * to prefetch data that will be hydrated on the client.
 *
 * @param sdk - The ATProto SDK instance
 * @param queryClient - The React Query client
 * @returns SSR helper functions
 *
 * @example Next.js App Router
 * ```typescript
 * // app/layout.tsx
 * import { createATProtoReact, createSSRHelpers } from "@hypercerts-org/sdk-react";
 * import { cookies } from "next/headers";
 *
 * const atproto = createATProtoReact({ config });
 *
 * export default async function RootLayout({ children }) {
 *   const ssr = createSSRHelpers(atproto.sdk, atproto.queryClient);
 *
 *   const sessionDid = cookies().get("atproto-session")?.value;
 *   if (sessionDid) {
 *     await ssr.prefetchSession(sessionDid);
 *     await ssr.prefetchProfile(sessionDid);
 *   }
 *
 *   return (
 *     <html>
 *       <body>
 *         <atproto.Provider dehydratedState={ssr.getDehydratedState()}>
 *           {children}
 *         </atproto.Provider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function createSSRHelpers(sdk: ATProtoSDK, queryClient: QueryClient): SSRHelpers {
  return {
    /**
     * Prefetch session data on the server.
     *
     * @param did - The user's DID
     */
    async prefetchSession(did: string): Promise<void> {
      await queryClient.prefetchQuery({
        queryKey: atprotoKeys.sessionByDid(did),
        queryFn: async () => {
          try {
            const session = await sdk.restoreSession(did);
            return session;
          } catch {
            return null;
          }
        },
      });
    },

    /**
     * Prefetch profile data on the server.
     *
     * @param did - The user's DID
     */
    async prefetchProfile(did: string): Promise<void> {
      await queryClient.prefetchQuery({
        queryKey: atprotoKeys.profile(did),
        queryFn: async () => {
          try {
            const session = await sdk.restoreSession(did);
            if (!session) return null;

            const repo = await sdk.repository(session);
            const profile = await repo.profile.get();

            return {
              handle: profile.handle,
              displayName: profile.displayName,
              description: profile.description,
              avatar: profile.avatar,
              banner: profile.banner,
              website: profile.website,
            };
          } catch {
            return null;
          }
        },
      });
    },

    /**
     * Get dehydrated state for client hydration.
     *
     * Pass this to the Provider's `dehydratedState` prop.
     *
     * @returns Dehydrated query state
     */
    getDehydratedState(): unknown {
      return dehydrate(queryClient);
    },
  };
}
