/**
 * BlobOperationsImpl - Blob upload and retrieval operations.
 *
 * This module provides the implementation for AT Protocol blob operations,
 * handling binary data like images and files.
 *
 * @packageDocumentation
 */

import type { Agent, BlobRef } from "@atproto/api";
import { NetworkError } from "../core/errors.js";
import type { BlobOperations } from "./interfaces.js";

/**
 * Implementation of blob operations for binary data handling.
 *
 * Blobs in AT Protocol are content-addressed binary objects stored
 * separately from records. They are referenced in records using a
 * blob reference object with a CID ($link).
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.blobs}.
 *
 * **Blob Size Limits**: PDS servers typically impose size limits on blobs.
 * Common limits are:
 * - Images: 1MB
 * - Other files: Varies by server configuration
 *
 * **Supported MIME Types**: Any MIME type is technically supported, but
 * servers may reject certain types. Images (JPEG, PNG, GIF, WebP) are
 * universally supported.
 *
 * @example
 * ```typescript
 * // Upload an image blob
 * const imageBlob = new Blob([imageData], { type: "image/jpeg" });
 * const { ref, mimeType, size } = await repo.blobs.upload(imageBlob);
 *
 * // Use the ref in a record
 * await repo.records.create({
 *   collection: "org.example.post",
 *   record: {
 *     text: "Check out this image!",
 *     image: ref,  // { $link: "bafyrei..." }
 *     createdAt: new Date().toISOString(),
 *   },
 * });
 * ```
 *
 * @internal
 */
export class BlobOperationsImpl implements BlobOperations {
  /**
   * Creates a new BlobOperationsImpl.
   *
   * @param agent - AT Protocol Agent for making API calls
   * @param repoDid - DID of the repository (used for blob retrieval)
   * @param _serverUrl - Server URL (reserved for future use)
   * @param isSDS - Whether this is a Shared Data Server
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
    private isSDS: boolean,
  ) {}

  /**
   * Uploads a blob to the server.
   *
   * @param blob - The blob to upload (File or Blob object)
   * @returns Promise resolving to blob reference and metadata
   * @throws {@link NetworkError} if the upload fails
   *
   * @remarks
   * The returned `ref` object should be used directly in records to
   * reference the blob. The `$link` property contains the blob's CID.
   *
   * **MIME Type Detection**: If the blob has no type, it defaults to
   * `application/octet-stream`. For best results, always specify the
   * correct MIME type when creating the Blob.
   *
   * @example Uploading an image
   * ```typescript
   * // From a File input
   * const file = fileInput.files[0];
   * const { ref } = await repo.blobs.upload(file);
   *
   * // From raw data
   * const imageBlob = new Blob([uint8Array], { type: "image/png" });
   * const { ref, mimeType, size } = await repo.blobs.upload(imageBlob);
   *
   * console.log(`Uploaded ${size} bytes of ${mimeType}`);
   * console.log(`CID: ${ref.$link}`);
   * ```
   *
   * @example Using in a hypercert
   * ```typescript
   * const coverImage = new Blob([imageData], { type: "image/jpeg" });
   * const { ref } = await repo.blobs.upload(coverImage);
   *
   * // The ref is used directly in the record
   * await repo.hypercerts.create({
   *   title: "My Hypercert",
   *   // ... other fields
   *   image: coverImage,  // HypercertOperations handles upload internally
   * });
   * ```
   */
  async upload(blob: Blob): Promise<BlobRef> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const encoding = blob.type || "application/octet-stream";

      // Use SDS endpoint if available, otherwise use standard PDS endpoint
      // SDS has a dedicated uploadBlob endpoint that accepts the repo param
      if (this.isSDS) {
        return await this.uploadViaSDS(uint8Array, encoding);
      }

      const result = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
        encoding,
      });

      if (!result.success) {
        throw new NetworkError("Failed to upload blob");
      }

      return result.data.blob;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to upload blob: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Uploads a blob via the SDS-specific XRPC endpoint.
   *
   * Uses the agent's fetch handler directly since `com.sds.repo.uploadBlob`
   * is not a registered XRPC namespace on the standard AT Protocol Agent.
   * This follows the same pattern used by CollaboratorOperationsImpl and
   * OrganizationOperationsImpl for SDS-specific endpoints.
   *
   * @param data - Binary data to upload
   * @param encoding - MIME type of the data
   * @returns Promise resolving to blob reference and metadata
   * @throws {@link NetworkError} if the upload fails
   * @internal
   */
  private async uploadViaSDS(data: Uint8Array, encoding: string): Promise<BlobRef> {
    const url = `/xrpc/com.sds.repo.uploadBlob?repo=${encodeURIComponent(this.repoDid)}`;
    const response = await this.agent.fetchHandler(url, {
      method: "POST",
      headers: {
        "Content-Type": encoding,
      },
      body: data as unknown as BodyInit,
    });

    if (!response.ok) {
      throw new NetworkError(`SDS blob upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    return result.blob;
  }

  /**
   * Retrieves a blob by its CID.
   *
   * @param cid - Content Identifier (CID) of the blob, typically from a blob
   *              reference's `$link` property
   * @returns Promise resolving to blob data and MIME type
   * @throws {@link NetworkError} if the blob is not found or retrieval fails
   *
   * @remarks
   * The returned data is a Uint8Array which can be converted to other
   * formats as needed (Blob, ArrayBuffer, Base64, etc.).
   *
   * **MIME Type**: The returned MIME type comes from the Content-Type header.
   * If the server doesn't provide one, it defaults to `application/octet-stream`.
   *
   * @example Basic retrieval
   * ```typescript
   * // Get a blob from a record's blob reference
   * const record = await repo.records.get({ collection, rkey });
   * const blobRef = (record.value as any).image;
   *
   * const { data, mimeType } = await repo.blobs.get(blobRef.$link);
   *
   * // Convert to a Blob for use in the browser
   * const blob = new Blob([data], { type: mimeType });
   * const url = URL.createObjectURL(blob);
   * ```
   *
   * @example Displaying an image
   * ```typescript
   * const { data, mimeType } = await repo.blobs.get(imageCid);
   *
   * // Create data URL for <img> src
   * const base64 = btoa(String.fromCharCode(...data));
   * const dataUrl = `data:${mimeType};base64,${base64}`;
   *
   * // Or use object URL
   * const blob = new Blob([data], { type: mimeType });
   * img.src = URL.createObjectURL(blob);
   * ```
   */
  async get(cid: string): Promise<{ data: Uint8Array; mimeType: string }> {
    try {
      const result = await this.agent.com.atproto.sync.getBlob({
        did: this.repoDid,
        cid,
      });

      if (!result.success) {
        throw new NetworkError("Failed to get blob");
      }

      return {
        data: result.data,
        mimeType: result.headers["content-type"] || "application/octet-stream",
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get blob: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }
}
