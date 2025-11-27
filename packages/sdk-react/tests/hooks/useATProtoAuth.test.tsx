/**
 * Tests for useATProtoAuth hook.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession } from "../utils/fixtures.js";
import { useATProtoAuth } from "../../src/hooks/useATProtoAuth.js";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("useATProtoAuth", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage/sessionStorage mocks
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    // Restore window.location if it was mocked
    if (window.location !== originalLocation) {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    }
  });

  /**
   * Helper to mock window.location for navigation tests.
   */
  function mockWindowLocation() {
    const mockLocation = {
      ...originalLocation,
      href: "",
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
      configurable: true,
    });
    return mockLocation;
  }

  describe("initial state", () => {
    it("should return idle status when no session", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ session: null, queryClient }),
      });

      // Wait for initial query to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.session).toBeNull();
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should return authenticated status with initial session", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ session, queryClient }),
      });

      // Wait for query to load initial session
      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      expect(result.current.status).toBe("authenticated");
      expect(result.current.session).toEqual(session);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe("login", () => {
    it("should provide login function", () => {
      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.login).toBeDefined();
      expect(typeof result.current.login).toBe("function");
    });

    it("should call sdk.authorize with identifier", async () => {
      const mockAuthorize = vi.fn().mockResolvedValue("https://auth.example.com");
      mockWindowLocation();

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ sdk: { authorize: mockAuthorize } }),
      });

      await act(async () => {
        // The login function returns a promise that may throw due to navigation
        try {
          await result.current.login("test.bsky.social");
        } catch {
          // Navigation mock may throw
        }
      });

      expect(mockAuthorize).toHaveBeenCalledWith("test.bsky.social");
    });

    it("should set authorizing status during login", async () => {
      let resolveAuthorize: (value: string) => void;
      const mockAuthorize = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveAuthorize = resolve;
          }),
      );

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ sdk: { authorize: mockAuthorize } }),
      });

      // Start login (don't await)
      act(() => {
        result.current.login("test.bsky.social");
      });

      // Should be authorizing
      await waitFor(() => {
        expect(result.current.status).toBe("authorizing");
        expect(result.current.isLoading).toBe(true);
      });

      // Complete authorization (prevent navigation error)
      mockWindowLocation();

      await act(async () => {
        resolveAuthorize!("https://auth.example.com");
      });
    });

    it("should set error status on login failure", async () => {
      const mockError = new Error("Auth failed");
      const mockAuthorize = vi.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ sdk: { authorize: mockAuthorize } }),
      });

      await act(async () => {
        try {
          await result.current.login("test.bsky.social");
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe("logout", () => {
    it("should provide logout function", () => {
      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.logout).toBeDefined();
      expect(typeof result.current.logout).toBe("function");
    });

    it("should call sdk.revokeSession on logout", async () => {
      const session = createMockSession({ did: "did:plc:test123" });
      const mockRevokeSession = vi.fn().mockResolvedValue(undefined);

      // Pre-populate query cache with session
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({
          session,
          sdk: { revokeSession: mockRevokeSession },
          queryClient,
        }),
      });

      // Wait for session to be available
      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockRevokeSession).toHaveBeenCalledWith("did:plc:test123");
    });

    it("should clear queries after logout", async () => {
      const session = createMockSession({ did: "did:plc:test123" });
      const mockRevokeSession = vi.fn().mockResolvedValue(undefined);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      // Spy on removeQueries
      const removeQueriesSpy = vi.spyOn(queryClient, "removeQueries");

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({
          session,
          sdk: { revokeSession: mockRevokeSession },
          queryClient,
        }),
      });

      // Wait for session to be available
      await waitFor(() => {
        expect(result.current.session).toEqual(session);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Verify revokeSession was called
      expect(mockRevokeSession).toHaveBeenCalledWith("did:plc:test123");

      // Verify queries were cleared
      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: atprotoKeys.all });
    });
  });

  describe("refresh", () => {
    it("should provide refresh function", () => {
      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe("function");
    });

    it("should call sdk.restoreSession on refresh", async () => {
      const session = createMockSession({ did: "did:plc:test123" });
      const newSession = createMockSession({ did: "did:plc:test123", handle: "refreshed.handle" });
      const mockRestoreSession = vi.fn().mockResolvedValue(newSession);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({
          session,
          sdk: { restoreSession: mockRestoreSession },
          queryClient,
        }),
      });

      // Wait for session to be available
      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRestoreSession).toHaveBeenCalledWith("did:plc:test123");
    });

    it("should not call restoreSession if no session", async () => {
      const mockRestoreSession = vi.fn();

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({
          session: null,
          sdk: { restoreSession: mockRestoreSession },
          queryClient,
        }),
      });

      // Wait for query to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRestoreSession).not.toHaveBeenCalled();
    });
  });

  describe("isValid", () => {
    it("should be true when session exists", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ session, queryClient }),
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should be false when no session", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useATProtoAuth(), {
        wrapper: createWrapper({ session: null, queryClient }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should throw when used outside provider", () => {
      // Render without wrapper
      expect(() => {
        renderHook(() => useATProtoAuth());
      }).toThrow("useATProtoAuth must be used within an ATProtoProvider");
    });
  });
});
