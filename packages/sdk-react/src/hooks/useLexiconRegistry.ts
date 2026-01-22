/**
 * Hook for accessing the LexiconRegistry from the SDK.
 *
 * Use this hook to register custom lexicons and access lexicon utilities.
 *
 * @packageDocumentation
 */

import { useATProtoSDK } from "./useATProtoSDK.js";
import type { LexiconRegistry } from "@hypercerts-org/sdk-core";

/**
 * Hook to access the LexiconRegistry.
 *
 * The LexiconRegistry allows you to:
 * - Register custom lexicons at runtime
 * - Validate records against registered schemas
 * - Query registered lexicons
 *
 * @returns The LexiconRegistry instance from the SDK
 *
 * @example Register a custom lexicon
 * ```typescript
 * import { useLexiconRegistry } from "@hypercerts-org/sdk-react";
 * import myLexicon from "./lexicons/myLexicon.json";
 *
 * function MyComponent() {
 *   const registry = useLexiconRegistry();
 *
 *   useEffect(() => {
 *     // Register your custom lexicon
 *     registry.registerFromJSON(myLexicon);
 *   }, [registry]);
 *
 *   // Now you can create records with your custom type
 *   return <div>Custom lexicon registered!</div>;
 * }
 * ```
 *
 * @example Check if lexicon is registered
 * ```typescript
 * function MyComponent() {
 *   const registry = useLexiconRegistry();
 *   const isRegistered = registry.isRegistered("org.myapp.evaluation");
 *
 *   if (!isRegistered) {
 *     return <div>Please register the evaluation lexicon first</div>;
 *   }
 *
 *   return <div>Ready to create evaluations!</div>;
 * }
 * ```
 *
 * @example Get all registered lexicons
 * ```typescript
 * function LexiconList() {
 *   const registry = useLexiconRegistry();
 *   const lexicons = registry.getAll();
 *
 *   return (
 *     <ul>
 *       {lexicons.map(nsid => (
 *         <li key={nsid}>{nsid}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useLexiconRegistry(): LexiconRegistry {
  const sdk = useATProtoSDK();
  return sdk.getLexiconRegistry();
}
