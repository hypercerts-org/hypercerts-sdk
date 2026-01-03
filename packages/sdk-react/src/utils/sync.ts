/**
 * Cross-tab session synchronization utilities.
 *
 * Uses BroadcastChannel API to keep session state synchronized
 * across browser tabs.
 *
 * @packageDocumentation
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { atprotoKeys } from "../queries/keys.js";
import type { SyncMessage } from "../types.js";

/**
 * BroadcastChannel name for session sync.
 */
const SYNC_CHANNEL = "atproto-session-sync";

/**
 * Broadcast a session change to other tabs.
 *
 * @param type - The type of session event
 * @param did - Optional DID associated with the event
 *
 * @example
 * ```typescript
 * // After successful login
 * broadcastSessionChange("session:changed", session.did);
 *
 * // After logout
 * broadcastSessionChange("session:revoked");
 * ```
 */
export function broadcastSessionChange(type: SyncMessage["type"], did?: string): void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return;
  }

  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    const message: SyncMessage = {
      type,
      did,
      timestamp: Date.now(),
    };
    channel.postMessage(message);
    channel.close();
  } catch {
    // Silently fail if BroadcastChannel is not supported
  }
}

/**
 * Hook for cross-tab session synchronization.
 *
 * Listens for session changes from other tabs and invalidates
 * the appropriate queries to keep data in sync.
 *
 * @param enabled - Whether sync is enabled (default: true)
 *
 * @example
 * ```typescript
 * function SessionSyncProvider({ children }) {
 *   useSessionSync(true);
 *   return <>{children}</>;
 * }
 * ```
 */
export function useSessionSync(enabled: boolean = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    let channel: BroadcastChannel;

    try {
      channel = new BroadcastChannel(SYNC_CHANNEL);
    } catch {
      // BroadcastChannel not supported
      return;
    }

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { type } = event.data;

      switch (type) {
        case "session:changed":
          // Invalidate session query to refetch
          queryClient.invalidateQueries({ queryKey: atprotoKeys.session() });
          break;

        case "session:revoked":
          // Clear all ATProto queries on logout
          queryClient.removeQueries({ queryKey: atprotoKeys.all });
          break;
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [enabled, queryClient]);
}
