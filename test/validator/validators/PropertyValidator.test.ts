import { expect } from "chai";
import { describe, it } from "vitest";
import { PropertyValidator } from "../../../src/validator/validators/PropertyValidator";

describe("PropertyValidator", () => {
  const validator = new PropertyValidator();

  describe("Basic Property Validation", () => {
    it("should validate a simple property with trait_type and value", () => {
      const property = {
        trait_type: "category",
        value: "education",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal(property);
    });

    it("should reject property with missing required fields", () => {
      const property = {
        trait_type: "category",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length.greaterThan(0);
    });
  });

  describe("GeoJSON Property Validation", () => {
    it("should validate a valid geoJSON property", () => {
      const property = {
        trait_type: "geoJSON",
        type: "applications/geo+json",
        src: "ipfs://QmExample",
        name: "location.geojson",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal(property);
    });

    it("should accept HTTPS source", () => {
      const property = {
        trait_type: "geoJSON",
        type: "applications/geo+json",
        src: "https://example.com/location.geojson",
        name: "location.geojson",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.true;
    });

    it("should reject invalid MIME type", () => {
      const property = {
        trait_type: "geoJSON",
        type: "wrong/type",
        src: "ipfs://QmExample",
        name: "location.geojson",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.deep.include({
        field: "type",
        code: "invalid_mime_type",
        message: "GeoJSON type must be applications/geo+json",
      });
    });

    it("should reject invalid source URL", () => {
      const property = {
        trait_type: "geoJSON",
        type: "applications/geo+json",
        src: "invalid://QmExample",
        name: "location.geojson",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.deep.include({
        field: "src",
        code: "invalid_url",
        message: "GeoJSON src must start with ipfs:// or https://",
      });
    });

    it("should reject invalid file extension", () => {
      const property = {
        trait_type: "geoJSON",
        type: "applications/geo+json",
        src: "ipfs://QmExample",
        name: "location.wrong",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.deep.include({
        field: "name",
        code: "invalid_file_extension",
        message: "GeoJSON name must end with .geojson",
      });
    });

    it("should collect multiple validation errors", () => {
      const property = {
        trait_type: "geoJSON",
        type: "wrong/type",
        src: "invalid://QmExample",
        name: "location.wrong",
      };

      const result = validator.validate(property);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined input", () => {
      const result = validator.validate(undefined);
      expect(result.isValid).to.be.false;
    });

    it("should handle null input", () => {
      const result = validator.validate(null);
      expect(result.isValid).to.be.false;
    });

    it("should handle empty object", () => {
      const result = validator.validate({});
      expect(result.isValid).to.be.false;
    });
  });
});
