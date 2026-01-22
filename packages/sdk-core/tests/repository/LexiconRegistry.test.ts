/**
 * Tests for LexiconRegistry.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { LexiconDoc } from "@atproto/lexicon";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";

// Sample lexicon for testing
const sampleLexicon: LexiconDoc = {
  lexicon: 1,
  id: "org.test.sample",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["$type", "title"],
        properties: {
          $type: {
            type: "string",
            const: "org.test.sample",
          },
          title: {
            type: "string",
            maxLength: 100,
          },
          description: {
            type: "string",
          },
        },
      },
    },
  },
};

const anotherLexicon: LexiconDoc = {
  lexicon: 1,
  id: "org.test.another",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["$type", "name"],
        properties: {
          $type: {
            type: "string",
            const: "org.test.another",
          },
          name: {
            type: "string",
          },
        },
      },
    },
  },
};

describe("LexiconRegistry", () => {
  let registry: LexiconRegistry;

  beforeEach(() => {
    registry = new LexiconRegistry();
  });

  describe("constructor", () => {
    it("should create empty registry", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("should initialize with lexicons", () => {
      const registryWithLexicons = new LexiconRegistry([sampleLexicon, anotherLexicon]);
      expect(registryWithLexicons.getAll()).toContain("org.test.sample");
      expect(registryWithLexicons.getAll()).toContain("org.test.another");
    });
  });

  describe("register", () => {
    it("should register a lexicon", () => {
      registry.register(sampleLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);
    });

    it("should throw error for lexicon without id", () => {
      const invalidLexicon = {
        lexicon: 1,
        defs: {},
      } as LexiconDoc;

      expect(() => registry.register(invalidLexicon)).toThrow("Lexicon must have an id");
    });

    it("should throw error for duplicate registration", () => {
      registry.register(sampleLexicon);
      expect(() => registry.register(sampleLexicon)).toThrow("already registered");
    });

    it("should register multiple different lexicons", () => {
      registry.register(sampleLexicon);
      registry.register(anotherLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);
      expect(registry.isRegistered("org.test.another")).toBe(true);
    });
  });

  describe("registerMany", () => {
    it("should register multiple lexicons at once", () => {
      registry.registerMany([sampleLexicon, anotherLexicon]);
      expect(registry.isRegistered("org.test.sample")).toBe(true);
      expect(registry.isRegistered("org.test.another")).toBe(true);
    });

    it("should handle empty array", () => {
      registry.registerMany([]);
      expect(registry.getAll()).toEqual([]);
    });

    it("should throw error if any lexicon is invalid", () => {
      const invalidLexicon = { lexicon: 1 } as LexiconDoc;
      expect(() => registry.registerMany([sampleLexicon, invalidLexicon])).toThrow();
    });
  });

  describe("registerFromJSON", () => {
    it("should register lexicon from JSON object", () => {
      registry.registerFromJSON(sampleLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);
    });

    it("should throw ValidationError for null", () => {
      expect(() => registry.registerFromJSON(null)).toThrow("Lexicon JSON must be a valid object");
    });

    it("should throw ValidationError for undefined", () => {
      expect(() => registry.registerFromJSON(undefined)).toThrow("Lexicon JSON must be a valid object");
    });

    it("should throw ValidationError for string", () => {
      expect(() => registry.registerFromJSON("not an object")).toThrow("Lexicon JSON must be a valid object");
    });

    it("should throw ValidationError for number", () => {
      expect(() => registry.registerFromJSON(123)).toThrow("Lexicon JSON must be a valid object");
    });

    it("should throw error for invalid lexicon object", () => {
      expect(() => registry.registerFromJSON({ invalid: true })).toThrow();
    });
  });

  describe("unregister", () => {
    it("should unregister a lexicon", () => {
      registry.register(sampleLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);

      const result = registry.unregister("org.test.sample");
      expect(result).toBe(true);
      expect(registry.isRegistered("org.test.sample")).toBe(false);
    });

    it("should return false for non-registered lexicon", () => {
      const result = registry.unregister("org.test.nonexistent");
      expect(result).toBe(false);
    });

    it("should not affect other registered lexicons", () => {
      registry.register(sampleLexicon);
      registry.register(anotherLexicon);

      registry.unregister("org.test.sample");
      expect(registry.isRegistered("org.test.another")).toBe(true);
    });

    it("should allow re-registration after unregister", () => {
      // Register
      registry.register(sampleLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);

      // Unregister
      registry.unregister("org.test.sample");
      expect(registry.isRegistered("org.test.sample")).toBe(false);

      // Re-register should work without throwing
      expect(() => registry.register(sampleLexicon)).not.toThrow();
      expect(registry.isRegistered("org.test.sample")).toBe(true);

      // Validation should still work
      const result = registry.validate("org.test.sample", {
        $type: "org.test.sample",
        title: "Test",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("isRegistered", () => {
    it("should return true for registered lexicon", () => {
      registry.register(sampleLexicon);
      expect(registry.isRegistered("org.test.sample")).toBe(true);
    });

    it("should return false for unregistered lexicon", () => {
      expect(registry.isRegistered("org.test.sample")).toBe(false);
    });

    it("should return false after unregistering", () => {
      registry.register(sampleLexicon);
      registry.unregister("org.test.sample");
      expect(registry.isRegistered("org.test.sample")).toBe(false);
    });
  });

  describe("get", () => {
    it("should return lexicon document", () => {
      registry.register(sampleLexicon);
      const lexicon = registry.get("org.test.sample");
      expect(lexicon).toBeDefined();
      expect(lexicon?.id).toBe("org.test.sample");
    });

    it("should return undefined for unregistered lexicon", () => {
      const lexicon = registry.get("org.test.nonexistent");
      expect(lexicon).toBeUndefined();
    });

    it("should return undefined after unregistering", () => {
      registry.register(sampleLexicon);
      registry.unregister("org.test.sample");
      const lexicon = registry.get("org.test.sample");
      expect(lexicon).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return empty array for no registrations", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("should return all registered NSIDs", () => {
      registry.register(sampleLexicon);
      registry.register(anotherLexicon);
      const all = registry.getAll();
      expect(all).toContain("org.test.sample");
      expect(all).toContain("org.test.another");
      expect(all.length).toBe(2);
    });

    it("should not include unregistered lexicons", () => {
      registry.register(sampleLexicon);
      registry.register(anotherLexicon);
      registry.unregister("org.test.sample");
      const all = registry.getAll();
      expect(all).not.toContain("org.test.sample");
      expect(all).toContain("org.test.another");
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      registry.register(sampleLexicon);
    });

    it("should validate valid record", () => {
      const record = {
        $type: "org.test.sample",
        title: "Test Record",
      };

      const result = registry.validate("org.test.sample", record);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate record with optional fields", () => {
      const record = {
        $type: "org.test.sample",
        title: "Test Record",
        description: "Optional description",
      };

      const result = registry.validate("org.test.sample", record);
      expect(result.valid).toBe(true);
    });

    it("should reject record missing required field", () => {
      const record = {
        $type: "org.test.sample",
        // Missing 'title'
      };

      const result = registry.validate("org.test.sample", record);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("title");
    });

    it("should reject record with wrong $type", () => {
      const record = {
        $type: "org.test.wrong",
        title: "Test Record",
      };

      const result = registry.validate("org.test.sample", record);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject record with field exceeding maxLength", () => {
      const record = {
        $type: "org.test.sample",
        title: "x".repeat(101), // Exceeds maxLength of 100
      };

      const result = registry.validate("org.test.sample", record);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for unregistered lexicon", () => {
      const result = registry.validate("org.test.nonexistent", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not registered");
    });

    it("should handle invalid record data gracefully", () => {
      const result = registry.validate("org.test.sample", null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getLexicons", () => {
    it("should return Lexicons instance", () => {
      const lexicons = registry.getLexicons();
      expect(lexicons).toBeDefined();
      expect(typeof lexicons.get).toBe("function");
    });

    it("should allow direct access to lexicons", () => {
      registry.register(sampleLexicon);
      const lexicons = registry.getLexicons();
      const lexicon = lexicons.get("org.test.sample");
      expect(lexicon).toBeDefined();
      expect(lexicon?.id).toBe("org.test.sample");
    });
  });

  describe("edge cases", () => {
    it("should handle lexicon with complex schema", () => {
      const complexLexicon: LexiconDoc = {
        lexicon: 1,
        id: "org.test.complex",
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type", "title"],
              properties: {
                $type: { type: "string", const: "org.test.complex" },
                title: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                metadata: {
                  type: "unknown",
                },
              },
            },
          },
        },
      };

      registry.register(complexLexicon);

      const validRecord = {
        $type: "org.test.complex",
        title: "Complex Record",
        tags: ["tag1", "tag2"],
        metadata: { version: 1 },
      };

      const result = registry.validate("org.test.complex", validRecord);
      expect(result.valid).toBe(true);
    });

    it("should handle concurrent registrations", () => {
      const lexicons = Array.from({ length: 10 }, (_, i) => ({
        lexicon: 1,
        id: `org.test.concurrent${i}`,
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type"],
              properties: {
                $type: { type: "string", const: `org.test.concurrent${i}` },
              },
            },
          },
        },
      })) as LexiconDoc[];

      lexicons.forEach((lex) => registry.register(lex));

      expect(registry.getAll().length).toBe(10);
      lexicons.forEach((lex) => {
        expect(registry.isRegistered(lex.id)).toBe(true);
      });
    });
  });
});
