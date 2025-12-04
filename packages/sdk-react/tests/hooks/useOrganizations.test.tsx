/**
 * Tests for useOrganizations and useOrganization hooks.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession, createMockOrganization } from "../utils/fixtures.js";
import { useOrganizations, useOrganization } from "../../src/hooks/useOrganizations.js";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("useOrganizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listing organizations", () => {
    it("should return empty array when no organizations", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ organizations: [] });
      const mockRepo = { organizations: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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

      expect(result.current.organizations).toEqual([]);
    });

    it("should fetch and return organizations", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockOrgs = [
        createMockOrganization({ did: "did:plc:org1", name: "Org 1" }),
        createMockOrganization({ did: "did:plc:org2", name: "Org 2" }),
      ];
      const mockList = vi.fn().mockResolvedValue({ organizations: mockOrgs });
      const mockRepo = { organizations: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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
        expect(result.current.organizations.length).toBe(2);
      });

      expect(result.current.organizations[0].name).toBe("Org 1");
      expect(result.current.organizations[1].name).toBe("Org 2");
    });

    it("should return loading state when not authenticated", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useOrganizations(), {
        wrapper: createWrapper({
          session: null,
          queryClient,
        }),
      });

      // Should not be loading but have no orgs
      await waitFor(() => {
        expect(result.current.organizations).toEqual([]);
      });
    });
  });

  describe("creating organizations", () => {
    it("should provide create function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ organizations: [] });
      const mockCreate = vi.fn().mockResolvedValue(createMockOrganization());
      const mockRepo = { organizations: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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

      expect(result.current.create).toBeDefined();
      expect(typeof result.current.create).toBe("function");
    });

    it("should call repository.organizations.create with params", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const newOrg = createMockOrganization({ name: "New Org" });
      const mockList = vi.fn().mockResolvedValue({ organizations: [] });
      const mockCreate = vi.fn().mockResolvedValue(newOrg);
      const mockRepo = { organizations: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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

      const createParams = {
        name: "New Org",
        description: "A new organization",
      };

      await act(async () => {
        const created = await result.current.create(createParams);
        expect(created.name).toBe("New Org");
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Org",
          description: "A new organization",
        }),
      );
    });

    it("should set isCreating while create is in progress", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      let resolveCreate: (org: ReturnType<typeof createMockOrganization>) => void;
      const mockList = vi.fn().mockResolvedValue({ organizations: [] });
      const mockCreate = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );
      const mockRepo = { organizations: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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

      // Start create without awaiting
      act(() => {
        result.current.create({ name: "New Org" });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      // Complete create
      await act(async () => {
        resolveCreate!(createMockOrganization());
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });
  });

  describe("refetching organizations", () => {
    it("should provide refetch function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ organizations: [] });
      const mockRepo = { organizations: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganizations(), {
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
});

describe("useOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetching single organization", () => {
    it("should fetch organization by DID", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockOrg = createMockOrganization({
        did: "did:plc:testorg",
        name: "Test Org",
      });
      const mockGet = vi.fn().mockResolvedValue(mockOrg);
      const mockRepo = { organizations: { list: vi.fn(), create: vi.fn(), get: mockGet } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganization("did:plc:testorg"), {
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
        expect(result.current.organization).not.toBeNull();
      });

      expect(result.current.organization?.name).toBe("Test Org");
      expect(mockGet).toHaveBeenCalledWith("did:plc:testorg");
    });

    it("should return null when organization not found", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockGet = vi.fn().mockResolvedValue(null);
      const mockRepo = { organizations: { list: vi.fn(), create: vi.fn(), get: mockGet } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganization("did:plc:nonexistent"), {
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

      expect(result.current.organization).toBeNull();
    });

    it("should provide refetch function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockGet = vi.fn().mockResolvedValue(createMockOrganization());
      const mockRepo = { organizations: { list: vi.fn(), create: vi.fn(), get: mockGet } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganization("did:plc:testorg"), {
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

      const mockError = new Error("Organization fetch failed");
      const mockGet = vi.fn().mockRejectedValue(mockError);
      const mockRepo = { organizations: { list: vi.fn(), create: vi.fn(), get: mockGet } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useOrganization("did:plc:testorg"), {
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

      expect(result.current.error?.message).toBe("Organization fetch failed");
    });
  });
});
