import { describe, it } from "vitest";

import { expect } from "chai";

import type { HypercertClaimdata, HypercertMetadata } from "../src";
import { validateClaimData, validateMetaData } from "../src";
import { mockDataSets } from "./helpers";

describe("Validate claim test", () => {
  const { hypercertData, hypercertMetadata } = mockDataSets;
  it("checking default metadata", (): void => {
    const result = validateMetaData(hypercertMetadata.data);
    console.log(result);
    expect(result.valid).to.be.true;

    const invalidResult = validateMetaData({} as HypercertMetadata);

    expect(invalidResult.valid).to.be.false;
    expect(Object.keys(invalidResult.errors).length).to.be.gt(0);
  });

  it("checking default claimdata", () => {
    const result = validateClaimData(hypercertData.data);
    expect(result.valid).to.be.true;

    const invalidResult = validateClaimData({} as HypercertClaimdata);

    expect(invalidResult.valid).to.be.false;
    expect(Object.keys(invalidResult.errors).length).to.be.gt(0);
  });
});
