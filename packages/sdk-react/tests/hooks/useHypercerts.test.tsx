/**
 * Tests for useHypercerts and useHypercert hooks.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession, createMockHypercert } from "../utils/fixtures.js";
import { useHypercerts, useHypercert } from "../../src/hooks/useHypercerts.js";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("useHypercerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listing hypercerts", () => {
    it("should return empty array when no hypercerts", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ records: [], cursor: undefined });
      const mockRepo = { hypercerts: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
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
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hypercerts).toEqual([]);
    });

    it("should fetch and return hypercerts", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHypercerts = [
        {
          uri: "at://did:plc:test/org.hypercerts.hypercert/1",
          cid: "cid1",
          record: createMockHypercert({ title: "HC 1" }),
        },
        {
          uri: "at://did:plc:test/org.hypercerts.hypercert/2",
          cid: "cid2",
          record: createMockHypercert({ title: "HC 2" }),
        },
      ];
      const mockList = vi.fn().mockResolvedValue({ records: mockHypercerts, cursor: undefined });
      const mockRepo = { hypercerts: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
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
        expect(result.current.hypercerts.length).toBe(2);
      });

      expect(result.current.hypercerts[0].title).toBe("HC 1");
      expect(result.current.hypercerts[1].title).toBe("HC 2");
    });

    it("should support pagination with hasNextPage", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHypercerts = [
        {
          uri: "at://did:plc:test/org.hypercerts.hypercert/1",
          cid: "cid1",
          record: createMockHypercert({ title: "HC 1" }),
        },
      ];
      const mockList = vi.fn().mockResolvedValue({ records: mockHypercerts, cursor: "next-page-cursor" });
      const mockRepo = { hypercerts: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
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
        expect(result.current.hypercerts.length).toBe(1);
      });

      expect(result.current.hasNextPage).toBe(true);
    });

    it("should fetch hypercerts for specified repoDid", async () => {
      const session = createMockSession({ did: "did:plc:currentuser" });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHypercerts = [
        {
          uri: "at://did:plc:org/org.hypercerts.hypercert/1",
          cid: "cid1",
          record: createMockHypercert({ title: "Org HC" }),
        },
      ];
      const mockList = vi.fn().mockResolvedValue({ records: mockHypercerts, cursor: undefined });
      const mockRepo = { hypercerts: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts("did:plc:org"), {
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
        expect(result.current.hypercerts.length).toBe(1);
      });

      expect(result.current.hypercerts[0].title).toBe("Org HC");
    });
  });

  describe("creating hypercerts", () => {
    it("should provide create function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ records: [], cursor: undefined });
      const mockCreate = vi.fn().mockResolvedValue({ hypercertUri: "at://test/hc/1" });
      const mockRepo = { hypercerts: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.create).toBeDefined();
      expect(typeof result.current.create).toBe("function");
    });

    it("should call repository.hypercerts.create with params", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ records: [], cursor: undefined });
      const mockCreate = vi.fn().mockResolvedValue({ hypercertUri: "at://test/hc/1" });
      const mockRepo = { hypercerts: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
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
        title: "New Hypercert",
        description: "A new hypercert",
        workScope: "Testing",
        workTimeframeFrom: "2024-01-01",
        workTimeframeTo: "2024-12-31",
        rights: { name: "CC-BY-4.0", type: "license" as const, description: "Attribution" },
      };

      await act(async () => {
        const created = await result.current.create(createParams);
        expect(created.hypercertUri).toBe("at://test/hc/1");
      });

      expect(mockCreate).toHaveBeenCalledWith(createParams);
    });

    it("should set isCreating while create is in progress", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      let resolveCreate: (result: { hypercertUri: string }) => void;
      const mockList = vi.fn().mockResolvedValue({ records: [], cursor: undefined });
      const mockCreate = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );
      const mockRepo = { hypercerts: { list: mockList, create: mockCreate, get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
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
        result.current.create({
          title: "New HC",
          description: "Test description",
          workScope: "Test",
          workTimeframeFrom: "2024-01-01",
          workTimeframeTo: "2024-12-31",
          rights: { name: "CC-BY-4.0", type: "license" as const, description: "Attribution" },
        });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      // Complete create
      await act(async () => {
        resolveCreate!({ hypercertUri: "at://test/hc/1" });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });
  });

  describe("refetching hypercerts", () => {
    it("should provide refetch function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockList = vi.fn().mockResolvedValue({ records: [], cursor: undefined });
      const mockRepo = { hypercerts: { list: mockList, create: vi.fn(), get: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercerts(), {
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
  });
});

describe("useHypercert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetching single hypercert", () => {
    it("should fetch hypercert by URI", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHC = createMockHypercert({ title: "Test Hypercert" });
      const mockGet = vi.fn().mockResolvedValue({
        uri: "at://did:plc:test/org.hypercerts.hypercert/123",
        cid: "cid123",
        record: mockHC,
      });
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: vi.fn(), delete: vi.fn() },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercert("at://did:plc:test/org.hypercerts.hypercert/123"), {
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
        expect(result.current.hypercert).not.toBeNull();
      });

      expect(result.current.hypercert?.title).toBe("Test Hypercert");
    });

    it("should return null when hypercert not found", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockGet = vi.fn().mockResolvedValue(null);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: vi.fn(), delete: vi.fn() },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercert("at://did:plc:test/org.hypercerts.hypercert/nonexistent"), {
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
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hypercert).toBeNull();
    });
  });

  describe("updating hypercert", () => {
    it("should provide update function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHC = createMockHypercert();
      const mockGet = vi.fn().mockResolvedValue({ uri: "at://test", cid: "cid", record: mockHC });
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: mockUpdate, delete: vi.fn() },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercert("at://did:plc:test/org.hypercerts.hypercert/123"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.update).toBeDefined();
      expect(typeof result.current.update).toBe("function");
    });

    it("should call repository.hypercerts.update with params", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHC = createMockHypercert();
      const mockGet = vi.fn().mockResolvedValue({ uri: "at://test", cid: "cid", record: mockHC });
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: mockUpdate, delete: vi.fn() },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const uri = "at://did:plc:test/org.hypercerts.hypercert/123";

      const { result } = renderHook(() => useHypercert(uri), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for hypercert to load
      await waitFor(() => {
        expect(result.current.hypercert).not.toBeNull();
      });

      await act(async () => {
        await result.current.update({ title: "Updated Title" });
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        uri,
        updates: { title: "Updated Title" },
      });
    });
  });

  describe("deleting hypercert", () => {
    it("should provide remove function", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHC = createMockHypercert();
      const mockGet = vi.fn().mockResolvedValue({ uri: "at://test", cid: "cid", record: mockHC });
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: vi.fn(), delete: mockDelete },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercert("at://did:plc:test/org.hypercerts.hypercert/123"), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      expect(result.current.remove).toBeDefined();
      expect(typeof result.current.remove).toBe("function");
    });

    it("should call repository.hypercerts.delete", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockHC = createMockHypercert();
      const mockGet = vi.fn().mockResolvedValue({ uri: "at://test", cid: "cid", record: mockHC });
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: vi.fn(), delete: mockDelete },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const uri = "at://did:plc:test/org.hypercerts.hypercert/123";

      const { result } = renderHook(() => useHypercert(uri), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
          },
          queryClient,
        }),
      });

      // Wait for hypercert to load
      await waitFor(() => {
        expect(result.current.hypercert).not.toBeNull();
      });

      await act(async () => {
        await result.current.remove();
      });

      expect(mockDelete).toHaveBeenCalledWith(uri);
    });
  });

  describe("error handling", () => {
    it("should return error when fetch fails", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockError = new Error("Hypercert fetch failed");
      const mockGet = vi.fn().mockRejectedValue(mockError);
      const mockRepo = {
        hypercerts: { list: vi.fn(), create: vi.fn(), get: mockGet, update: vi.fn(), delete: vi.fn() },
      };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useHypercert("at://did:plc:test/org.hypercerts.hypercert/123"), {
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

      expect(result.current.error?.message).toBe("Hypercert fetch failed");
    });
  });
});
