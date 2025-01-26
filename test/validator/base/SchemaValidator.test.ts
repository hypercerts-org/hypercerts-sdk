import { expect } from "chai";
import { Schema } from "ajv";
import { SchemaValidator } from "../../../src/validator/base/SchemaValidator";
import { describe, it } from "vitest";

// Create a concrete test implementation
class TestValidator extends SchemaValidator<any> {
  constructor(schema: Schema, additionalSchemas: Schema[] = []) {
    super(schema, additionalSchemas);
  }
}

describe("SchemaValidator", () => {
  const simpleSchema: Schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
  };

  it("should validate valid data", () => {
    const validator = new TestValidator(simpleSchema);
    const result = validator.validate({ name: "Test", age: 25 });

    expect(result.isValid).to.be.true;
    expect(result.data).to.deep.equal({ name: "Test", age: 25 });
    expect(result.errors).to.be.empty;
  });

  it("should return errors for invalid data", () => {
    const validator = new TestValidator(simpleSchema);
    const result = validator.validate({ age: 25 });

    expect(result.isValid).to.be.false;
    expect(result.data).to.be.undefined;
    expect(result.errors).to.have.lengthOf(1);
    expect(result.errors[0].field).to.equal("name");
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

    const validator = new TestValidator(mainSchema, [{ ...refSchema, $id: "ref" }]);
    const result = validator.validate({ data: { type: "test" } });

    expect(result.isValid).to.be.true;
  });
});
