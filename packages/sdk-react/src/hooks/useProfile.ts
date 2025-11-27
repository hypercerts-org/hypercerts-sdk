/**
 * Hook for profile read and write operations.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atprotoKeys } from "../queries/keys.js";
import { useATProtoAuth } from "./useATProtoAuth.js";
import { useRepository } from "./useRepository.js";
import type { Profile, ProfileUpdate, UseProfileResult } from "../types.js";

/**
 * Hook for profile read and write operations.
 *
 * Provides profile data fetching and update functionality in a single hook.
 *
 * @param did - Optional DID to fetch profile for. Defaults to current session.
 * @returns Profile data and update functions
 *
 * @example Read current user's profile
 * ```typescript
 * function MyProfile() {
 *   const { profile, isLoading, error } = useProfile();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <ProfileCard profile={profile} />;
 * }
 * ```
 *
 * @example Read another user's profile
 * ```typescript
 * function UserProfile({ userDid }) {
 *   const { profile, isLoading } = useProfile(userDid);
 *   // ...
 * }
 * ```
 *
 * @example Update profile
 * ```typescript
 * function ProfileEditor() {
 *   const { profile, update, isUpdating } = useProfile();
 *
 *   const handleSubmit = async (data) => {
 *     await update({
 *       displayName: data.displayName,
 *       description: data.bio,
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input defaultValue={profile?.displayName} />
 *       <button disabled={isUpdating}>
 *         {isUpdating ? "Saving..." : "Save"}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useProfile(did?: string): UseProfileResult {
  const { session } = useATProtoAuth();
  const queryClient = useQueryClient();

  // Determine which DID to use
  const targetDid = did ?? session?.did ?? (session as { sub?: string } | null)?.sub;

  // Use repository for the target DID's server
  const { repository, status: repoStatus } = useRepository({
    repoDid: targetDid,
  });

  // Profile query
  const profileQuery = useQuery({
    queryKey: atprotoKeys.profile(targetDid ?? ""),
    queryFn: async (): Promise<Profile | null> => {
      if (!repository) return null;

      const profileData = await repository.profile.get();

      return {
        handle: profileData.handle,
        displayName: profileData.displayName,
        description: profileData.description,
        avatar: profileData.avatar,
        banner: profileData.banner,
        website: profileData.website,
      };
    },
    enabled: !!targetDid && repoStatus === "ready" && !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (params: ProfileUpdate) => {
      if (!repository) {
        throw new Error("Repository not available");
      }

      await repository.profile.update({
        displayName: params.displayName,
        description: params.description,
        avatar: params.avatar,
        banner: params.banner,
        website: params.website,
      });
    },
    onSuccess: () => {
      // Invalidate profile query to refetch
      queryClient.invalidateQueries({
        queryKey: atprotoKeys.profile(targetDid ?? ""),
      });
    },
  });

  // Callbacks
  const update = useCallback(
    async (params: ProfileUpdate) => {
      await updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const refetch = useCallback(async () => {
    await profileQuery.refetch();
  }, [profileQuery]);

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading || repoStatus === "loading",
    error: profileQuery.error ?? null,
    update,
    isUpdating: updateMutation.isPending,
    refetch,
  };
}
