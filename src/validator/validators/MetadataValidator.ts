import { HypercertClaimdata, HypercertMetadata } from "src/types/metadata";
import { AjvSchemaValidator } from "../base/SchemaValidator";
import claimDataSchema from "../../resources/schema/claimdata.json";
import metaDataSchema from "../../resources/schema/metadata.json";
import { PropertyValidator } from "./PropertyValidator";

export class MetadataValidator extends AjvSchemaValidator<HypercertMetadata> {
  private propertyValidator: PropertyValidator;

  constructor() {
    super(metaDataSchema, [claimDataSchema]);
    this.propertyValidator = new PropertyValidator();
  }

  validate(data: unknown) {
    const result = super.validate(data);
    const errors = [...(result.errors || [])];

    if (data) {
      const metadata = data as HypercertMetadata;
      if (metadata.properties?.length) {
        const propertyErrors = metadata.properties
          .map((property) => this.propertyValidator.validate(property))
          .filter((result) => !result.isValid)
          .flatMap((result) => result.errors);

        errors.push(...propertyErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? result.data : undefined,
      errors,
    };
  }
}

export class ClaimDataValidator extends AjvSchemaValidator<HypercertClaimdata> {
  constructor() {
    super(claimDataSchema);
  }
}
