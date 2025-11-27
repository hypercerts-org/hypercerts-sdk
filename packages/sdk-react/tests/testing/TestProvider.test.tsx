/**
 * Tests for TestProvider component.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { QueryClient } from "@tanstack/react-query";
import { TestProvider } from "../../src/testing/TestProvider.js";
import { ATProtoContext } from "../../src/context/ATProtoContext.js";
import type { ATProtoContextValue } from "../../src/context/types.js";
import { createMockSession } from "../../src/testing/mocks.js";

describe("TestProvider", () => {
  it("should render children", () => {
    render(
      <TestProvider>
        <div data-testid="child">Test Child</div>
      </TestProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Test Child");
  });

  it("should provide ATProto context", () => {
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue).toHaveProperty("sdk");
    expect(contextValue).toHaveProperty("queryClient");
  });

  it("should use provided mockSession", () => {
    const mockSession = createMockSession({ did: "did:plc:test123" });
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider mockSession={mockSession}>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.initialSession).toBe(mockSession);
  });

  it("should use null session when not provided", () => {
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider mockSession={null}>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.initialSession).toBeNull();
  });

  it("should use provided queryClient", () => {
    const customQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider queryClient={customQueryClient}>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.queryClient).toBe(customQueryClient);
  });

  it("should create default queryClient with test-friendly defaults", () => {
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.queryClient).toBeInstanceOf(QueryClient);
  });

  it("should merge mockSDK overrides with default SDK", () => {
    const mockAuthorize = vi.fn().mockResolvedValue("https://custom.auth");
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider mockSDK={{ authorize: mockAuthorize }}>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.sdk.authorize).toBe(mockAuthorize);
    // Should still have other default SDK methods
    expect(contextValue!.sdk.pdsUrl).toBeDefined();
  });

  it("should disable tab sync in tests", () => {
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(
      <TestProvider>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.syncTabs).toBe(false);
  });
});
