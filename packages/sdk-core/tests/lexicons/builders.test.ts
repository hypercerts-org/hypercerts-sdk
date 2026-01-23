import { describe, it, expect } from "vitest";
import {
  createStringField,
  createIntegerField,
  createNumberField,
  createBooleanField,
  createStrongRefField,
  createArrayField,
  createObjectField,
  createBlobField,
  createDatetimeField,
  createRecordDef,
  createLexiconDoc,
  validateLexiconStructure,
} from "../../src/lexicons/builders.js";

describe("Field Builders", () => {
  describe("createStringField", () => {
    it("should create basic string field", () => {
      const field = createStringField();
      expect(field.type).toBe("string");
    });

    it("should create string field with options", () => {
      const field = createStringField({
        description: "A title",
        minLength: 1,
        maxLength: 200,
      });
      expect(field).toEqual({
        type: "string",
        description: "A title",
        minLength: 1,
        maxLength: 200,
      });
    });

    it("should create string field with format", () => {
      const field = createStringField({ format: "uri" });
      expect(field.format).toBe("uri");
    });

    it("should create string field with enum", () => {
      const field = createStringField({ enum: ["draft", "published"] });
      expect(field.enum).toEqual(["draft", "published"]);
    });
  });

  describe("createIntegerField", () => {
    it("should create basic integer field", () => {
      const field = createIntegerField();
      expect(field.type).toBe("integer");
    });

    it("should create integer field with constraints", () => {
      const field = createIntegerField({
        description: "A score",
        minimum: 0,
        maximum: 100,
      });
      expect(field).toEqual({
        type: "integer",
        description: "A score",
        minimum: 0,
        maximum: 100,
      });
    });

    it("should create integer field with default", () => {
      const field = createIntegerField({ default: 0 });
      expect(field.default).toBe(0);
    });
  });

  describe("createNumberField", () => {
    it("should create basic number field", () => {
      const field = createNumberField();
      expect(field.type).toBe("number");
    });

    it("should create number field with constraints", () => {
      const field = createNumberField({
        description: "A weight",
        minimum: 0,
        maximum: 1,
      });
      expect(field).toEqual({
        type: "number",
        description: "A weight",
        minimum: 0,
        maximum: 1,
      });
    });
  });

  describe("createBooleanField", () => {
    it("should create basic boolean field", () => {
      const field = createBooleanField();
      expect(field.type).toBe("boolean");
    });

    it("should create boolean field with default", () => {
      const field = createBooleanField({ default: false });
      expect(field).toEqual({
        type: "boolean",
        default: false,
      });
    });
  });

  describe("createStrongRefField", () => {
    it("should create strongRef field with default ref", () => {
      const field = createStrongRefField();
      expect(field).toEqual({
        type: "ref",
        ref: "com.atproto.repo.strongRef",
      });
    });

    it("should create strongRef field with custom ref", () => {
      const field = createStrongRefField({ ref: "org.myapp.customType" });
      expect(field.ref).toBe("org.myapp.customType");
    });

    it("should create strongRef field with description", () => {
      const field = createStrongRefField({ description: "The subject" });
      expect(field).toEqual({
        type: "ref",
        ref: "com.atproto.repo.strongRef",
        description: "The subject",
      });
    });
  });

  describe("createArrayField", () => {
    it("should create array field with string items", () => {
      const field = createArrayField(createStringField());
      expect(field).toEqual({
        type: "array",
        items: { type: "string" },
      });
    });

    it("should create array field with constraints", () => {
      const field = createArrayField(createStringField({ maxLength: 50 }), {
        description: "Tags",
        minLength: 1,
        maxLength: 10,
      });
      expect(field).toEqual({
        type: "array",
        items: { type: "string", maxLength: 50 },
        description: "Tags",
        minLength: 1,
        maxLength: 10,
      });
    });

    it("should create array of strongRefs", () => {
      const field = createArrayField(createStrongRefField());
      expect(field.items).toEqual({
        type: "ref",
        ref: "com.atproto.repo.strongRef",
      });
    });
  });

  describe("createObjectField", () => {
    it("should create basic object field", () => {
      const field = createObjectField();
      expect(field.type).toBe("object");
    });

    it("should create object field with properties", () => {
      const field = createObjectField({
        properties: {
          name: createStringField(),
          age: createIntegerField(),
        },
        required: ["name"],
      });
      expect(field.properties).toBeDefined();
      expect(field.required).toEqual(["name"]);
    });
  });

  describe("createBlobField", () => {
    it("should create basic blob field", () => {
      const field = createBlobField();
      expect(field.type).toBe("blob");
    });

    it("should create blob field with constraints", () => {
      const field = createBlobField({
        accept: ["image/png", "image/jpeg"],
        maxSize: 1000000,
      });
      expect(field).toEqual({
        type: "blob",
        accept: ["image/png", "image/jpeg"],
        maxSize: 1000000,
      });
    });
  });

  describe("createDatetimeField", () => {
    it("should create datetime string field", () => {
      const field = createDatetimeField();
      expect(field).toEqual({
        type: "string",
        format: "datetime",
      });
    });

    it("should create datetime field with description", () => {
      const field = createDatetimeField({ description: "Creation time" });
      expect(field).toEqual({
        type: "string",
        format: "datetime",
        description: "Creation time",
      });
    });
  });
});

describe("Record Definition Builders", () => {
  describe("createRecordDef", () => {
    it("should create basic record definition", () => {
      const def = createRecordDef(
        {
          $type: createStringField({ const: "org.myapp.post" }),
          text: createStringField(),
          createdAt: createDatetimeField(),
        },
        ["$type", "text", "createdAt"],
      );

      expect(def.type).toBe("record");
      expect(def.key).toBe("tid");
      expect(def.record.type).toBe("object");
      expect(def.record.required).toEqual(["$type", "text", "createdAt"]);
      expect(Object.keys(def.record.properties)).toEqual(["$type", "text", "createdAt"]);
    });

    it("should create record with custom key type", () => {
      const def = createRecordDef(
        {
          $type: createStringField({ const: "org.myapp.post" }),
          text: createStringField(),
        },
        ["$type", "text"],
        "any",
      );

      expect(def.key).toBe("any");
    });

    it("should create record with strongRef field", () => {
      const def = createRecordDef(
        {
          $type: createStringField({ const: "org.myapp.evaluation" }),
          subject: createStrongRefField({ description: "The evaluated item" }),
          score: createIntegerField({ minimum: 0, maximum: 100 }),
        },
        ["$type", "subject", "score"],
      );

      expect(def.record.properties.subject).toEqual({
        type: "ref",
        ref: "com.atproto.repo.strongRef",
        description: "The evaluated item",
      });
    });
  });

  describe("createLexiconDoc", () => {
    it("should create complete lexicon document", () => {
      const doc = createLexiconDoc(
        "org.myapp.evaluation",
        {
          $type: createStringField({ const: "org.myapp.evaluation" }),
          subject: createStrongRefField(),
          score: createIntegerField({ minimum: 0, maximum: 100 }),
          createdAt: createDatetimeField(),
        },
        ["$type", "subject", "score", "createdAt"],
      );

      expect(doc.lexicon).toBe(1);
      expect(doc.id).toBe("org.myapp.evaluation");
      expect(doc.defs.main.type).toBe("record");
      expect(doc.defs.main.key).toBe("tid");
      expect(doc.defs.main.record.required).toEqual(["$type", "subject", "score", "createdAt"]);
    });

    it("should create lexicon with optional fields", () => {
      const doc = createLexiconDoc(
        "org.myapp.post",
        {
          $type: createStringField({ const: "org.myapp.post" }),
          text: createStringField({ maxLength: 500 }),
          tags: createArrayField(createStringField({ maxLength: 50 })),
          createdAt: createDatetimeField(),
        },
        ["$type", "text", "createdAt"], // tags is optional
      );

      expect(doc.defs.main.record.required).toEqual(["$type", "text", "createdAt"]);
      expect(doc.defs.main.record.properties.tags).toBeDefined();
    });

    it("should create complex nested lexicon", () => {
      const doc = createLexiconDoc(
        "org.myapp.complex",
        {
          $type: createStringField({ const: "org.myapp.complex" }),
          metadata: createObjectField({
            properties: {
              author: createStringField(),
              version: createIntegerField(),
            },
            required: ["author"],
          }),
          refs: createArrayField(createStrongRefField()),
          createdAt: createDatetimeField(),
        },
        ["$type", "metadata", "refs", "createdAt"],
      );

      const metadataField = doc.defs.main.record.properties.metadata;
      expect(metadataField.type).toBe("object");
    });
  });
});

describe("Validation", () => {
  describe("validateLexiconStructure", () => {
    it("should validate valid lexicon", () => {
      const lexicon = createLexiconDoc(
        "org.myapp.test",
        {
          $type: createStringField({ const: "org.myapp.test" }),
          text: createStringField(),
        },
        ["$type", "text"],
      );

      expect(validateLexiconStructure(lexicon)).toBe(true);
    });

    it("should reject null", () => {
      expect(validateLexiconStructure(null)).toBe(false);
    });

    it("should reject non-object", () => {
      expect(validateLexiconStructure("not-an-object")).toBe(false);
    });

    it("should reject missing lexicon version", () => {
      expect(
        validateLexiconStructure({
          id: "org.myapp.test",
          defs: { main: { type: "record", record: { type: "object", required: [], properties: {} } } },
        }),
      ).toBe(false);
    });

    it("should reject wrong lexicon version", () => {
      expect(
        validateLexiconStructure({
          lexicon: 2,
          id: "org.myapp.test",
          defs: { main: { type: "record", record: { type: "object", required: [], properties: {} } } },
        }),
      ).toBe(false);
    });

    it("should reject missing id", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          defs: { main: { type: "record", record: { type: "object", required: [], properties: {} } } },
        }),
      ).toBe(false);
    });

    it("should reject missing defs", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
        }),
      ).toBe(false);
    });

    it("should reject missing main def", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: {},
        }),
      ).toBe(false);
    });

    it("should reject non-record main def", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: { main: { type: "query" } },
        }),
      ).toBe(false);
    });

    it("should reject missing record field", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: { main: { type: "record" } },
        }),
      ).toBe(false);
    });

    it("should reject non-object record type", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: { main: { type: "record", record: { type: "string" } } },
        }),
      ).toBe(false);
    });

    it("should reject missing required array", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: { main: { type: "record", record: { type: "object", properties: {} } } },
        }),
      ).toBe(false);
    });

    it("should reject missing properties", () => {
      expect(
        validateLexiconStructure({
          lexicon: 1,
          id: "org.myapp.test",
          defs: { main: { type: "record", record: { type: "object", required: [] } } },
        }),
      ).toBe(false);
    });
  });
});
