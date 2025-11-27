/**
 * Testing utilities for ATProto React SDK.
 *
 * @remarks
 * Import from `@hypercerts-org/sdk-react/testing`:
 *
 * ```typescript
 * import {
 *   TestProvider,
 *   createMockSession,
 *   createMockProfile,
 *   createMockATProtoReact,
 * } from "@hypercerts-org/sdk-react/testing";
 * ```
 *
 * @packageDocumentation
 */

// Test Provider
export { TestProvider } from "./TestProvider.js";
export type { TestProviderProps } from "./TestProvider.js";

// Mock factories
export {
  createMockSession,
  createMockProfile,
  createMockPermissions,
  createMockOrganization,
  createMockCollaborator,
  createMockHypercert,
} from "./mocks.js";

// Mock ATProto React instance
export { createMockATProtoReact } from "./factory.jsx";
export type { MockATProtoReactOptions } from "./factory.jsx";
