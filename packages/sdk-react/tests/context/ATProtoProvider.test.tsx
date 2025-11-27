/**
 * Tests for ATProtoProvider component.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import React, { useContext } from "react";
import type { ATProtoSDK } from "@hypercerts-org/sdk-core";
import { ATProtoProvider } from "../../src/context/ATProtoProvider.js";
import { ATProtoContext } from "../../src/context/ATProtoContext.js";
import type { ATProtoContextValue } from "../../src/context/types.js";
import { TestProvider } from "../../src/testing/TestProvider.js";
import { createTestQueryClient } from "../utils/render.js";
import { createMockSession } from "../utils/fixtures.js";

describe("ATProtoProvider", () => {
  it("should render children", () => {
    render(
      <TestProvider>
        <div data-testid="child">Test Child</div>
      </TestProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Test Child");
  });

  it("should provide context value to children", () => {
    const session = createMockSession();
    let contextValue: ATProtoContextValue | null = null;

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div data-testid="consumer">Consumer</div>;
    };

    render(
      <TestProvider mockSession={session}>
        <ContextConsumer />
      </TestProvider>,
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.sdk).toBeDefined();
    expect(contextValue!.queryClient).toBeDefined();
    expect(contextValue!.initialSession).toBe(session);
  });

  it("should accept dehydratedState for SSR hydration", () => {
    const queryClient = createTestQueryClient();
    const dehydratedState = { mutations: [], queries: [] };

    // Should not throw when using ATProtoProvider directly with dehydratedState
    render(
      <QueryClientProvider client={queryClient}>
        <ATProtoProvider
          value={{
            sdk: {} as ATProtoSDK,
            queryClient,
            initialSession: null,
            syncTabs: false,
          }}
          dehydratedState={dehydratedState}
        >
          <div>Test</div>
        </ATProtoProvider>
      </QueryClientProvider>,
    );
  });
});

describe("ATProtoContext", () => {
  it("should be null when used outside provider", () => {
    let contextValue: ATProtoContextValue | null | string = "not-null";

    const ContextConsumer = () => {
      contextValue = useContext(ATProtoContext);
      return <div>Consumer</div>;
    };

    render(<ContextConsumer />);

    expect(contextValue).toBeNull();
  });
});
