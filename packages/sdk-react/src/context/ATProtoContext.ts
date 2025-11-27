/**
 * React context for ATProto SDK.
 *
 * @packageDocumentation
 */

import { createContext } from "react";
import type { ATProtoContextValue } from "./types.js";

/**
 * React context for the ATProto SDK instance.
 *
 * This context provides access to the SDK, QueryClient, and configuration
 * throughout the component tree.
 *
 * @internal
 */
export const ATProtoContext = createContext<ATProtoContextValue | null>(null);

ATProtoContext.displayName = "ATProtoContext";
