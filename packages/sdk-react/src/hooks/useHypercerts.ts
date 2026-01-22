/**
 * Hooks for hypercert operations.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateHypercertParams, CreateHypercertResult } from "@hypercerts-org/sdk-core";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import { useRepository } from "./useRepository.js";
import type { Hypercert, UpdateHypercertParams, UseHypercertsResult, UseHypercertResult } from "../types.js";

/**
 * Default page size for hypercert lists.
 */
const DEFAULT_LIMIT = 50;

/**
 * Hook for listing and creating hypercerts.
 *
 * @param repoDid - Optional repository DID. Defaults to current session.
 * @returns Hypercert list and management functions
 *
 * @example List hypercerts
 * ```typescript
 * function HypercertList({ orgDid }) {
 *   const { hypercerts, isLoading, hasNextPage, fetchNextPage } = useHypercerts(orgDid);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <>
 *       <ul>
 *         {hypercerts.map(hc => (
 *           <li key={hc.uri}>{hc.title}</li>
 *         ))}
 *       </ul>
 *       {hasNextPage && (
 *         <button onClick={fetchNextPage}>Load more</button>
 *       )}
 *     </>
 *   );
 * }
 * ```
 *
 * @example Create hypercert
 * ```typescript
 * function CreateHypercertForm({ orgDid }) {
 *   const { create, isCreating } = useHypercerts(orgDid);
 *
 *   const handleSubmit = async (data) => {
 *     const result = await create({
 *       title: data.title,
 *       shortDescription: data.shortDesc,
 *       description: data.description,
 *       workScope: data.workScope,
 *       workTimeFrameFrom: data.startDate,
 *       workTimeFrameTo: data.endDate,
 *       rights: {
 *         name: "CC-BY-4.0",
 *         type: "license",
 *         description: "Attribution required",
 *       },
 *     });
 *     console.log("Created:", result.hypercertUri);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {/* form fields *\/}
 *       <button disabled={isCreating}>
 *         {isCreating ? "Creating..." : "Create"}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useHypercerts(repoDid?: string): UseHypercertsResult {
  const { session, status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Determine target DID
  const targetDid = repoDid ?? session?.did ?? (session as { sub?: string } | null)?.sub;

  // Use repository for the target DID
  const { repository, status: repoStatus } = useRepository({
    repoDid: targetDid,
  });

  // Hypercerts query with infinite pagination
  const hypercertsQuery = useInfiniteQuery({
    queryKey: atprotoKeys.hypercerts(targetDid),
    queryFn: async ({ pageParam }): Promise<{ hypercerts: Hypercert[]; cursor?: string }> => {
      if (!repository) return { hypercerts: [] };

      const result = await repository.hypercerts.list({
        limit: DEFAULT_LIMIT,
        cursor: pageParam,
      });

      const hypercerts: Hypercert[] = result.records.map((item) => ({
        uri: item.uri,
        cid: item.cid,
        ...item.record,
      }));

      return {
        hypercerts,
        cursor: result.cursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!targetDid && authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const displayHypercerts = hypercertsQuery.data?.pages.flatMap((page) => page.hypercerts) ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (params: CreateHypercertParams): Promise<CreateHypercertResult> => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      const result = await repository.hypercerts.create(params);
      return result;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.hypercerts(targetDid),
      });
    },
  });

  // Callbacks
  const create = useCallback(
    async (params: CreateHypercertParams) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const fetchNextPage = useCallback(async () => {
    if (hypercertsQuery.hasNextPage && !hypercertsQuery.isFetchingNextPage) {
      await hypercertsQuery.fetchNextPage();
    }
  }, [hypercertsQuery]);

  const refetch = useCallback(async () => {
    await hypercertsQuery.refetch();
  }, [hypercertsQuery]);

  return {
    hypercerts: displayHypercerts,
    isLoading: hypercertsQuery.isLoading || repoStatus === "loading",
    error: hypercertsQuery.error ?? null,
    create,
    isCreating: createMutation.isPending,
    hasNextPage: hypercertsQuery.hasNextPage,
    fetchNextPage,
    refetch,
  };
}

/**
 * Hook for a single hypercert with update and delete capabilities.
 *
 * @param uri - The hypercert's AT URI
 * @returns Hypercert data and management functions
 *
 * @example View and edit hypercert
 * ```typescript
 * function HypercertDetail({ uri }) {
 *   const { hypercert, update, remove, isUpdating, isDeleting } = useHypercert(uri);
 *
 *   if (!hypercert) return <NotFound />;
 *
 *   const handleUpdate = async () => {
 *     await update({ title: "Updated Title" });
 *   };
 *
 *   const handleDelete = async () => {
 *     await remove();
 *     navigate("/hypercerts");
 *   };
 *
 *   return (
 *     <div>
 *       <h1>{hypercert.title}</h1>
 *       <button onClick={handleUpdate} disabled={isUpdating}>
 *         {isUpdating ? "Updating..." : "Update"}
 *       </button>
 *       <button onClick={handleDelete} disabled={isDeleting}>
 *         {isDeleting ? "Deleting..." : "Delete"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHypercert(uri: string): UseHypercertResult {
  const { status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Parse repo DID from URI (at://did:plc:xxx/collection/rkey)
  const repoDid = uri.startsWith("at://") ? uri.split("/")[2] : undefined;

  // Use repository for the hypercert's repo
  const { repository, status: repoStatus } = useRepository({
    repoDid,
  });

  // Hypercert query
  const hypercertQuery = useQuery({
    queryKey: atprotoKeys.hypercert(uri),
    queryFn: async (): Promise<Hypercert | null> => {
      if (!repository) return null;

      const record = await repository.hypercerts.get(uri);
      if (!record) return null;

      return {
        uri: record.uri,
        cid: record.cid,
        ...record.record,
      };
    },
    enabled: !!uri && authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (params: UpdateHypercertParams) => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      await repository.hypercerts.update({
        uri,
        updates: params as Parameters<typeof repository.hypercerts.update>[0]["updates"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.hypercert(uri),
      });
      // Also invalidate list queries
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.hypercerts(repoDid),
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      await repository.hypercerts.delete(uri);
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: atprotoKeys.hypercert(uri),
      });
      // Also invalidate list queries
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.hypercerts(repoDid),
      });
    },
  });

  // Callbacks
  const update = useCallback(
    async (params: UpdateHypercertParams) => {
      await updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const remove = useCallback(async () => {
    await deleteMutation.mutateAsync();
  }, [deleteMutation]);

  const refetch = useCallback(async () => {
    await hypercertQuery.refetch();
  }, [hypercertQuery]);

  return {
    hypercert: hypercertQuery.data ?? null,
    isLoading: hypercertQuery.isLoading || repoStatus === "loading",
    error: hypercertQuery.error ?? null,
    update,
    remove,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
}
