import { expect } from "chai";
import { MetadataValidator, ClaimDataValidator } from "../../../src/validator/validators/MetadataValidator";
import { HypercertMetadata, HypercertClaimdata } from "../../../src/types";
import { describe, it } from "vitest";

describe("MetadataValidator", () => {
  const validator = new MetadataValidator();

  const validClaimData: HypercertClaimdata = {
    impact_scope: {
      name: "Impact Scope",
      value: ["global"],
      display_value: "Global",
    },
    work_scope: {
      name: "Work Scope",
      value: ["research"],
      display_value: "Research",
    },
    work_timeframe: {
      name: "Work Timeframe",
      value: [1672531200, 1704067200], // 2023
      display_value: "2023",
    },
    impact_timeframe: {
      name: "Impact Timeframe",
      value: [1672531200, 1704067200], // 2023
      display_value: "2023",
    },
    contributors: {
      name: "Contributors",
      value: ["0x1234567890123456789012345678901234567890"],
      display_value: "Contributor 1",
    },
  };

  const validMetadata: HypercertMetadata = {
    name: "Test Hypercert",
    description: "Test Description",
    image: "ipfs://test",
    version: "0.0.1",
    ref: "ref",
    hypercert: validClaimData,
  };

  describe("Basic Metadata Validation", () => {
    it("should validate valid metadata", () => {
      const result = validator.validate(validMetadata);
      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal(validMetadata);
      expect(result.errors).to.be.empty;
    });

    it("should validate required fields", () => {
      const invalidMetadata = {
        description: "Test Description",
        image: "ipfs://test",
      };

      const result = validator.validate(invalidMetadata);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].field).to.equal("name");
    });
  });

  describe("Property Validation", () => {
    it("should validate metadata with valid properties", () => {
      const metadataWithProperties = {
        ...validMetadata,
        properties: [
          {
            trait_type: "category",
            value: "education",
          },
          {
            trait_type: "geoJSON",
            type: "applications/geo+json",
            src: "ipfs://QmExample",
            name: "location.geojson",
          },
        ],
      };

      const result = validator.validate(metadataWithProperties);
      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal(metadataWithProperties);
    });

    it("should reject metadata with invalid simple property", () => {
      const metadataWithInvalidProperty = {
        ...validMetadata,
        properties: [
          {
            trait_type: "category",
            // missing required 'value' field
          },
        ],
      };

      const result = validator.validate(metadataWithInvalidProperty);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length.greaterThan(0);
    });

    it("should reject metadata with invalid geoJSON property", () => {
      const metadataWithInvalidGeoJSON = {
        ...validMetadata,
        properties: [
          {
            trait_type: "geoJSON",
            type: "wrong/type",
            src: "invalid://QmExample",
            name: "location.wrong",
          },
        ],
      };

      const result = validator.validate(metadataWithInvalidGeoJSON);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(3); // MIME type, URL, and file extension errors
    });

    it("should collect all property validation errors", () => {
      const metadataWithMultipleInvalidProperties = {
        ...validMetadata,
        properties: [
          {
            trait_type: "category",
            // missing value
          },
          {
            trait_type: "geoJSON",
            type: "wrong/type",
            src: "invalid://QmExample",
            name: "location.wrong",
          },
        ],
      };

      const result = validator.validate(metadataWithMultipleInvalidProperties);
      expect(result.isValid).to.be.false;
      expect(result.errors.length).to.be.greaterThan(3); // Schema error plus GeoJSON errors
    });

    it("should handle empty properties array", () => {
      const metadataWithEmptyProperties = {
        ...validMetadata,
        properties: [],
      };

      const result = validator.validate(metadataWithEmptyProperties);
      expect(result.isValid).to.be.true;
    });
  });

  describe("Combined Validation", () => {
    it("should validate metadata with both valid properties and claim data", () => {
      const completeMetadata = {
        ...validMetadata,
        properties: [
          {
            trait_type: "category",
            value: "education",
          },
          {
            trait_type: "geoJSON",
            type: "applications/geo+json",
            src: "ipfs://QmExample",
            name: "location.geojson",
          },
        ],
      };

      const result = validator.validate(completeMetadata);
      expect(result.isValid).to.be.true;
      expect(result.data).to.deep.equal(completeMetadata);
    });

    it("should collect errors from both metadata and property validation", () => {
      const invalidMetadata = {
        description: "Test Description", // missing required name
        image: "ipfs://test",
        properties: [
          {
            trait_type: "geoJSON",
            type: "wrong/type",
            src: "invalid://QmExample",
            name: "location.wrong",
          },
        ],
      };

      const result = validator.validate(invalidMetadata);

      console.log(result.errors);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length.greaterThan(3); // Schema errors plus property errors
    });
  });
});

describe("ClaimDataValidator", () => {
  const validator = new ClaimDataValidator();

  const validClaimData: HypercertClaimdata = {
    impact_scope: {
      name: "Impact Scope",
      value: ["global"],
      display_value: "Global",
    },
    work_scope: {
      name: "Work Scope",
      value: ["research"],
      display_value: "Research",
    },
    work_timeframe: {
      name: "Work Timeframe",
      value: [1672531200, 1704067200], // 2023
      display_value: "2023",
    },
    impact_timeframe: {
      name: "Impact Timeframe",
      value: [1672531200, 1704067200], // 2023
      display_value: "2023",
    },
    contributors: {
      name: "Contributors",
      value: ["0x1234567890123456789012345678901234567890"],
      display_value: "Contributor 1",
    },
  };

  it("should validate valid claim data", () => {
    const result = validator.validate(validClaimData);

    expect(result.isValid).to.be.true;
    expect(result.data).to.deep.equal(validClaimData);
    expect(result.errors).to.be.empty;
  });

  it("should validate required fields", () => {
    const invalidClaimData = {
      impact_scope: validClaimData.impact_scope,
      work_scope: validClaimData.work_scope,
      // missing required fields
    };

    const result = validator.validate(invalidClaimData);

    expect(result.isValid).to.be.false;
    expect(result.errors).to.have.length.greaterThan(0);
  });

  it("should validate array values", () => {
    const invalidClaimData = {
      ...validClaimData,
      impact_scope: {
        ...validClaimData.impact_scope,
        value: "not an array", // should be an array
      },
    };

    const result = validator.validate(invalidClaimData);

    expect(result.isValid).to.be.false;
    expect(result.errors[0].field).to.include("impact_scope");
  });
});
