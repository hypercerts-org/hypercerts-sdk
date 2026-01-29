import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import { BlobRef, jsonStringToLex } from "@atproto/lexicon";
import { BlobOperationsImpl } from "../../src/repository/BlobOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import { createMockAgent, TEST_REPO_DID, TEST_PDS_URL, TEST_SDS_URL } from "../utils/mocks.js";

/**
 * Helper to create a BlobRef with a proper CID object for testing.
 * Uses jsonStringToLex to parse AT Protocol wire format into a BlobRef instance.
 */
function createTestBlobRef(cid: string, mimeType: string, size: number): BlobRef {
  const json = JSON.stringify({
    $type: "blob",
    ref: { $link: cid },
    mimeType,
    size,
  });
  return jsonStringToLex(json) as BlobRef;
}

// Valid CID for testing - must be a real base32-encoded CIDv1
const TEST_VALID_CID = "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454";

describe("BlobOperationsImpl", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let blobOps: BlobOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    blobOps = new BlobOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID, TEST_PDS_URL, false);
  });

  describe("constructor", () => {
    it("should accept valid DID", () => {
      expect(
        () => new BlobOperationsImpl(mockAgent as unknown as Agent, "did:plc:abc123", TEST_PDS_URL, false),
      ).not.toThrow();
    });

    it("should throw ValidationError for invalid DID", () => {
      expect(() => new BlobOperationsImpl(mockAgent as unknown as Agent, "not-a-did", TEST_PDS_URL, false)).toThrow(
        ValidationError,
      );
    });

    it("should include helpful error message with the invalid DID", () => {
      expect(() => new BlobOperationsImpl(mockAgent as unknown as Agent, "invalid", TEST_PDS_URL, false)).toThrow(
        /Invalid DID format: "invalid"/,
      );
    });
  });

  describe("upload", () => {
    it("should upload a blob successfully", async () => {
      const mockBlob = new Blob(["test content"], { type: "text/plain" });
      // Create a proper BlobRef with a CID object (as XRPC would return)
      const mockBlobRef = createTestBlobRef(TEST_VALID_CID, "text/plain", 12);
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: mockBlobRef,
        },
      });

      const result = await blobOps.upload(mockBlob);

      // Result should be a BlobRef instance with proper CID object
      expect(result).toBeInstanceOf(BlobRef);
      expect(result.ref.toString()).toBe(TEST_VALID_CID);
      expect(result.mimeType).toBe("text/plain");
      expect(result.size).toBe(12);
      // BlobRef.toJSON() produces AT Protocol wire format with { $link: ... }
      expect(result.toJSON()).toEqual({
        $type: "blob",
        ref: { $link: TEST_VALID_CID },
        mimeType: "text/plain",
        size: 12,
      });
    });

    it("should use blob type as encoding", async () => {
      const mockBlob = new Blob(["image data"], { type: "image/png" });
      const mockBlobRef = createTestBlobRef(TEST_VALID_CID, "image/png", 100);
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: mockBlobRef,
        },
      });

      await blobOps.upload(mockBlob);

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledWith(expect.any(Uint8Array), {
        encoding: "image/png",
      });
    });

    it("should default to application/octet-stream for blobs without type", async () => {
      const mockBlob = new Blob(["data"]);
      const mockBlobRef = createTestBlobRef(TEST_VALID_CID, "application/octet-stream", 4);
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: mockBlobRef,
        },
      });

      await blobOps.upload(mockBlob);

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledWith(expect.any(Uint8Array), {
        encoding: "application/octet-stream",
      });
    });

    it("should throw NetworkError when API returns success: false", async () => {
      const mockBlob = new Blob(["test"]);
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: false,
      });

      await expect(blobOps.upload(mockBlob)).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      const mockBlob = new Blob(["test"]);
      mockAgent.com.atproto.repo.uploadBlob.mockRejectedValue(new Error("Upload failed"));

      await expect(blobOps.upload(mockBlob)).rejects.toThrow(NetworkError);
    });
  });

  describe("upload (SDS)", () => {
    let sdsBlobOps: BlobOperationsImpl;

    beforeEach(() => {
      sdsBlobOps = new BlobOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID, TEST_SDS_URL, true);
    });

    it("should upload a blob via SDS fetchHandler", async () => {
      const mockBlob = new Blob(["test content"], { type: "image/png" });
      mockAgent.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          blob: {
            $type: "blob",
            ref: { $link: TEST_VALID_CID },
            mimeType: "image/png",
            size: 12,
          },
        }),
      });

      const result = await sdsBlobOps.upload(mockBlob);

      // BlobRef stores CID as CID object, toString() returns the string
      expect(result.ref.toString()).toBe(TEST_VALID_CID);
      expect(result.mimeType).toBe("image/png");
      expect(result.size).toBe(12);
      expect(mockAgent.fetchHandler).toHaveBeenCalledWith(
        `/xrpc/com.sds.repo.uploadBlob?repo=${encodeURIComponent(TEST_REPO_DID)}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "image/png" },
        }),
      );
    });

    it("should handle blob ref with $type from SDS", async () => {
      const mockBlob = new Blob(["test"], { type: "text/plain" });
      mockAgent.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          blob: {
            $type: "blob",
            ref: { $link: TEST_VALID_CID },
            mimeType: "text/plain",
            size: 4,
          },
        }),
      });

      const result = await sdsBlobOps.upload(mockBlob);

      // BlobRef stores CID as CID object
      expect(result.ref.toString()).toBe(TEST_VALID_CID);
    });

    it("should throw NetworkError when SDS returns non-ok response", async () => {
      const mockBlob = new Blob(["test"]);
      mockAgent.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(sdsBlobOps.upload(mockBlob)).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when SDS fetch throws", async () => {
      const mockBlob = new Blob(["test"]);
      mockAgent.fetchHandler.mockRejectedValue(new Error("Network failure"));

      await expect(sdsBlobOps.upload(mockBlob)).rejects.toThrow(NetworkError);
    });

    it("should not call PDS uploadBlob when isSDS is true", async () => {
      const mockBlob = new Blob(["test"], { type: "image/jpeg" });
      mockAgent.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          blob: {
            $type: "blob",
            ref: { $link: TEST_VALID_CID },
            mimeType: "image/jpeg",
            size: 4,
          },
        }),
      });

      await sdsBlobOps.upload(mockBlob);

      expect(mockAgent.com.atproto.repo.uploadBlob).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("should get a blob successfully", async () => {
      const mockData = new Uint8Array([1, 2, 3, 4]);
      mockAgent.com.atproto.sync!.getBlob.mockResolvedValue({
        success: true,
        data: mockData,
        headers: { "content-type": "image/png" },
      });

      const result = await blobOps.get("bafyrei123");

      expect(result.data).toEqual(mockData);
      expect(result.mimeType).toBe("image/png");
      expect(mockAgent.com.atproto.sync!.getBlob).toHaveBeenCalledWith({
        did: TEST_REPO_DID,
        cid: "bafyrei123",
      });
    });

    it("should default to application/octet-stream if no content-type header", async () => {
      const mockData = new Uint8Array([1, 2, 3]);
      mockAgent.com.atproto.sync!.getBlob.mockResolvedValue({
        success: true,
        data: mockData,
        headers: {},
      });

      const result = await blobOps.get("bafyrei123");

      expect(result.mimeType).toBe("application/octet-stream");
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.sync!.getBlob.mockResolvedValue({
        success: false,
      });

      await expect(blobOps.get("bafyrei123")).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.sync!.getBlob.mockRejectedValue(new Error("Blob not found"));

      await expect(blobOps.get("bafyrei123")).rejects.toThrow(NetworkError);
    });
  });
});
