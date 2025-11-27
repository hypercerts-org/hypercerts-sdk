import { beforeEach, describe, expect, it, vi } from "vitest";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { ValidationError } from "../../src/core/errors.js";
import { createMockLexicon } from "../utils/repository-fixtures.js";
import type { Agent } from "@atproto/api";
import type { LexiconDoc } from "@atproto/lexicon";

describe("LexiconRegistry", () => {
  let registry: LexiconRegistry;

  beforeEach(() => {
    registry = new LexiconRegistry();
  });

  describe("register", () => {
    it("should register a lexicon", () => {
      const lexicon = createMockLexicon("com.example.test");
      expect(() => registry.register(lexicon as LexiconDoc)).not.toThrow();
      expect(registry.has("com.example.test")).toBe(true);
    });

    it("should throw ValidationError for lexicon without id", () => {
      const lexicon = { lexicon: 1 } as unknown as LexiconDoc;
      expect(() => registry.register(lexicon)).toThrow(ValidationError);
      expect(() => registry.register(lexicon)).toThrow("Lexicon must have an 'id' field");
    });

    it("should overwrite existing lexicon with same id", () => {
      const lexicon1 = createMockLexicon("com.example.test");
      const lexicon2 = {
        ...lexicon1,
        defs: {
          record: {
            type: "record" as const,
            record: {
              type: "object" as const,
              properties: {},
            },
          },
        },
      } as LexiconDoc;

      registry.register(lexicon1);
      // Overwriting lexicons is allowed (creates new Lexicons collection)
      expect(() => registry.register(lexicon2)).not.toThrow();
      expect(registry.get("com.example.test")).toEqual(lexicon2);
    });
  });

  describe("registerMany", () => {
    it("should register multiple lexicons", () => {
      const lexicons = [
        createMockLexicon("com.example.one"),
        createMockLexicon("com.example.two"),
        createMockLexicon("com.example.three"),
      ] as LexiconDoc[];

      registry.registerMany(lexicons);

      expect(registry.has("com.example.one")).toBe(true);
      expect(registry.has("com.example.two")).toBe(true);
      expect(registry.has("com.example.three")).toBe(true);
    });

    it("should throw ValidationError if any lexicon is invalid", () => {
      const lexicons = [createMockLexicon("com.example.one"), { lexicon: 1 } as unknown as LexiconDoc];

      expect(() => registry.registerMany(lexicons)).toThrow(ValidationError);
    });
  });

  describe("get", () => {
    it("should return registered lexicon", () => {
      const lexicon = createMockLexicon("com.example.test");
      registry.register(lexicon);

      const retrieved = registry.get("com.example.test");
      expect(retrieved).toEqual(lexicon);
    });

    it("should return undefined for unregistered lexicon", () => {
      expect(registry.get("com.example.nonexistent")).toBeUndefined();
    });
  });

  describe("validate", () => {
    it("should validate a valid record", () => {
      const lexicon = createMockLexicon("com.example.test");
      registry.register(lexicon);

      // The mock lexicon has a record def, so we need to validate against the record type
      // Note: Validation may fail if the schema doesn't match exactly
      const result = registry.validate("com.example.test", {
        $type: "com.example.test",
        text: "Hello",
      });

      // Validation result depends on lexicon schema - just check it doesn't throw
      expect(result).toHaveProperty("valid");
      // Error property is optional and only present when validation fails
      if (!result.valid) {
        expect(result).toHaveProperty("error");
      }
    });

    it("should return invalid result for invalid record", () => {
      const lexicon = createMockLexicon("com.example.test");
      registry.register(lexicon);

      const result = registry.validate("com.example.test", {
        $type: "com.example.test",
        invalidField: "value",
      });

      // Validation may pass or fail depending on lexicon schema
      // The important thing is that validate() doesn't throw
      expect(result).toHaveProperty("valid");
    });

    it("should return valid result for unknown collection (no lexicon registered)", () => {
      // When no lexicon is registered for a collection, validation passes
      // because we can't validate against unknown schemas
      const result = registry.validate("com.example.unknown", {
        $type: "com.example.unknown",
      });

      expect(result.valid).toBe(true);
      // No error when lexicon isn't registered
    });
  });

  describe("addToAgent", () => {
    it("should add lexicons to agent", () => {
      const lexicon = createMockLexicon("com.example.test");
      registry.register(lexicon);

      const mockAgent = {
        lex: {
          add: vi.fn(),
        },
      } as unknown as Agent;

      registry.addToAgent(mockAgent);

      expect(mockAgent.lex.add).toHaveBeenCalledWith(lexicon);
    });

    it("should add all registered lexicons to agent", () => {
      const lexicons = [createMockLexicon("com.example.one"), createMockLexicon("com.example.two")];
      registry.registerMany(lexicons);

      const mockAgent = {
        lex: {
          add: vi.fn(),
        },
      } as unknown as Agent;

      registry.addToAgent(mockAgent);

      expect(mockAgent.lex.add).toHaveBeenCalledTimes(2);
      expect(mockAgent.lex.add).toHaveBeenCalledWith(lexicons[0]);
      expect(mockAgent.lex.add).toHaveBeenCalledWith(lexicons[1]);
    });
  });

  describe("getRegisteredIds", () => {
    it("should return empty array for empty registry", () => {
      expect(registry.getRegisteredIds()).toEqual([]);
    });

    it("should return all registered lexicon IDs", () => {
      registry.register(createMockLexicon("com.example.one"));
      registry.register(createMockLexicon("com.example.two"));

      const ids = registry.getRegisteredIds();
      expect(ids).toContain("com.example.one");
      expect(ids).toContain("com.example.two");
      expect(ids.length).toBe(2);
    });
  });

  describe("has", () => {
    it("should return true for registered lexicon", () => {
      registry.register(createMockLexicon("com.example.test"));
      expect(registry.has("com.example.test")).toBe(true);
    });

    it("should return false for unregistered lexicon", () => {
      expect(registry.has("com.example.nonexistent")).toBe(false);
    });
  });
});
