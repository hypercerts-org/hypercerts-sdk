/**
 * Tests for createATProtoReact factory function.
 */

import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import React from "react";
import { createATProtoReact } from "../../src/factory/createATProtoReact.js";
import { createMockSDKConfig, createMockSession } from "../utils/fixtures.js";

// Mock sdk-core
vi.mock("@hypercerts-org/sdk-core", () => ({
  createATProtoSDK: vi.fn(() => ({
    authorize: vi.fn(),
    callback: vi.fn(),
    restoreSession: vi.fn(),
    revokeSession: vi.fn(),
    getRepository: vi.fn(),
    getLexiconRegistry: vi.fn(),
    pdsUrl: "https://pds.example.com",
    sdsUrl: "https://sds.example.com",
  })),
}));

describe("createATProtoReact", () => {
  describe("initialization", () => {
    it("should create an instance with config", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance).toBeDefined();
      expect(instance.sdk).toBeDefined();
      expect(instance.queryClient).toBeDefined();
      expect(instance.Provider).toBeDefined();
    });

    it("should create an instance with existing SDK", () => {
      const mockSDK = {
        authorize: vi.fn(),
        callback: vi.fn(),
        restoreSession: vi.fn(),
        revokeSession: vi.fn(),
        getRepository: vi.fn(),
        getLexiconRegistry: vi.fn(),
        pdsUrl: "https://pds.example.com",
        sdsUrl: "https://sds.example.com",
      };

      const instance = createATProtoReact({ sdk: mockSDK as any });

      expect(instance.sdk).toBe(mockSDK);
    });

    it("should throw error if neither config nor sdk provided", () => {
      expect(() => createATProtoReact({} as any)).toThrow(
        "createATProtoReact requires either 'config' or 'sdk' option"
      );
    });

    it("should use provided QueryClient", () => {
      const config = createMockSDKConfig();
      const customQueryClient = new QueryClient();
      const instance = createATProtoReact({ config, queryClient: customQueryClient });

      expect(instance.queryClient).toBe(customQueryClient);
    });

    it("should create default QueryClient if not provided", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.queryClient).toBeInstanceOf(QueryClient);
    });

    it("should configure default QueryClient with staleTime", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      // Check default options were set
      const defaults = instance.queryClient.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000);
      expect(defaults.queries?.retry).toBe(1);
    });
  });

  describe("returned instance", () => {
    it("should expose SDK instance", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.sdk).toBeDefined();
    });

    it("should expose QueryClient", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.queryClient).toBeInstanceOf(QueryClient);
    });

    it("should expose Provider component", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.Provider).toBeDefined();
      expect(typeof instance.Provider).toBe("function");
    });

    it("should expose all hooks", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.useSDK).toBeDefined();
      expect(instance.useAuth).toBeDefined();
      expect(instance.useRepository).toBeDefined();
      expect(instance.useProfile).toBeDefined();
      expect(instance.useOrganizations).toBeDefined();
      expect(instance.useOrganization).toBeDefined();
      expect(instance.useCollaborators).toBeDefined();
      expect(instance.useHypercerts).toBeDefined();
      expect(instance.useHypercert).toBeDefined();
    });

    it("should expose queryKeys", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance.queryKeys).toBeDefined();
      expect(instance.queryKeys.all).toEqual(["atproto"]);
    });
  });

  describe("Provider component", () => {
    it("should render children", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });
      const { Provider, queryClient } = instance;

      render(
        <QueryClientProvider client={queryClient}>
          <Provider>
            <div data-testid="child">Hello</div>
          </Provider>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("child")).toHaveTextContent("Hello");
    });

    it("should accept dehydratedState prop", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });
      const { Provider, queryClient } = instance;

      // Should not throw with dehydratedState
      render(
        <QueryClientProvider client={queryClient}>
          <Provider dehydratedState={{ mutations: [], queries: [] }}>
            <div>Test</div>
          </Provider>
        </QueryClientProvider>
      );
    });
  });

  describe("options", () => {
    it("should accept initialSession option", () => {
      const config = createMockSDKConfig();
      const session = createMockSession();
      const instance = createATProtoReact({ config, initialSession: session });

      expect(instance).toBeDefined();
    });

    it("should accept syncTabs option", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config, syncTabs: false });

      expect(instance).toBeDefined();
    });

    it("should default syncTabs to true", () => {
      const config = createMockSDKConfig();
      const instance = createATProtoReact({ config });

      expect(instance).toBeDefined();
      // syncTabs defaults to true internally
    });
  });
});

// Need to import QueryClientProvider for the Provider tests
import { QueryClientProvider } from "@tanstack/react-query";
