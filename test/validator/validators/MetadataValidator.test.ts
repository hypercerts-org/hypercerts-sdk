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

  it("should validate nested claim data", () => {
    const invalidMetadata = {
      ...validMetadata,
      hypercert: {
        ...validClaimData,
        impact_scope: undefined,
      },
    };

    const result = validator.validate(invalidMetadata);

    expect(result.isValid).to.be.false;
    expect(result.errors[0].field).to.equal("/hypercert");
    // or if we want to check the specific error message:
    expect(result.errors[0].message).to.include("impact_scope");
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
