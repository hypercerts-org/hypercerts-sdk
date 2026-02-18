import { describe, it, expect } from "vitest";
import {
  AT_URI_REGEX,
  parseAtUri,
  buildAtUri,
  extractRkeyFromUri,
  isValidAtUri,
  createStrongRef,
  createStrongRefFromResult,
  validateStrongRef,
  isStrongRef,
} from "../../src/lexicons/utils.js";

describe("AT_URI_REGEX", () => {
  it("should match a standard AT-URI", () => {
    expect(AT_URI_REGEX.test("at://did:plc:abc123/org.example.col/rkey123")).toBe(true);
  });

  it("should not match when rkey contains a slash", () => {
    expect(AT_URI_REGEX.test("at://did:plc:abc123/org.example.col/rkey/extra")).toBe(false);
  });

  it("should not match a URI with only two path segments (no rkey)", () => {
    expect(AT_URI_REGEX.test("at://did:plc:abc123/org.example.col")).toBe(false);
  });
});

describe("AT-URI Utilities", () => {
  describe("parseAtUri", () => {
    it("should parse valid AT-URI", () => {
      const result = parseAtUri("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a");
      expect(result).toEqual({
        did: "did:plc:abc123",
        collection: "org.hypercerts.claim.activity",
        rkey: "3km2vj4kfqp2a",
      });
    });

    it("should parse AT-URI with web DID", () => {
      const result = parseAtUri("at://did:web:example.com/com.example.post/abc");
      expect(result).toEqual({
        did: "did:web:example.com",
        collection: "com.example.post",
        rkey: "abc",
      });
    });

    it("should throw on missing at:// prefix", () => {
      expect(() => parseAtUri("did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a")).toThrow(
        'Invalid AT-URI format: must start with "at://"',
      );
    });

    it("should throw on too few components", () => {
      expect(() => parseAtUri("at://did:plc:abc123/org.hypercerts.claim.activity")).toThrow(
        'Invalid AT-URI format: expected "at://{did}/{collection}/{rkey}"',
      );
    });

    it("should throw on empty components", () => {
      expect(() => parseAtUri("at://did:plc:abc123//3km2vj4kfqp2a")).toThrow(
        "Invalid AT-URI format: all components must be non-empty",
      );
    });
  });

  describe("buildAtUri", () => {
    it("should build valid AT-URI", () => {
      const uri = buildAtUri("did:plc:abc123", "org.hypercerts.claim.activity", "3km2vj4kfqp2a");
      expect(uri).toBe("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a");
    });

    it("should throw on empty DID", () => {
      expect(() => buildAtUri("", "org.hypercerts.claim.activity", "3km2vj4kfqp2a")).toThrow(
        "All AT-URI components (did, collection, rkey) must be non-empty",
      );
    });

    it("should throw on empty collection", () => {
      expect(() => buildAtUri("did:plc:abc123", "", "3km2vj4kfqp2a")).toThrow(
        "All AT-URI components (did, collection, rkey) must be non-empty",
      );
    });

    it("should throw on empty rkey", () => {
      expect(() => buildAtUri("did:plc:abc123", "org.hypercerts.claim.activity", "")).toThrow(
        "All AT-URI components (did, collection, rkey) must be non-empty",
      );
    });
  });

  describe("extractRkeyFromUri", () => {
    it("should extract rkey from AT-URI", () => {
      const rkey = extractRkeyFromUri("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a");
      expect(rkey).toBe("3km2vj4kfqp2a");
    });

    it("should throw on invalid URI", () => {
      expect(() => extractRkeyFromUri("invalid-uri")).toThrow("Invalid AT-URI format");
    });
  });

  describe("isValidAtUri", () => {
    it("should return true for valid AT-URI", () => {
      expect(isValidAtUri("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a")).toBe(true);
    });

    it("should return false for invalid AT-URI", () => {
      expect(isValidAtUri("invalid-uri")).toBe(false);
      expect(isValidAtUri("at://did:plc:abc123/only-two-parts")).toBe(false);
      expect(isValidAtUri("http://example.com")).toBe(false);
    });
  });

  describe("parseAtUri and buildAtUri roundtrip", () => {
    it("should be reversible", () => {
      const original = "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a";
      const parsed = parseAtUri(original);
      const rebuilt = buildAtUri(parsed.did, parsed.collection, parsed.rkey);
      expect(rebuilt).toBe(original);
    });
  });
});

describe("StrongRef Utilities", () => {
  describe("createStrongRef", () => {
    it("should create valid strongRef", () => {
      const ref = createStrongRef("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a", "bafyreiabc123");
      expect(ref).toEqual({
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      });
    });

    it("should throw on empty URI", () => {
      expect(() => createStrongRef("", "bafyreiabc123")).toThrow("Both uri and cid are required");
    });

    it("should throw on empty CID", () => {
      expect(() => createStrongRef("at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a", "")).toThrow(
        "Both uri and cid are required",
      );
    });
  });

  describe("createStrongRefFromResult", () => {
    it("should create strongRef from CreateResult", () => {
      const result = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      };
      const ref = createStrongRefFromResult(result);
      expect(ref).toEqual({
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      });
    });

    it("should create strongRef from UpdateResult", () => {
      const result = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc456",
      };
      const ref = createStrongRefFromResult(result);
      expect(ref).toEqual({
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc456",
      });
    });
  });

  describe("validateStrongRef", () => {
    it("should validate valid strongRef", () => {
      const ref = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      };
      expect(validateStrongRef(ref)).toBe(true);
    });

    it("should reject null", () => {
      expect(validateStrongRef(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(validateStrongRef(undefined)).toBe(false);
    });

    it("should reject non-object", () => {
      expect(validateStrongRef("not-an-object")).toBe(false);
      expect(validateStrongRef(123)).toBe(false);
    });

    it("should reject missing uri", () => {
      expect(validateStrongRef({ cid: "bafyreiabc123" })).toBe(false);
    });

    it("should reject missing cid", () => {
      expect(validateStrongRef({ uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a" })).toBe(false);
    });

    it("should reject empty uri", () => {
      expect(validateStrongRef({ uri: "", cid: "bafyreiabc123" })).toBe(false);
    });

    it("should reject empty cid", () => {
      expect(
        validateStrongRef({ uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a", cid: "" }),
      ).toBe(false);
    });

    it("should reject non-string uri", () => {
      expect(validateStrongRef({ uri: 123, cid: "bafyreiabc123" })).toBe(false);
    });

    it("should reject non-string cid", () => {
      expect(
        validateStrongRef({ uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a", cid: 123 }),
      ).toBe(false);
    });
  });

  describe("isStrongRef", () => {
    it("should be alias for validateStrongRef", () => {
      const validRef = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      };
      expect(isStrongRef(validRef)).toBe(true);
      expect(isStrongRef(null)).toBe(false);
      expect(isStrongRef({})).toBe(false);
    });
  });
});
