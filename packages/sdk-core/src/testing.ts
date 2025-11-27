/**
 * Testing entrypoint - Test utilities and mocks
 *
 * This module provides utilities for testing applications built with the Hypercerts SDK.
 * Includes mock factories for creating test data and mock store implementations
 * with call tracking for assertions.
 *
 * @remarks
 * These utilities are designed for use in unit and integration tests.
 * They should NOT be used in production code.
 *
 * The mock stores track all method calls, making it easy to verify
 * that your code interacts with storage correctly.
 *
 * @example
 * ```typescript
 * // Basic test setup
 * import {
 *   createMockSession,
 *   createTestConfig,
 *   MockSessionStore,
 *   MockStateStore
 * } from "@hypercerts-org/sdk/testing";
 * import { HypercertsSDK } from "@hypercerts-org/sdk";
 *
 * describe("MyComponent", () => {
 *   let sdk: HypercertsSDK;
 *   let sessionStore: MockSessionStore;
 *
 *   beforeEach(() => {
 *     sessionStore = new MockSessionStore();
 *     sdk = new HypercertsSDK(createTestConfig({
 *       sessionStore,
 *       stateStore: new MockStateStore(),
 *     }));
 *   });
 *
 *   it("should store session after login", async () => {
 *     // ... perform login flow
 *     expect(sessionStore.setCalls).toHaveLength(1);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Creating mock data for tests
 * import { createMockSession } from "@hypercerts-org/sdk/testing";
 *
 * const session = createMockSession({
 *   did: "did:plc:testuser123",
 *   handle: "testuser.bsky.social",
 * });
 *
 * // Session has all required fields populated with test values
 * expect(session.did).toBe("did:plc:testuser123");
 * expect(session.accessToken).toBeDefined();
 * ```
 *
 * @packageDocumentation
 */

export { createMockSession, createTestConfig } from "./testing/mocks.js";
export { MockSessionStore, MockStateStore } from "./testing/stores.js";
