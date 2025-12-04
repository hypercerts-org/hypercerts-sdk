/**
 * Hook for collaborator management on SDS repositories.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Collaborator } from "@hypercerts-org/sdk-core";
import { SDSRequiredError } from "@hypercerts-org/sdk-core";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import { useRepository } from "./useRepository.js";
import type { GrantCollaboratorParams, UseCollaboratorsResult } from "../types.js";

/**
 * Hook for managing collaborators on SDS repositories.
 *
 * This hook only works with SDS repositories and will throw an error
 * if used with a PDS repository.
 *
 * @param repoDid - The repository DID to manage collaborators for
 * @returns Collaborator list and management functions
 *
 * @example List collaborators
 * ```typescript
 * function CollaboratorList({ orgDid }) {
 *   const { collaborators, isLoading } = useCollaborators(orgDid);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {collaborators.map(collab => (
 *         <li key={collab.userDid}>
 *           {collab.userDid} - {collab.permissions.admin ? "Admin" : "Member"}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example Grant access
 * ```typescript
 * function InviteForm({ orgDid }) {
 *   const { grant, isGranting } = useCollaborators(orgDid);
 *
 *   const handleInvite = async (userDid) => {
 *     await grant({
 *       userDid,
 *       role: "editor",
 *     });
 *   };
 *
 *   return (
 *     <button onClick={() => handleInvite(selectedUser)} disabled={isGranting}>
 *       {isGranting ? "Inviting..." : "Invite"}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example Revoke access
 * ```typescript
 * function CollaboratorRow({ orgDid, collab }) {
 *   const { revoke, isRevoking } = useCollaborators(orgDid);
 *
 *   return (
 *     <div>
 *       <span>{collab.userDid}</span>
 *       <button onClick={() => revoke(collab.userDid)} disabled={isRevoking}>
 *         Remove
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCollaborators(repoDid: string): UseCollaboratorsResult {
  const { status: authStatus } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Use SDS repository for collaborator operations
  const {
    repository,
    status: repoStatus,
    isSDS,
  } = useRepository({
    repoDid,
    server: "sds",
  });

  // Collaborators query
  const collaboratorsQuery = useQuery({
    queryKey: atprotoKeys.collaborators(repoDid),
    queryFn: async (): Promise<Collaborator[]> => {
      if (!repository) return [];

      if (!isSDS) {
        throw new SDSRequiredError("Collaborator management requires a Shared Data Server (SDS)");
      }

      const { collaborators: grants } = await repository.collaborators.list();

      // Transform RepositoryAccessGrant[] to Collaborator[]
      // Use permissions directly from the grant (authoritative source)
      return grants.map((grant) => ({
        userDid: grant.userDid,
        permissions: grant.permissions,
        grantedBy: grant.grantedBy,
        grantedAt: grant.grantedAt,
      }));
    },
    enabled: !!repoDid && authStatus === "authenticated" && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Grant mutation
  const grantMutation = useMutation({
    mutationFn: async (params: GrantCollaboratorParams) => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      if (!isSDS) {
        throw new SDSRequiredError("Collaborator management requires a Shared Data Server (SDS)");
      }

      await repository.collaborators.grant({
        userDid: params.userDid,
        role: params.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.collaborators(repoDid),
      });
    },
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async (userDid: string) => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      if (!isSDS) {
        throw new SDSRequiredError("Collaborator management requires a Shared Data Server (SDS)");
      }

      await repository.collaborators.revoke({ userDid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.collaborators(repoDid),
      });
    },
  });

  // Callbacks
  const grant = useCallback(
    async (params: GrantCollaboratorParams) => {
      await grantMutation.mutateAsync(params);
    },
    [grantMutation],
  );

  const revoke = useCallback(
    async (userDid: string) => {
      await revokeMutation.mutateAsync(userDid);
    },
    [revokeMutation],
  );

  const refetch = useCallback(async () => {
    await collaboratorsQuery.refetch();
  }, [collaboratorsQuery]);

  return {
    collaborators: collaboratorsQuery.data ?? [],
    isLoading: collaboratorsQuery.isLoading || repoStatus === "loading",
    error: collaboratorsQuery.error ?? null,
    grant,
    revoke,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
    refetch,
  };
}
