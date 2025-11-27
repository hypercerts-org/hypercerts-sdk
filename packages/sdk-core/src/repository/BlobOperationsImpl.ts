/**
 * BlobOperationsImpl - Blob upload and retrieval operations
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { NetworkError } from "../core/errors.js";
import type { BlobOperations } from "./interfaces.js";

export class BlobOperationsImpl implements BlobOperations {
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
  ) {}

  async upload(blob: Blob): Promise<{ ref: { $link: string }; mimeType: string; size: number }> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
        encoding: blob.type || "application/octet-stream",
      });

      if (!result.success) {
        throw new NetworkError("Failed to upload blob");
      }

      return {
        ref: result.data.blob.ref,
        mimeType: result.data.blob.mimeType,
        size: result.data.blob.size,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to upload blob: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

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
