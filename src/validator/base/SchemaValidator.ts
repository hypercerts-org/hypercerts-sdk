import { IValidator, ValidationError, ValidationResult } from "../interfaces";
import Ajv, { Schema as AjvSchema, ErrorObject } from "ajv";
import { z } from "zod";

// Base interface for all validators
export interface ISchemaValidator<T> extends IValidator<T> {
  validate(data: unknown): ValidationResult<T>;
}

// AJV-based validator
export abstract class AjvSchemaValidator<T> implements ISchemaValidator<T> {
  protected ajv: Ajv;
  protected schema: AjvSchema;

  constructor(schema: AjvSchema, additionalSchemas: AjvSchema[] = []) {
    this.ajv = new Ajv({ allErrors: true });
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

// Zod-based validator
export abstract class ZodSchemaValidator<T> implements ISchemaValidator<T> {
  protected schema: z.ZodType<T>;

  constructor(schema: z.ZodType<T>) {
    this.schema = schema;
  }

  validate(data: unknown): ValidationResult<T> {
    const result = this.schema.safeParse(data);

    if (!result.success) {
      return {
        isValid: false,
        errors: this.formatErrors(result.error),
      };
    }

    return {
      isValid: true,
      data: result.data,
      errors: [],
    };
  }

  protected formatErrors(error: z.ZodError): ValidationError[] {
    return error.issues.map((issue) => ({
      code: issue.code || "SCHEMA_VALIDATION_ERROR",
      message: issue.message,
      field: issue.path.join("."),
      details: issue,
    }));
  }
}
