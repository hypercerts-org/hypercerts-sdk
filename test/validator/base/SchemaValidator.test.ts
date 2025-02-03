import { expect } from "chai";
import { Schema } from "ajv";
import { AjvSchemaValidator, ZodSchemaValidator } from "../../../src/validator/base/SchemaValidator";
import { describe, it } from "vitest";
import { z } from "zod";

// Create concrete test implementations from the abstract classes
class TestAjvValidator extends AjvSchemaValidator<any> {
  constructor(schema: Schema, additionalSchemas: Schema[] = []) {
    super(schema, additionalSchemas);
  }
}

class TestZodValidator extends ZodSchemaValidator<any> {
  constructor(schema: z.ZodType<any>) {
    super(schema);
  }
}

describe("SchemaValidator", () => {
  describe("AjvSchemaValidator", () => {
    const simpleSchema: Schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };

    it("should validate valid data", () => {
      const validator = new TestAjvValidator(simpleSchema);
      const result = validator.validate({ name: "Test", age: 25 });

      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal({ name: "Test", age: 25 });
      expect(result.errors).to.be.empty;
    });

    it("should return errors for invalid data", () => {
      const validator = new TestAjvValidator(simpleSchema);
      const result = validator.validate({ age: 25 });

      expect(result.isValid).to.be.false;
      expect(result.data).to.be.undefined;
      expect(result.errors?.[0].code).to.equal("SCHEMA_VALIDATION_ERROR");
      expect(result.errors?.[0].field).to.equal("name");
    });

    it("should handle additional schemas", () => {
      const refSchema: Schema = {
        type: "object",
        properties: {
          type: { type: "string" },
        },
      };

      const mainSchema: Schema = {
        type: "object",
        properties: {
          data: { $ref: "ref#" },
        },
      };

      const validator = new TestAjvValidator(mainSchema, [{ ...refSchema, $id: "ref" }]);
      const result = validator.validate({ data: { type: "test" } });

      expect(result.isValid).to.be.true;
    });
  });

  describe("ZodSchemaValidator", () => {
    const simpleSchema = z
      .object({
        name: z.string(),
        age: z.number().optional(),
      })
      .refine(
        (data) => data.name === "Test",
        (data) => ({
          message: "Custom error: name must be Test",
          path: ["name"],
          code: "CUSTOM_ERROR",
        }),
      );

    it("should validate valid data", () => {
      const validator = new TestZodValidator(simpleSchema);
      const result = validator.validate({ name: "Test", age: 25 });

      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal({ name: "Test", age: 25 });
      expect(result.errors).to.be.empty;
    });

    it("should return errors for invalid data", () => {
      const validator = new TestZodValidator(simpleSchema);
      const result = validator.validate({ age: 25 });

      expect(result.isValid).to.be.false;
      expect(result.data).to.be.undefined;
      expect(result.errors?.[0].code).to.equal("invalid_type");
      expect(result.errors?.[0].field).to.equal("name");
    });

    it("should preserve custom error codes from refinements", () => {
      const validator = new TestZodValidator(simpleSchema);
      const result = validator.validate({ name: "Incorrect" });

      expect(result.isValid).to.be.false;
      expect(result.errors?.[0].code).to.equal("CUSTOM_ERROR");
    });

    it("should handle nested error paths", () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });

      const validator = new TestZodValidator(nestedSchema);
      const result = validator.validate({ user: { name: 123 } });

      expect(result.isValid).to.be.false;
      expect(result.errors?.[0].field).to.equal("user.name");
    });
  });
});
