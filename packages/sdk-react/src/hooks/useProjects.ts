/**
 * Hooks for project operations.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import { useRepository } from "./useRepository.js";
import type {
  CreateProjectParams,
  Project,
  UpdateProjectParams,
  UseProjectsResult,
  UseProjectResult,
} from "../types.js";

/**
 * Default page size for project lists.
 */
const DEFAULT_LIMIT = 50;

/**
 * Hook for listing and creating projects.
 *
 * @param repoDid - Optional repository DID. Defaults to current session.
 * @returns Project list and management functions
 *
 * @example List projects
 * ```typescript
 * function ProjectList({ orgDid }) {
 *   const { projects, isLoading, hasNextPage, fetchNextPage } = useProjects(orgDid);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <>
 *       <ul>
 *         {projects.map(project => (
 *           <li key={project.uri}>
 *             {project.title} - {project.shortDescription}
 *           </li>
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
 * @example Create project
 * ```typescript
 * function CreateProjectForm({ orgDid }) {
 *   const { create, isCreating } = useProjects(orgDid);
 *
 *   const handleSubmit = async (data) => {
 *     const result = await create({
 *       title: data.title,
 *       shortDescription: data.shortDesc,
 *       description: data.description,
 *       activities: data.activities,
 *       avatar: data.avatarFile,
 *       coverPhoto: data.coverPhotoFile,
 *     });
 *     console.log("Created project:", result.uri);
 *   };
 *
 *   return <form />;  // form fields omitted
 * }
 * ```
 */
export function useProjects(repoDid?: string): UseProjectsResult {
  const { session, status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Determine target DID
  const targetDid = repoDid ?? session?.did ?? (session as { sub?: string } | null)?.sub;

  // Use repository for the target DID
  const { repository, status: repoStatus } = useRepository({
    repoDid: targetDid,
  });

  // Projects query with infinite pagination
  const projectsQuery = useInfiniteQuery({
    queryKey: atprotoKeys.projects(targetDid),
    queryFn: async ({ pageParam }): Promise<{ projects: Project[]; cursor?: string }> => {
      if (!repository) return { projects: [] };

      const result = await repository.hypercerts.listProjects({
        limit: DEFAULT_LIMIT,
        cursor: pageParam,
      });

      const projects: Project[] = result.records.map((item) => ({
        uri: item.uri,
        cid: item.cid,
        ...item.record,
      }));

      return {
        projects,
        cursor: result.cursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!targetDid && authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const displayProjects = projectsQuery.data?.pages.flatMap((page) => page.projects) ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (params: CreateProjectParams): Promise<{ uri: string; cid: string }> => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      const result = await repository.hypercerts.createProject(params);
      return result;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.projects(targetDid),
      });
    },
  });

  // Callbacks
  const create = useCallback(
    async (params: CreateProjectParams) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const fetchNextPage = useCallback(async () => {
    if (projectsQuery.hasNextPage && !projectsQuery.isFetchingNextPage) {
      await projectsQuery.fetchNextPage();
    }
  }, [projectsQuery]);

  const refetch = useCallback(async () => {
    await projectsQuery.refetch();
  }, [projectsQuery]);

  return {
    projects: displayProjects,
    isLoading: projectsQuery.isLoading || repoStatus === "loading",
    error: projectsQuery.error ?? null,
    create,
    isCreating: createMutation.isPending,
    hasNextPage: projectsQuery.hasNextPage,
    fetchNextPage,
    refetch,
  };
}

/**
 * Hook for a single project with update and delete capabilities.
 *
 * @param uri - The project's AT URI
 * @returns Project data and management functions
 *
 * @example View and edit project
 * ```typescript
 * function ProjectDetail({ uri }) {
 *   const { project, update, remove, isUpdating, isDeleting } = useProject(uri);
 *
 *   const handleUpdate = async () => {
 *     await update({
 *       title: "Updated Title",
 *       shortDescription: "Updated description",
 *     });
 *   };
 *
 *   const handleDelete = async () => {
 *     await remove();
 *     navigate("/projects");
 *   };
 *
 *   return <div>...</div>;  // UI omitted for brevity
 * }
 * ```
 */
export function useProject(uri: string): UseProjectResult {
  const { status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Parse repo DID from URI (at://did:plc:xxx/collection/rkey)
  const repoDid = uri.startsWith("at://") ? uri.split("/")[2] : undefined;

  // Use repository for the project's repo
  const { repository, status: repoStatus } = useRepository({
    repoDid,
  });

  // Project query
  const projectQuery = useQuery({
    queryKey: atprotoKeys.project(uri),
    queryFn: async (): Promise<Project | null> => {
      if (!repository) return null;

      const record = await repository.hypercerts.getProject(uri);
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
    mutationFn: async (params: UpdateProjectParams) => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      const result = await repository.hypercerts.updateProject(uri, params);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.project(uri),
      });
      // Also invalidate list queries
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.projects(repoDid),
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      await repository.hypercerts.deleteProject(uri);
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: atprotoKeys.project(uri),
      });
      // Also invalidate list queries
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.projects(repoDid),
      });
    },
  });

  // Callbacks
  const update = useCallback(
    async (params: UpdateProjectParams) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const remove = useCallback(async () => {
    await deleteMutation.mutateAsync();
  }, [deleteMutation]);

  const refetch = useCallback(async () => {
    await projectQuery.refetch();
  }, [projectQuery]);

  return {
    project: projectQuery.data ?? null,
    isLoading: projectQuery.isLoading || repoStatus === "loading",
    error: projectQuery.error ?? null,
    update,
    remove,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
}
