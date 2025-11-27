import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlobOperationsImpl } from "../../src/repository/BlobOperationsImpl.js";
import { NetworkError } from "../../src/core/errors.js";

describe("BlobOperationsImpl", () => {
  let mockAgent: any;
  let blobOps: BlobOperationsImpl;
  const repoDid = "did:plc:testdid123";
  const serverUrl = "https://pds.example.com";

  beforeEach(() => {
    mockAgent = {
      com: {
        atproto: {
          repo: {
            uploadBlob: vi.fn(),
          },
          sync: {
            getBlob: vi.fn(),
          },
        },
      },
    };

    blobOps = new BlobOperationsImpl(mockAgent, repoDid, serverUrl);
  });

  describe("upload", () => {
    it("should upload a blob successfully", async () => {
      const mockBlob = new Blob(["test content"], { type: "text/plain" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: {
            ref: { $link: "bafyrei123" },
            mimeType: "text/plain",
            size: 12,
          },
        },
      });

      const result = await blobOps.upload(mockBlob);

      expect(result.ref).toEqual({ $link: "bafyrei123" });
      expect(result.mimeType).toBe("text/plain");
      expect(result.size).toBe(12);
    });

    it("should use blob type as encoding", async () => {
      const mockBlob = new Blob(["image data"], { type: "image/png" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: {
            ref: { $link: "bafyrei123" },
            mimeType: "image/png",
            size: 100,
          },
        },
      });

      await blobOps.upload(mockBlob);

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        { encoding: "image/png" },
      );
    });

    it("should default to application/octet-stream for blobs without type", async () => {
      const mockBlob = new Blob(["data"]);
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: {
            ref: { $link: "bafyrei123" },
            mimeType: "application/octet-stream",
            size: 4,
          },
        },
      });

      await blobOps.upload(mockBlob);

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        { encoding: "application/octet-stream" },
      );
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

  describe("get", () => {
    it("should get a blob successfully", async () => {
      const mockData = new Uint8Array([1, 2, 3, 4]);
      mockAgent.com.atproto.sync.getBlob.mockResolvedValue({
        success: true,
        data: mockData,
        headers: { "content-type": "image/png" },
      });

      const result = await blobOps.get("bafyrei123");

      expect(result.data).toEqual(mockData);
      expect(result.mimeType).toBe("image/png");
      expect(mockAgent.com.atproto.sync.getBlob).toHaveBeenCalledWith({
        did: repoDid,
        cid: "bafyrei123",
      });
    });

    it("should default to application/octet-stream if no content-type header", async () => {
      const mockData = new Uint8Array([1, 2, 3]);
      mockAgent.com.atproto.sync.getBlob.mockResolvedValue({
        success: true,
        data: mockData,
        headers: {},
      });

      const result = await blobOps.get("bafyrei123");

      expect(result.mimeType).toBe("application/octet-stream");
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.sync.getBlob.mockResolvedValue({
        success: false,
      });

      await expect(blobOps.get("bafyrei123")).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.sync.getBlob.mockRejectedValue(new Error("Blob not found"));

      await expect(blobOps.get("bafyrei123")).rejects.toThrow(NetworkError);
    });
  });
});
