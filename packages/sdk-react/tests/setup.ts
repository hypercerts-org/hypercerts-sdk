/**
 * Vitest setup file for sdk-react tests.
 *
 * Configures the test environment with necessary globals and mocks.
 */

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Note: We don't suppress errors here - tests should properly catch and handle them

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock BroadcastChannel for cross-tab sync tests
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: unknown): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.forEach((channel) => {
        if (channel !== this && channel.onmessage) {
          channel.onmessage(new MessageEvent("message", { data: message }));
        }
      });
    }
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === "message") {
      this.onmessage = listener;
    }
  }

  removeEventListener(type: string, _listener: (event: MessageEvent) => void): void {
    if (type === "message") {
      this.onmessage = null;
    }
  }

  static clearAll(): void {
    MockBroadcastChannel.channels.clear();
  }
}

// @ts-expect-error - Assigning mock to global
globalThis.BroadcastChannel = MockBroadcastChannel;

// Reset BroadcastChannel state after each test
afterEach(() => {
  MockBroadcastChannel.clearAll();
});
