import { ValidationError } from "../interfaces";
import { SchemaValidator } from "../base/SchemaValidator";
import { HypercertMetadata } from "src/types";
import metaDataSchema from "../../resources/schema/metadata.json";

export type PropertyValues = HypercertMetadata["properties"];
type PropertyValue = NonNullable<PropertyValues>[number];

interface PropertyValidationStrategy {
  validate(property: NonNullable<PropertyValue>): ValidationError[];
}

interface GeoJSONProperty {
  trait_type: string;
  type: string;
  src: string;
  name: string;
}

class GeoJSONValidationStrategy implements PropertyValidationStrategy {
  private readonly MIME_TYPE = "application/geo+json";

  validate(property: NonNullable<PropertyValue>): ValidationError[] {
    if (!this.isGeoJSONProperty(property)) {
      return [
        {
          field: "type",
          code: "missing_type",
          message: "GeoJSON property must have type field",
        },
      ];
    }

    const errors: ValidationError[] = [];

    if (property.type !== this.MIME_TYPE) {
      errors.push({
        field: "type",
        code: "invalid_mime_type",
        message: `GeoJSON type must be ${this.MIME_TYPE}`,
      });
    }

    if (!property.src?.startsWith("ipfs://") && !property.src?.startsWith("https://")) {
      errors.push({
        field: "src",
        code: "invalid_url",
        message: "GeoJSON src must start with ipfs:// or https://",
      });
    }

    if (!property.name?.endsWith(".geojson")) {
      errors.push({
        field: "name",
        code: "invalid_file_extension",
        message: "GeoJSON name must end with .geojson",
      });
    }

    return errors;
  }

  private isGeoJSONProperty(property: any): property is GeoJSONProperty {
    return "type" in property && "src" in property && "name" in property;
  }
}

export class PropertyValidator extends SchemaValidator<PropertyValue> {
  private readonly validationStrategies: Record<string, PropertyValidationStrategy> = {
    geoJSON: new GeoJSONValidationStrategy(),
  };

  constructor() {
    super(metaDataSchema.properties.properties.items);
  }

  validate(data: unknown) {
    const result = super.validate(data);

    if (!result.isValid || !result.data) {
      return result;
    }

    const property = result.data as NonNullable<PropertyValue>;
    const strategy = this.validationStrategies[property.trait_type];

    if (strategy) {
      const errors = strategy.validate(property);
      if (errors.length > 0) {
        return {
          isValid: false,
          data: undefined,
          errors,
        };
      }
    }

    return result;
  }
}
