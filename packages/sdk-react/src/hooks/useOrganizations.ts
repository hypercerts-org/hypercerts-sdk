/**
 * Hooks for SDS organization management.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationInfo } from "@hypercerts-org/sdk-core";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import { useRepository } from "./useRepository.js";
import type {
  CreateOrganizationParams,
  UseOrganizationsResult,
  UseOrganizationResult,
} from "../types.js";

/**
 * Hook for listing and creating SDS organizations.
 *
 * @returns Organization list and management functions
 *
 * @example List organizations
 * ```typescript
 * function OrganizationList() {
 *   const { organizations, isLoading } = useOrganizations();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {organizations.map(org => (
 *         <li key={org.did}>{org.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example Create organization
 * ```typescript
 * function CreateOrgForm() {
 *   const { create, isCreating } = useOrganizations();
 *
 *   const handleSubmit = async (data) => {
 *     const org = await create({
 *       name: data.name,
 *       description: data.description,
 *     });
 *     console.log("Created:", org.did);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input name="name" placeholder="Organization name" />
 *       <button disabled={isCreating}>
 *         {isCreating ? "Creating..." : "Create"}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useOrganizations(): UseOrganizationsResult {
  const { status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Use SDS repository for organization operations
  const { repository, status: repoStatus } = useRepository({
    server: "sds",
  });

  // Organizations query
  const orgsQuery = useQuery({
    queryKey: atprotoKeys.organizations(),
    queryFn: async (): Promise<OrganizationInfo[]> => {
      if (!repository) return [];

      const orgs = await repository.organizations.list();
      return orgs;
    },
    enabled: authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (params: CreateOrganizationParams): Promise<OrganizationInfo> => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      const org = await repository.organizations.create({
        name: params.name,
        description: params.description,
        handle: params.handle,
      });

      return org;
    },
    onSuccess: () => {
      // Invalidate organizations query to refetch
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.organizations(),
      });
    },
  });

  // Callbacks
  const create = useCallback(
    async (params: CreateOrganizationParams) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation]
  );

  const refetch = useCallback(async () => {
    await orgsQuery.refetch();
  }, [orgsQuery]);

  return {
    organizations: orgsQuery.data ?? [],
    isLoading: orgsQuery.isLoading || repoStatus === "loading",
    error: orgsQuery.error ?? null,
    create,
    isCreating: createMutation.isPending,
    refetch,
  };
}

/**
 * Hook for fetching a single organization by DID.
 *
 * @param did - The organization's DID
 * @returns Organization data and status
 *
 * @example
 * ```typescript
 * function OrganizationDetail({ orgDid }) {
 *   const { organization, isLoading, error } = useOrganization(orgDid);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!organization) return <NotFound />;
 *
 *   return <OrgCard org={organization} />;
 * }
 * ```
 */
export function useOrganization(did: string): UseOrganizationResult {
  const { status: authStatus } = useATProtoAuth();

  // Use SDS repository
  const { repository, status: repoStatus } = useRepository({
    server: "sds",
  });

  // Organization query
  const orgQuery = useQuery({
    queryKey: atprotoKeys.organization(did),
    queryFn: async (): Promise<OrganizationInfo | null> => {
      if (!repository) return null;

      const org = await repository.organizations.get(did);
      return org;
    },
    enabled: !!did && authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const refetch = useCallback(async () => {
    await orgQuery.refetch();
  }, [orgQuery]);

  return {
    organization: orgQuery.data ?? null,
    isLoading: orgQuery.isLoading || repoStatus === "loading",
    error: orgQuery.error ?? null,
    refetch,
  };
}
