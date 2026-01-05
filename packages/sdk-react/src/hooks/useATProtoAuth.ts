/**
 * Hook for ATProto authentication.
 *
 * @packageDocumentation
 */

import { useContext, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@hypercerts-org/sdk-core";
import { ATProtoContext } from "../context/ATProtoContext.js";
import { atprotoKeys } from "../queries/keys.js";
import { broadcastSessionChange } from "../utils/sync.js";
import type { AuthStatus, UseAuthResult } from "../types.js";

/**
 * Consolidated authentication hook providing session data, auth status, and all auth actions.
 *
 * This hook merges session management with auth actions to provide a single,
 * cohesive interface for authentication state.
 *
 * @returns Authentication state and actions
 *
 * @example Basic usage
 * ```typescript
 * function AuthButton() {
 *   const { status, session, login, logout } = useAuth();
 *
 *   switch (status) {
 *     case "idle":
 *       return <Button onClick={() => login("bsky.social")}>Sign in</Button>;
 *     case "authorizing":
 *       return <Button disabled>Signing in...</Button>;
 *     case "authenticated":
 *       return <Button onClick={logout}>Sign out ({session.handle})</Button>;
 *     case "error":
 *       return <Button onClick={() => login("bsky.social")}>Retry</Button>;
 *   }
 * }
 * ```
 *
 * @example Session refresh
 * ```typescript
 * function SessionManager() {
 *   const { refresh, isValid } = useAuth();
 *
 *   useEffect(() => {
 *     if (!isValid) {
 *       refresh();
 *     }
 *   }, [isValid, refresh]);
 * }
 * ```
 */
export function useATProtoAuth(): UseAuthResult {
  const context = useContext(ATProtoContext);

  if (!context) {
    throw new Error(
      "useATProtoAuth must be used within an ATProtoProvider. " +
        "Make sure to wrap your app with the Provider from createATProtoReact().",
    );
  }

  const { sdk, initialSession } = context;
  const queryClient = useQueryClient();

  // Session query - restores session from storage
  const sessionQuery = useQuery({
    queryKey: atprotoKeys.session(),
    queryFn: async (): Promise<Session | null> => {
      // If we have an initial session (SSR), use it
      if (initialSession) {
        return initialSession;
      }

      // Try to get stored session DID from localStorage
      if (typeof window !== "undefined") {
        const storedDid = localStorage.getItem("atproto-session-did");
        if (storedDid) {
          try {
            const session = await sdk.restoreSession(storedDid);
            return session;
          } catch {
            // Session expired or invalid, clear storage
            localStorage.removeItem("atproto-session-did");
            return null;
          }
        }
      }

      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ identifier, redirectUrl }: { identifier: string; redirectUrl?: string }) => {
      const authUrl = await sdk.authorize(identifier);

      // Store redirect URL if provided
      if (redirectUrl && typeof window !== "undefined") {
        sessionStorage.setItem("atproto-redirect-url", redirectUrl);
      }

      // Redirect to authorization URL
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data;
      if (session) {
        const did = session.did || (session as { sub?: string }).sub;
        if (did) {
          await sdk.revokeSession(did);

          // Clear stored DID
          if (typeof window !== "undefined") {
            localStorage.removeItem("atproto-session-did");
          }
        }
      }
    },
    onSuccess: () => {
      // Clear all ATProto queries
      queryClient.removeQueries({ queryKey: atprotoKeys.all });

      // Broadcast logout to other tabs
      broadcastSessionChange("session:revoked");
    },
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data;
      if (session) {
        const did = session.did || (session as { sub?: string }).sub;
        if (did) {
          const newSession = await sdk.restoreSession(did);
          return newSession;
        }
      }
      return null;
    },
    onSuccess: (newSession) => {
      if (newSession) {
        queryClient.setQueryData(atprotoKeys.session(), newSession);
        broadcastSessionChange("session:changed", newSession.did);
      }
    },
  });

  // Derive status from query/mutation states
  const status: AuthStatus = useMemo(() => {
    if (loginMutation.isPending) return "authorizing";
    if (sessionQuery.isLoading) return "idle";
    if (sessionQuery.error || loginMutation.error) return "error";
    if (sessionQuery.data) return "authenticated";
    return "idle";
  }, [sessionQuery.isLoading, sessionQuery.data, sessionQuery.error, loginMutation.isPending, loginMutation.error]);

  // Check if session is valid (not expired)
  const isValid = useMemo(() => {
    if (!sessionQuery.data) return false;
    // Session exists and no error indicates it's valid
    // The SDK handles token refresh internally
    return true;
  }, [sessionQuery.data]);

  // Callbacks
  const login = useCallback(
    (identifier: string, redirectUrl?: string) => loginMutation.mutateAsync({ identifier, redirectUrl }),
    [loginMutation],
  );

  const logout = useCallback(() => logoutMutation.mutateAsync(), [logoutMutation]);

  const refresh = useCallback(() => refreshMutation.mutateAsync().then(() => undefined), [refreshMutation]);

  return {
    session: sessionQuery.data ?? null,
    status,
    error: sessionQuery.error ?? loginMutation.error ?? logoutMutation.error ?? null,
    isValid,
    login,
    logout,
    refresh,
    isLoading:
      sessionQuery.isLoading || loginMutation.isPending || logoutMutation.isPending || refreshMutation.isPending,
  };
}
