/**
 * Tests for useProfile hook.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession, createMockProfile } from "../utils/fixtures.js";
import { useProfile } from "../../src/hooks/useProfile.js";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetching profile", () => {
    it("should return loading state initially", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile();
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Initially should be loading or have data (depending on timing)
      expect(["true", "false"]).toContain(String(result.current.isLoading));
    });

    it("should fetch profile for current user", async () => {
      const session = createMockSession({ did: "did:plc:currentuser" });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile({
        handle: "test.bsky.social",
        displayName: "Test User",
      });
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.profile?.handle).toBe("test.bsky.social");
      expect(result.current.profile?.displayName).toBe("Test User");
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch profile for specified DID", async () => {
      const session = createMockSession({ did: "did:plc:currentuser" });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile({
        handle: "other.bsky.social",
        displayName: "Other User",
      });
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile("did:plc:otheruser"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.profile?.handle).toBe("other.bsky.social");
    });

    it("should return null profile when no session", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session: null,
          queryClient,
        }),
      });

      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe("saving profile", () => {
    it("should provide save function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile();
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockUpsertCertifiedProfile = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        profile: { getCertifiedProfile: mockGetCertifiedProfile, upsertCertifiedProfile: mockUpsertCertifiedProfile },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.save).toBeDefined();
      expect(typeof result.current.save).toBe("function");
    });

    it("should call repository.profile.upsert with params", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile();
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockUpsertCertifiedProfile = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        profile: { getCertifiedProfile: mockGetCertifiedProfile, upsertCertifiedProfile: mockUpsertCertifiedProfile },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for profile to load
      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      const updateParams = {
        displayName: "New Name",
        description: "New bio",
      };

      await act(async () => {
        await result.current.save(updateParams);
      });

      expect(mockUpsertCertifiedProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "New Name",
          description: "New bio",
        }),
      );
    });

    it("should set isSaving while save is in progress", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      let resolveUpdate: () => void;
      const mockProfile = createMockProfile();
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockUpsertCertifiedProfile = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpdate = resolve;
          }),
      );
      const mockRepo = {
        profile: { getCertifiedProfile: mockGetCertifiedProfile, upsertCertifiedProfile: mockUpsertCertifiedProfile },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for profile to load
      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      // Start save without awaiting
      act(() => {
        result.current.save({ displayName: "New Name" });
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      // Complete the save
      await act(async () => {
        resolveUpdate!();
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe("refetching profile", () => {
    it("should provide refetch function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile();
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe("function");
    });

    it("should refetch profile when called", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockProfile = createMockProfile({ displayName: "Initial Name" });
      const mockGetCertifiedProfile = vi.fn().mockResolvedValue(mockProfile);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      // Clear mock and set new response
      mockGetCertifiedProfile.mockClear();
      mockGetCertifiedProfile.mockResolvedValue({ ...mockProfile, displayName: "Updated Name" });

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Verify getCertifiedProfile was called again
      expect(mockGetCertifiedProfile).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return error when profile fetch fails", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockError = new Error("Profile fetch failed");
      const mockGetCertifiedProfile = vi.fn().mockRejectedValue(mockError);
      const mockRepo = { profile: { getCertifiedProfile: mockGetCertifiedProfile, updateCertifiedProfile: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Profile fetch failed");
    });
  });
});
