/**
 * Blob URL Utilities
 *
 * Utilities for constructing AT Protocol blob URLs and extracting image references
 * from Hypercert image records.
 *
 * @remarks
 *
 * ## Why these utilities exist
 *
 * AT Protocol stores blobs (images, videos, etc.) on PDS servers and returns blob objects
 * containing a CID (Content Identifier) and mimetype. To make it easier for SDK users to
 * consume these blobs, we provide utilities to:
 *
 * 1. **Convert blob references to URLs**: Transform CID + DID + PDS into a direct URL
 * 2. **Extract image references**: Handle both blob-based images (CID) and direct URIs
 *
 * This allows users to consume images directly without manual URL construction:
 * This can and will be reused across any response that has to return a blob.
 *
 *
 * @packageDocumentation
 */

import type { HypercertImageRecord } from "../services/hypercerts/types.js";

/**
 * Constructs a URL for retrieving a blob from an AT Protocol server.
 *
 * @param pdsUrl - The PDS/server base URL (e.g., "https://pds1.certified.app")
 * @param did - The DID of the repository owner
 * @param cid - The Content Identifier (CID) of the blob
 * @returns Full blob URL
 *
 * @throws {Error} If any parameter is empty or invalid
 *
 * @example
 * ```typescript
 * const url = getBlobUrl(
 *   "https://pds1.certified.app",
 *   "did:plc:r5p2aletd4fegsklphgiog3s",
 *   "bafkreieie3unmfnzt6j7w2y3zkkcjhisvjtg3au5myonvpuyel6ecau52q"
 * );
 * // Returns: "https://pds1.certified.app/xrpc/com.atproto.sync.getBlob?did=did:plc:r5p2aletd4fegsklphgiog3s&cid=bafkreieie3unmfnzt6j7w2y3zkkcjhisvjtg3au5myonvpuyel6ecau52q"
 * ```
 *
 * @public
 */
export function getBlobUrl(pdsUrl: string, did: string, cid: string): string {
  if (!pdsUrl || typeof pdsUrl !== "string") {
    throw new Error("pdsUrl must be a non-empty string");
  }
  if (!did || typeof did !== "string") {
    throw new Error("did must be a non-empty string");
  }
  if (!cid || typeof cid !== "string") {
    throw new Error("cid must be a non-empty string");
  }

  const normalizedPdsUrl = pdsUrl.replace(/\/$/, "");
  return `${normalizedPdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}

/**
 * Extracts the CID or URI from a Hypercert image record.
 *
 * Handles all Hypercert image formats:
 * - `smallImage`: Avatar/thumbnail format with blob reference - returns CID
 * - `largeImage`: Banner/cover format with blob reference - returns CID
 * - `uri`: Direct URL - returns the URI string
 *
 * @param image - Hypercert image record
 * @returns CID string if image contains a blob reference, URI string if uri format, undefined otherwise
 *
 * @example Blob format
 * ```typescript
 * const smallImage = {
 *   $type: "org.hypercerts.defs#smallImage",
 *   image: {
 *     $type: "blob",
 *     ref: { $link: "bafyrei123" },
 *     mimeType: "image/png",
 *     size: 1000
 *   }
 * };
 *
 * const cid = extractCidFromImage(smallImage);
 * // Returns: "bafyrei123"
 * ```
 *
 * @example URI format
 * ```typescript
 * const uriImage = {
 *   $type: "org.hypercerts.defs#uri",
 *   uri: "https://example.com/image.jpg"
 * };
 *
 * const uri = extractCidFromImage(uriImage);
 * // Returns: "https://example.com/image.jpg"
 * ```
 *
 * @public
 */
export function extractCidFromImage(image: HypercertImageRecord): string | undefined {
  if (!image || typeof image !== "object") {
    return undefined;
  }

  // Check $type to determine format
  const imageType = image.$type;

  // If it's a URI format, return the URI string directly
  if (imageType === "org.hypercerts.defs#uri") {
    const uri = image.uri;
    if (uri && typeof uri === "string") {
      return uri;
    }
    return undefined;
  }

  if (imageType === "org.hypercerts.defs#smallImage" || imageType === "org.hypercerts.defs#largeImage") {
    // Blob format: image.image.ref.$link
    const imageData = image.image;
    if (imageData && typeof imageData === "object") {
      const ref = imageData.ref;
      if (ref) {
        return ref.toString();
      }
    }
  }

  return undefined;
}
