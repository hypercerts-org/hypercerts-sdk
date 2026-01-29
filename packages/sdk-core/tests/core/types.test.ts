import { describe, it, expect } from "vitest";
import { isValidDid } from "../../src/core/types.js";

describe("isValidDid", () => {
  describe("valid DIDs", () => {
    it("should accept did:plc format", () => {
      expect(isValidDid("did:plc:abc123")).toBe(true);
    });

    it("should accept did:web format", () => {
      expect(isValidDid("did:web:example.com")).toBe(true);
    });

    it("should accept DID with alphanumeric identifier", () => {
      expect(isValidDid("did:plc:ewvi7nxzyoun6zhxrhs64oiz")).toBe(true);
    });

    it("should accept DID with dots in identifier", () => {
      expect(isValidDid("did:web:sub.example.com")).toBe(true);
    });

    it("should accept DID with colons in identifier", () => {
      expect(isValidDid("did:web:example.com:user:123")).toBe(true);
    });

    it("should accept DID with percent-encoded characters", () => {
      expect(isValidDid("did:example:abc%20def")).toBe(true);
    });

    it("should accept DID with hyphens and underscores", () => {
      expect(isValidDid("did:example:my-test_id")).toBe(true);
    });
  });

  describe("invalid DIDs", () => {
    it("should reject empty string", () => {
      expect(isValidDid("")).toBe(false);
    });

    it("should reject string not starting with did:", () => {
      expect(isValidDid("not-a-did")).toBe(false);
    });

    it("should reject did: without method", () => {
      expect(isValidDid("did:")).toBe(false);
    });

    it("should reject did:method without identifier", () => {
      expect(isValidDid("did:plc:")).toBe(false);
    });

    it("should reject did:method: with empty identifier", () => {
      expect(isValidDid("did:plc:")).toBe(false);
    });

    it("should reject method with uppercase letters", () => {
      expect(isValidDid("did:PLC:abc123")).toBe(false);
    });

    it("should reject method with numbers", () => {
      expect(isValidDid("did:plc2:abc123")).toBe(false);
    });

    it("should reject random URL", () => {
      expect(isValidDid("https://example.com")).toBe(false);
    });

    it("should reject AT-URI", () => {
      expect(isValidDid("at://did:plc:abc123/collection/rkey")).toBe(false);
    });
  });
});
