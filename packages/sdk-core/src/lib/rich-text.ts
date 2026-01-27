/**
 * Rich text utilities for creating facets from plain text.
 *
 * This module provides helpers for working with AT Protocol's rich text format,
 * which enables mentions (@user), links, and hashtags (#tag) in text content.
 *
 * @module
 */

import { RichText } from "@atproto/api";
import type { AppBskyRichtextFacet, AtpBaseClient } from "@atproto/api";

/**
 * Result of parsing rich text, containing both the text and detected facets.
 */
export interface RichTextResult {
  /**
   * The original text (unchanged).
   */
  text: string;

  /**
   * Array of detected facets (mentions, links, hashtags).
   * Returns undefined if no facets were detected.
   */
  facets: AppBskyRichtextFacet.Main[] | undefined;
}

/**
 * Creates facets from plain text by auto-detecting mentions, links, and hashtags.
 *
 * This is a convenience wrapper around AT Protocol's RichText class that makes it
 * easy to create facets for hypercert descriptions.
 *
 * **Detected patterns:**
 * - **Links**: URLs starting with `http://` or `https://`
 * - **Mentions**: `@handle` patterns (requires agent for DID resolution)
 * - **Hashtags**: `#tag` patterns
 *
 * @param text - The plain text to parse for facets
 * @param agent - Optional AT Protocol agent for resolving @mentions to DIDs.
 *                Without an agent, mentions will have empty DIDs (invalid for posting).
 * @returns Promise resolving to the text and detected facets
 *
 * @example Basic usage with links and hashtags
 * ```typescript
 * import { createFacetsFromText } from '@hypercerts-org/sdk-core';
 *
 * const { text, facets } = await createFacetsFromText(
 *   'Check out https://example.org for more info! #sustainability #impact'
 * );
 *
 * await repo.hypercerts.create({
 *   title: 'My Project',
 *   description: text,
 *   descriptionFacets: facets,
 *   // ...other fields
 * });
 * ```
 *
 * @example With mention resolution (requires authenticated agent)
 * ```typescript
 * import { createFacetsFromText } from '@hypercerts-org/sdk-core';
 *
 * // With an authenticated agent, mentions are resolved to DIDs
 * const { text, facets } = await createFacetsFromText(
 *   'Thanks to @alice.bsky.social for the contribution!',
 *   agent
 * );
 * ```
 *
 * @example Using with shortDescription
 * ```typescript
 * const shortResult = await createFacetsFromText('Quick update #news');
 * const fullResult = await createFacetsFromText(
 *   'Full description with https://link.com and #tags'
 * );
 *
 * await repo.hypercerts.create({
 *   shortDescription: shortResult.text,
 *   shortDescriptionFacets: shortResult.facets,
 *   description: fullResult.text,
 *   descriptionFacets: fullResult.facets,
 *   // ...
 * });
 * ```
 */
export async function createFacetsFromText(text: string, agent?: AtpBaseClient): Promise<RichTextResult> {
  const rt = new RichText({ text });

  if (agent) {
    // With agent: resolve @mentions to DIDs
    await rt.detectFacets(agent);
  } else {
    // Without agent: detect facets but don't resolve mentions
    // Note: Mentions will have empty DIDs which may be invalid for posting
    rt.detectFacetsWithoutResolution();
  }

  return {
    text: rt.text,
    facets: rt.facets,
  };
}

/**
 * Synchronously creates facets from plain text without resolving mentions.
 *
 * This is a faster alternative to `createFacetsFromText` when you don't need
 * mention resolution. Links and hashtags are detected, but @mentions will
 * have the handle string as the DID (not a resolved `did:plc:...` value).
 *
 * **Warning**: Posts with unresolved mentions (handle as DID) may be invalid
 * for some AT Protocol operations that require actual DIDs.
 * Use this when you know the text doesn't contain mentions, or when
 * you'll resolve them separately.
 *
 * @param text - The plain text to parse for facets
 * @returns The text and detected facets
 *
 * @example
 * ```typescript
 * import { createFacetsFromTextSync } from '@hypercerts-org/sdk-core';
 *
 * // Fast detection without network calls (no mention resolution)
 * const { text, facets } = createFacetsFromTextSync(
 *   'Visit https://example.org for details #info'
 * );
 * ```
 */
export function createFacetsFromTextSync(text: string): RichTextResult {
  const rt = new RichText({ text });
  rt.detectFacetsWithoutResolution();

  return {
    text: rt.text,
    facets: rt.facets,
  };
}

// Re-export RichText class for advanced usage
export { RichText } from "@atproto/api";
export type { AppBskyRichtextFacet } from "@atproto/api";
