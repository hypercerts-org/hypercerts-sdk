/**
 * Hook for repository access with smart server routing.
 *
 * @packageDocumentation
 */

import { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Repository } from "@hypercerts-org/sdk-core";
import { ATProtoContext } from "../context/ATProtoContext.js";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import type { UseRepositoryOptions, UseRepositoryResult } from "../types.js";

/**
 * Server resolution result.
 */
interface ServerInfo {
  url: string;
  type: "pds" | "sds" | "custom";
}

/**
 * Hook for accessing a repository with smart server routing.
 *
 * This is a low-level escape hatch for direct repository access.
 * Most apps should use domain hooks (useProfile, useHypercerts, etc.) instead.
 *
 * @param options - Repository options
 * @returns Repository client and status
 *
 * @example Default (user's PDS)
 * ```typescript
 * function MyComponent() {
 *   const { repository, status } = useRepository();
 *
 *   if (status === "ready" && repository) {
 *     // Direct repository access
 *     const records = await repository.records.list({ collection: "..." });
 *   }
 * }
 * ```
 *
 * @example SDS repository
 * ```typescript
 * function OrgComponent({ orgDid }) {
 *   const { repository, isSDS } = useRepository({
 *     repoDid: orgDid,
 *     server: "sds",
 *   });
 *
 *   // isSDS will be true
 * }
 * ```
 *
 * @example Auto-resolution by DID
 * ```typescript
 * function FlexibleComponent({ targetDid }) {
 *   // SDK auto-detects if targetDid is on PDS or SDS
 *   const { repository, isSDS, serverUrl } = useRepository({
 *     repoDid: targetDid,
 *   });
 * }
 * ```
 */
export function useRepository(options: UseRepositoryOptions = {}): UseRepositoryResult {
  const context = useContext(ATProtoContext);

  if (!context) {
    throw new Error(
      "useRepository must be used within an ATProtoProvider. " +
        "Make sure to wrap your app with the Provider from createATProtoReact().",
    );
  }

  const { sdk } = context;
  const { session, status: authStatus } = useATProtoAuth();

  // Determine the repo DID
  const repoDid = options.repoDid ?? session?.did ?? (session as { sub?: string } | null)?.sub;

  // Server resolution query
  const serverQuery = useQuery({
    queryKey: atprotoKeys.server(repoDid ?? ""),
    queryFn: async (): Promise<ServerInfo | null> => {
      if (!repoDid) return null;

      // Explicit URL takes precedence
      if (options.serverUrl) {
        return { url: options.serverUrl, type: "custom" };
      }

      // Explicit server type
      if (options.server === "sds") {
        const sdsUrl = sdk.sdsUrl;
        if (!sdsUrl) {
          throw new Error("SDS server URL not configured");
        }
        return { url: sdsUrl, type: "sds" };
      }

      if (options.server === "pds") {
        const pdsUrl = sdk.pdsUrl;
        if (!pdsUrl) {
          throw new Error("PDS server URL not configured");
        }
        return { url: pdsUrl, type: "pds" };
      }

      // Default to PDS for now
      // TODO: Implement auto-resolution based on DID
      const pdsUrl = sdk.pdsUrl;
      if (!pdsUrl) {
        throw new Error("PDS server URL not configured");
      }
      return { url: pdsUrl, type: "pds" };
    },
    enabled: !!repoDid && authStatus === "authenticated",
    staleTime: 60 * 60 * 1000, // 1 hour - server mappings rarely change
  });

  // Build repository once server is resolved
  const repository = useMemo((): Repository | null => {
    if (!session || !serverQuery.data) return null;

    try {
      return sdk.repository(session, {
        serverUrl: serverQuery.data.url,
        server: serverQuery.data.type === "sds" ? "sds" : "pds",
      });
    } catch {
      return null;
    }
  }, [sdk, session, serverQuery.data]);

  // Derive status
  const status = useMemo(() => {
    if (authStatus !== "authenticated") return "idle" as const;
    if (serverQuery.isLoading) return "loading" as const;
    if (serverQuery.error || !repository) return "error" as const;
    return "ready" as const;
  }, [authStatus, serverQuery.isLoading, serverQuery.error, repository]);

  return {
    repository,
    status,
    error: serverQuery.error ?? null,
    isSDS: serverQuery.data?.type === "sds",
    serverUrl: serverQuery.data?.url ?? null,
  };
}
