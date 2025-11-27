/**
 * Hook for accessing the ATProto SDK instance.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { ATProtoSDK } from "@hypercerts-org/sdk-core";
import { ATProtoContext } from "../context/ATProtoContext.js";

/**
 * Access the ATProto SDK instance from context.
 *
 * @returns The SDK instance
 * @throws Error if used outside of ATProtoProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const sdk = useATProtoSDK();
 *
 *   // Access SDK directly for advanced use cases
 *   const pdsUrl = sdk.pdsUrl;
 *   const sdsUrl = sdk.sdsUrl;
 * }
 * ```
 */
export function useATProtoSDK(): ATProtoSDK {
  const context = useContext(ATProtoContext);

  if (!context) {
    throw new Error(
      "useATProtoSDK must be used within an ATProtoProvider. " +
        "Make sure to wrap your app with the Provider from createATProtoReact()."
    );
  }

  return context.sdk;
}
