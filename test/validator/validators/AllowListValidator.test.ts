import { expect } from "chai";
import { AllowlistValidator } from "../../../src/validator/validators/AllowListValidator";
import { AllowlistEntry } from "../../../src/types";
import { describe, it } from "vitest";

describe("AllowlistValidator", () => {
  const validator = new AllowlistValidator();

  const validAddress = "0x1234567890123456789012345678901234567890";
  const invalidAddress = "0xinvalid";

  it("should validate a valid allowlist", () => {
    const allowlist: AllowlistEntry[] = [
      { address: validAddress, units: 500n },
      { address: "0x2234567890123456789012345678901234567890", units: 500n },
    ];

    const result = validator.validate(allowlist, { expectedUnits: 1000n });

    expect(result.isValid).to.be.true;
    expect(result.data).to.deep.equal(allowlist);
    expect(result.errors).to.be.empty;
  });

  it("should require expectedUnits parameter", () => {
    const allowlist: AllowlistEntry[] = [{ address: validAddress, units: 1000n }];

    const result = validator.validate(allowlist);

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("MISSING_PARAMS");
  });

  it("should validate total units match expected units", () => {
    const allowlist: AllowlistEntry[] = [{ address: validAddress, units: 500n }];

    const result = validator.validate(allowlist, { expectedUnits: 1000n });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("INVALID_TOTAL_UNITS");
  });

  it("should validate ethereum addresses", () => {
    const allowlist: AllowlistEntry[] = [
      { address: invalidAddress, units: 500n },
      { address: validAddress, units: 500n },
    ];

    const result = validator.validate(allowlist, { expectedUnits: 1000n });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("INVALID_ADDRESSES");
    expect(result.errors[0].details).to.include(invalidAddress);
  });

  it("should validate input is an array", () => {
    const result = validator.validate({}, { expectedUnits: 1000n });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("INVALID_INPUT");
  });
});
