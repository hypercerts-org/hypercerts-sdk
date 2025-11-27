/**
 * Tests for useCollaborators hook.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession, createMockPermissions } from "../utils/fixtures.js";
import { useCollaborators } from "../../src/hooks/useCollaborators.js";
import { atprotoKeys } from "../../src/queries/keys.js";

/**
 * Create a mock collaborator grant for testing.
 */
function createMockGrant(overrides: {
  userDid?: string;
  role?: "viewer" | "editor" | "admin" | "owner";
  grantedBy?: string;
  grantedAt?: string;
} = {}) {
  const role = overrides.role ?? "viewer";
  return {
    userDid: overrides.userDid ?? "did:plc:collaborator123",
    permissions: createMockPermissions(role),
    grantedBy: overrides.grantedBy ?? "did:plc:owner123",
    grantedAt: overrides.grantedAt ?? new Date().toISOString(),
  };
}

describe("useCollaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listing collaborators", () => {
    it("should return empty array when no collaborators", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.collaborators).toEqual([]);
    });

    it("should fetch and return collaborators with permissions", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockGrants = [
        createMockGrant({ userDid: "did:plc:user1", role: "admin" }),
        createMockGrant({ userDid: "did:plc:user2", role: "editor" }),
        createMockGrant({ userDid: "did:plc:user3", role: "viewer" }),
      ];
      const mockList = vi.fn().mockResolvedValue(mockGrants);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.collaborators.length).toBe(3);
      });

      // Verify permissions are passed through directly
      expect(result.current.collaborators[0].userDid).toBe("did:plc:user1");
      expect(result.current.collaborators[0].permissions.admin).toBe(true);

      expect(result.current.collaborators[1].userDid).toBe("did:plc:user2");
      expect(result.current.collaborators[1].permissions.update).toBe(true);
      expect(result.current.collaborators[1].permissions.admin).toBe(false);

      expect(result.current.collaborators[2].userDid).toBe("did:plc:user3");
      expect(result.current.collaborators[2].permissions.read).toBe(true);
      expect(result.current.collaborators[2].permissions.create).toBe(false);
    });
  });

  describe("granting access", () => {
    it("should provide grant function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockGrant = vi.fn().mockResolvedValue(undefined);
      const mockRepo = { collaborators: { list: mockList, grant: mockGrant, revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.grant).toBeDefined();
      expect(typeof result.current.grant).toBe("function");
    });

    it("should call repository.collaborators.grant with params", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockGrant = vi.fn().mockResolvedValue(undefined);
      const mockRepo = { collaborators: { list: mockList, grant: mockGrant, revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for repo to be ready
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.grant({
          userDid: "did:plc:newuser",
          role: "editor",
        });
      });

      expect(mockGrant).toHaveBeenCalledWith({
        userDid: "did:plc:newuser",
        role: "editor",
      });
    });

    it("should set isGranting while grant is in progress", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      let resolveGrant: () => void;
      const mockList = vi.fn().mockResolvedValue([]);
      const mockGrant = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveGrant = resolve;
          }),
      );
      const mockRepo = { collaborators: { list: mockList, grant: mockGrant, revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for repo to be ready
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start grant without awaiting
      act(() => {
        result.current.grant({ userDid: "did:plc:newuser", role: "viewer" });
      });

      await waitFor(() => {
        expect(result.current.isGranting).toBe(true);
      });

      // Complete grant
      await act(async () => {
        resolveGrant!();
      });

      await waitFor(() => {
        expect(result.current.isGranting).toBe(false);
      });
    });
  });

  describe("revoking access", () => {
    it("should provide revoke function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockRevoke = vi.fn().mockResolvedValue(undefined);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: mockRevoke } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.revoke).toBeDefined();
      expect(typeof result.current.revoke).toBe("function");
    });

    it("should call repository.collaborators.revoke with userDid", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockRevoke = vi.fn().mockResolvedValue(undefined);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: mockRevoke } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for repo to be ready
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.revoke("did:plc:usertoremove");
      });

      expect(mockRevoke).toHaveBeenCalledWith({
        userDid: "did:plc:usertoremove",
      });
    });

    it("should set isRevoking while revoke is in progress", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      let resolveRevoke: () => void;
      const mockList = vi.fn().mockResolvedValue([]);
      const mockRevoke = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveRevoke = resolve;
          }),
      );
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: mockRevoke } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for repo to be ready
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start revoke without awaiting
      act(() => {
        result.current.revoke("did:plc:usertoremove");
      });

      await waitFor(() => {
        expect(result.current.isRevoking).toBe(true);
      });

      // Complete revoke
      await act(async () => {
        resolveRevoke!();
      });

      await waitFor(() => {
        expect(result.current.isRevoking).toBe(false);
      });
    });
  });

  describe("refetching collaborators", () => {
    it("should provide refetch function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue([]);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("error handling", () => {
    it("should return error when fetch fails", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockError = new Error("Collaborators fetch failed");
      const mockList = vi.fn().mockRejectedValue(mockError);
      const mockRepo = { collaborators: { list: mockList, grant: vi.fn(), revoke: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useCollaborators("did:plc:testrepo"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            sdsUrl: "https://sds.example.com",
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Collaborators fetch failed");
    });
  });
});
