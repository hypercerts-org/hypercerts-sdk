import { describe, it, expect } from "vitest";
import { ATProtoSDKConfigSchema } from "../../src/core/config.js";
import { isLoopbackUrl } from "../../src/lib/url-utils.js";

describe("URL Validation with Loopback Support", () => {
  const validJWK = JSON.stringify({
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        kid: "test-key-1",
        use: "sig",
        x: "test",
        y: "test",
        d: "test",
      },
    ],
  });

  describe("isLoopbackUrl helper", () => {
    it("returns true for http://localhost", () => {
      expect(isLoopbackUrl("http://localhost/")).toBe(true);
      expect(isLoopbackUrl("http://localhost:3000")).toBe(true);
      expect(isLoopbackUrl("http://localhost:3000/path")).toBe(true);
    });

    it("returns true for http://127.0.0.1", () => {
      expect(isLoopbackUrl("http://127.0.0.1/")).toBe(true);
      expect(isLoopbackUrl("http://127.0.0.1:3000")).toBe(true);
      expect(isLoopbackUrl("http://127.0.0.1:8080/path")).toBe(true);
    });

    it("returns true for http://[::1] IPv6 loopback", () => {
      expect(isLoopbackUrl("http://[::1]/")).toBe(true);
      expect(isLoopbackUrl("http://[::1]:3000")).toBe(true);
      expect(isLoopbackUrl("http://[::1]:8080/path")).toBe(true);
    });

    it("returns false for https://localhost (must be http)", () => {
      expect(isLoopbackUrl("https://localhost/")).toBe(false);
      expect(isLoopbackUrl("https://localhost:3000")).toBe(false);
      expect(isLoopbackUrl("https://127.0.0.1:3000")).toBe(false);
    });

    it("returns false for non-loopback http URLs", () => {
      expect(isLoopbackUrl("http://example.com")).toBe(false);
      expect(isLoopbackUrl("http://192.168.1.1")).toBe(false);
      expect(isLoopbackUrl("http://10.0.0.1")).toBe(false);
    });

    it("returns false for invalid URLs", () => {
      expect(isLoopbackUrl("not-a-url")).toBe(false);
      expect(isLoopbackUrl("")).toBe(false);
    });
  });

  describe("clientId validation", () => {
    it("accepts http://localhost/", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://localhost:3000/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts http://localhost with port", () => {
      const config = {
        oauth: {
          clientId: "http://localhost:8080/client-metadata.json",
          redirectUri: "http://localhost:3000/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts http://127.0.0.1 with port", () => {
      const config = {
        oauth: {
          clientId: "http://127.0.0.1:3000/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://127.0.0.1:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts http://[::1] IPv6 loopback", () => {
      const config = {
        oauth: {
          clientId: "http://[::1]:3000/",
          redirectUri: "http://[::1]:3000/callback",
          scope: "atproto",
          jwksUri: "http://[::1]:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("rejects http:// URLs for non-loopback hosts", () => {
      const config = {
        oauth: {
          clientId: "http://example.com/client-metadata.json",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      const result = ATProtoSDKConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("loopback");
      }
    });

    it("always accepts https:// URLs", () => {
      const config = {
        oauth: {
          clientId: "https://example.com/client-metadata.json",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("redirectUri validation", () => {
    it("accepts localhost redirect", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://localhost:3000/api/auth/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts 127.0.0.1 redirect", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts IPv6 loopback redirect", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://[::1]:3000/api/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("rejects non-loopback http redirect", () => {
      const config = {
        oauth: {
          clientId: "https://example.com/",
          redirectUri: "http://example.com:3000/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      const result = ATProtoSDKConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes("loopback"))).toBe(true);
      }
    });
  });

  describe("jwksUri validation", () => {
    it("accepts loopback jwksUri", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://127.0.0.1:3000/.well-known/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts https jwksUri with loopback clientId", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("server URLs validation", () => {
    it("accepts loopback SDS URL with handleResolver", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://localhost:3000/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
        handleResolver: "http://localhost:2583",
        servers: {
          sds: "http://localhost:2584",
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts loopback SDS URL", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://localhost:3000/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
        servers: {
          sds: "http://127.0.0.1:2584",
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts loopback SDS with handleResolver", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://localhost:3000/callback",
          scope: "atproto",
          jwksUri: "http://localhost:3000/jwks.json",
          jwkPrivate: validJWK,
        },
        handleResolver: "http://localhost:2583",
        servers: {
          sds: "http://127.0.0.1:2584",
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("rejects non-loopback http SDS URLs", () => {
      const config = {
        oauth: {
          clientId: "https://example.com/",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
        servers: {
          sds: "http://example.com:2584",
        },
      };

      const result = ATProtoSDKConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes("loopback"))).toBe(true);
      }
    });

    it("accepts https server URLs", () => {
      const config = {
        oauth: {
          clientId: "https://example.com/",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
        handleResolver: "https://pds-eu-west4.test.certified.app",
        servers: {
          sds: "https://sds.hypercerts.org",
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("developmentMode flag", () => {
    it("accepts developmentMode: true", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://127.0.0.1:3000/jwks.json",
          jwkPrivate: validJWK,
          developmentMode: true,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts developmentMode: false", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://127.0.0.1:3000/jwks.json",
          jwkPrivate: validJWK,
          developmentMode: false,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts missing developmentMode (optional)", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "http://127.0.0.1:3000/callback",
          scope: "atproto",
          jwksUri: "http://127.0.0.1:3000/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("mixed configurations", () => {
    it("accepts loopback clientId with https redirectUri", () => {
      const config = {
        oauth: {
          clientId: "http://localhost/",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });

    it("accepts https clientId with loopback handleResolver for local testing", () => {
      const config = {
        oauth: {
          clientId: "https://example.com/",
          redirectUri: "https://example.com/callback",
          scope: "atproto",
          jwksUri: "https://example.com/jwks.json",
          jwkPrivate: validJWK,
        },
        handleResolver: "http://localhost:2583", // Testing against local handle resolver
      };

      expect(() => ATProtoSDKConfigSchema.parse(config)).not.toThrow();
    });
  });
});
