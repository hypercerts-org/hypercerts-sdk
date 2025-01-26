import Ajv, { Schema, ErrorObject } from "ajv";
import { IValidator, ValidationError, ValidationResult } from "../interfaces";

export abstract class SchemaValidator<T> implements IValidator<T> {
  protected ajv: Ajv;
  protected schema: Schema;

  constructor(schema: Schema, additionalSchemas: Schema[] = []) {
    this.ajv = new Ajv({ allErrors: true });
    // Add any additional schemas first
    additionalSchemas.forEach((schema) => this.ajv.addSchema(schema));
    this.schema = schema;
  }

  validate(data: unknown): ValidationResult<T> {
    const validate = this.ajv.compile(this.schema);

    if (!validate(data)) {
      return {
        isValid: false,
        errors: this.formatErrors(validate.errors || []),
      };
    }

    return {
      isValid: true,
      data: data as T,
      errors: [],
    };
  }

  protected formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map((error) => ({
      code: "SCHEMA_VALIDATION_ERROR",
      message: error.message || "Unknown validation error",
      field: error.instancePath || (error.params.missingProperty as string) || "",
      details: error.params,
    }));
  }
}
