import { describe, expect, it } from "vitest";
import { HypercertImageRecord, OrgHypercertsDefs } from "../../src/index.js";
import { extractCidFromImage, getBlobUrl } from "../../src/lib/blob-url.js";

describe("blob-url utilities", () => {
  describe("getBlobUrl", () => {
    it("should construct correct blob URL", () => {
      const url = getBlobUrl(
        "https://climateai.org",
        "did:plc:r5p2aletd4fegsklphgiog3s",
        "bafkreieie3unmfnzt6j7w2y3zkkcjhisvjtg3au5myonvpuyel6ecau52q",
      );

      expect(url).toBe(
        "https://climateai.org/xrpc/com.atproto.sync.getBlob?did=did:plc:r5p2aletd4fegsklphgiog3s&cid=bafkreieie3unmfnzt6j7w2y3zkkcjhisvjtg3au5myonvpuyel6ecau52q",
      );
    });

    it("should normalize PDS URL by removing trailing slash", () => {
      const url = getBlobUrl("https://test.example.com/", "did:plc:test", "bafyrei123");

      expect(url).toBe("https://test.example.com/xrpc/com.atproto.sync.getBlob?did=did:plc:test&cid=bafyrei123");
    });

    it("should throw on empty pdsUrl", () => {
      expect(() => getBlobUrl("", "did:plc:test", "bafyrei123")).toThrow("pdsUrl must be a non-empty string");
    });

    it("should throw on empty did", () => {
      expect(() => getBlobUrl("https://test.com", "", "bafyrei123")).toThrow("did must be a non-empty string");
    });

    it("should throw on empty cid", () => {
      expect(() => getBlobUrl("https://test.com", "did:plc:test", "")).toThrow("cid must be a non-empty string");
    });

    it("should throw on non-string inputs", () => {
      // @ts-expect-error null is not a valid input
      expect(() => getBlobUrl(null, "did:plc:test", "bafyrei123")).toThrow();
      // @ts-expect-error undefined is not a valid input
      expect(() => getBlobUrl("https://test.com", undefined, "bafyrei123")).toThrow();
      // @ts-expect-error number is not a valid input
      expect(() => getBlobUrl("https://test.com", "did:plc:test", 123)).toThrow();
    });
  });

  describe("extractCidFromImage", () => {
    it("should extract CID from smallImage format", () => {
      // We use 'as unknown as' because our mock doesn't implement the full BlobRef class
      // (which has methods like original, ipld, toJSON), but extractCidFromImage only
      // needs ref.toString() at runtime
      const image = {
        $type: "org.hypercerts.defs#smallImage",
        image: {
          $type: "blob",
          ref: { $link: "bafyrei-small-123", toString: () => "bafyrei-small-123" },
          mimeType: "image/png",
          size: 1000,
        },
      } as unknown as HypercertImageRecord;

      expect(extractCidFromImage(image)).toBe("bafyrei-small-123");
    });

    it("should extract CID from largeImage format", () => {
      const image = {
        $type: "org.hypercerts.defs#largeImage",
        image: {
          $type: "blob",
          ref: { $link: "bafyrei-large-456", toString: () => "bafyrei-large-456" },
          mimeType: "image/jpeg",
          size: 5000,
        },
      } as unknown as HypercertImageRecord;

      expect(extractCidFromImage(image)).toBe("bafyrei-large-456");
    });

    it("should return URI string for uri format", () => {
      const image = {
        $type: "org.hypercerts.defs#uri",
        uri: "https://example.com/image.jpg",
      } as OrgHypercertsDefs.Uri;

      expect(extractCidFromImage(image)).toBe("https://example.com/image.jpg");
    });

    it("should return undefined for malformed smallImage", () => {
      const image = {
        $type: "org.hypercerts.defs#smallImage",
        image: {
          // missing ref
          mimeType: "image/png",
        },
      } as OrgHypercertsDefs.SmallImage;

      expect(extractCidFromImage(image)).toBeUndefined();
    });

    it("should return undefined for null/undefined input", () => {
      // @ts-expect-error null/undefined are not valid inputs
      expect(extractCidFromImage(null)).toBeUndefined();
      // @ts-expect-error null/undefined are not valid inputs
      expect(extractCidFromImage(undefined)).toBeUndefined();
    });

    it("should return undefined for non-object input", () => {
      // @ts-expect-error string is not a valid input
      expect(extractCidFromImage("not an object")).toBeUndefined();
      // @ts-expect-error number is not a valid input
      expect(extractCidFromImage(123)).toBeUndefined();
    });
  });
});
