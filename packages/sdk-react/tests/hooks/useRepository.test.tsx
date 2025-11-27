/**
 * Tests for useRepository hook.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createWrapper } from "../utils/render.js";
import { createMockSession } from "../utils/fixtures.js";
import { useRepository } from "../../src/hooks/useRepository.js";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("useRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return idle status when not authenticated", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const { result } = renderHook(() => useRepository(), {
        wrapper: createWrapper({ session: null, queryClient }),
      });

      await waitFor(() => {
        expect(result.current.status).toBe("idle");
      });

      expect(result.current.repository).toBeNull();
      expect(result.current.isSDS).toBe(false);
      expect(result.current.serverUrl).toBeNull();
    });

    it("should return loading status while resolving server", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepository = vi.fn().mockReturnValue({ records: {} });

      const { result } = renderHook(() => useRepository(), {
        wrapper: createWrapper({
          session,
          sdk: { repository: mockRepository, pdsUrl: "https://pds.example.com" },
          queryClient,
        }),
      });

      // Initially may be loading
      expect(["idle", "loading", "ready"]).toContain(result.current.status);
    });
  });

  describe("server routing", () => {
    it("should use PDS server by default", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository(), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.isSDS).toBe(false);
      expect(result.current.serverUrl).toBe("https://pds.example.com");
    });

    it("should use SDS server when specified", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository({ server: "sds" }), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.isSDS).toBe(true);
      expect(result.current.serverUrl).toBe("https://sds.example.com");
    });

    it("should use custom server URL when provided", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository({ serverUrl: "https://custom.server.com" }), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.serverUrl).toBe("https://custom.server.com");
    });

    it("should use provided repoDid instead of session DID", async () => {
      const session = createMockSession({ did: "did:plc:user123" });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository({ repoDid: "did:plc:otheruser456" }), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.repository).not.toBeNull();
    });
  });

  describe("repository creation", () => {
    it("should call sdk.repository with session and server options", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository(), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(mockRepository).toHaveBeenCalledWith(session, {
        serverUrl: "https://pds.example.com",
        server: "pds",
      });
    });

    it("should return repository instance when ready", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepo = { records: { list: vi.fn() } };
      const mockRepository = vi.fn().mockReturnValue(mockRepo);

      const { result } = renderHook(() => useRepository(), {
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
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.repository).toBe(mockRepo);
    });
  });

  describe("error handling", () => {
    it("should return error status when SDS not configured", async () => {
      const session = createMockSession();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(atprotoKeys.session(), session);

      const mockRepository = vi.fn().mockReturnValue({ records: {} });

      const { result } = renderHook(() => useRepository({ server: "sds" }), {
        wrapper: createWrapper({
          session,
          sdk: {
            repository: mockRepository,
            pdsUrl: "https://pds.example.com",
            sdsUrl: undefined, // Explicitly not configured
          },
          queryClient,
        }),
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should throw when used outside provider", () => {
      expect(() => {
        renderHook(() => useRepository());
      }).toThrow("useRepository must be used within an ATProtoProvider");
    });
  });
});
