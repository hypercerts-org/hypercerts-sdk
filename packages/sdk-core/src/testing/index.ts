/**
 * Testing utilities for the Hypercerts SDK.
 *
 * This module exports mock implementations and factory functions
 * for testing applications that use the SDK.
 *
 * @remarks
 * Import from `@hypercerts-org/sdk/testing` to access these utilities:
 *
 * ```typescript
 * import {
 *   createMockSession,
 *   createTestConfig,
 *   MockSessionStore,
 *   MockStateStore,
 * } from "@hypercerts-org/sdk/testing";
 * ```
 *
 * **Available Utilities**:
 *
 * - {@link createMockSession} - Factory for mock OAuth sessions
 * - {@link createTestConfig} - Factory for test SDK configurations
 * - {@link MockSessionStore} - Mock session store with call tracking
 * - {@link MockStateStore} - Mock state store with call tracking
 *
 * @example Setting up tests
 * ```typescript
 * import { ATProtoSDK } from "@hypercerts-org/sdk";
 * import {
 *   createTestConfig,
 *   createMockSession,
 *   MockSessionStore,
 *   MockStateStore,
 * } from "@hypercerts-org/sdk/testing";
 *
 * describe("MyApp", () => {
 *   let sdk: ATProtoSDK;
 *   let sessionStore: MockSessionStore;
 *   let stateStore: MockStateStore;
 *
 *   beforeEach(() => {
 *     sessionStore = new MockSessionStore();
 *     stateStore = new MockStateStore();
 *
 *     sdk = new ATProtoSDK(createTestConfig({
 *       storage: { sessionStore, stateStore },
 *     }));
 *   });
 *
 *   afterEach(() => {
 *     sessionStore.reset();
 *     stateStore.reset();
 *   });
 *
 *   it("should work with mock session", () => {
 *     const session = createMockSession();
 *     const repo = sdk.repository(session);
 *     // ... test repository operations
 *   });
 * });
 * ```
 *
 * @packageDocumentation
 */

export { createMockSession, createTestConfig } from "./mocks.js";
export { MockSessionStore, MockStateStore } from "./stores.js";
