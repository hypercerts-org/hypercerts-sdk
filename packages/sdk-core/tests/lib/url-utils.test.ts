import { describe, it, expect } from "vitest";
import { isValidUri } from "../../src/lib/url-utils.js";

describe("isValidUri", () => {
  describe("valid URIs", () => {
    it("should accept https URLs", () => {
      expect(isValidUri("https://example.com")).toBe(true);
      expect(isValidUri("https://example.com/path/to/resource")).toBe(true);
      expect(isValidUri("https://example.com/report.pdf")).toBe(true);
      expect(isValidUri("https://example.com:8080/path?q=1&r=2#frag")).toBe(true);
    });

    it("should accept http URLs", () => {
      expect(isValidUri("http://example.com")).toBe(true);
      expect(isValidUri("http://localhost:3000")).toBe(true);
    });

    it("should accept AT Protocol URIs", () => {
      expect(isValidUri("at://did:plc:abc123/org.hypercerts.claim.activity/rkey")).toBe(true);
      expect(isValidUri("at://did:plc:test/org.hypercerts.claim.record/def456")).toBe(true);
      expect(isValidUri("at://did:web:example.com/app.bsky.feed.post/3km2vj4kfqp2a")).toBe(true);
    });

    it("should accept ftp URIs", () => {
      expect(isValidUri("ftp://files.example.com/doc.txt")).toBe(true);
    });

    it("should accept ipfs URIs", () => {
      expect(isValidUri("ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG")).toBe(true);
      expect(isValidUri("ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")).toBe(true);
    });

    it("should accept data URIs", () => {
      expect(isValidUri("data:text/plain;base64,SGVsbG8=")).toBe(true);
    });

    it("should accept mailto URIs", () => {
      expect(isValidUri("mailto:user@example.com")).toBe(true);
    });
  });

  describe("invalid URIs", () => {
    it("should reject plain text", () => {
      expect(isValidUri("not-a-uri")).toBe(false);
      expect(isValidUri("just some text")).toBe(false);
      expect(isValidUri("hello world")).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(isValidUri("")).toBe(false);
    });

    it("should reject bare hostnames without scheme", () => {
      expect(isValidUri("example.com")).toBe(false);
      expect(isValidUri("www.example.com")).toBe(false);
    });

    it("should reject relative paths", () => {
      expect(isValidUri("/relative/path")).toBe(false);
      expect(isValidUri("./relative/path")).toBe(false);
      expect(isValidUri("../parent/path")).toBe(false);
    });

    it("should reject strings with only a colon", () => {
      expect(isValidUri(":not-valid")).toBe(false);
      expect(isValidUri("://missing-scheme")).toBe(false);
    });
  });
});
