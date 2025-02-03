import { expect, it, describe } from "vitest";

import { isHypercertToken, getHypercertTokenId } from "../../src/utils/tokenIds";

const claimTokenId = 340282366920938463463374607431768211456n;
const fractionTokenId = 340282366920938463463374607431768211457n;

describe("isClaimTokenId", () => {
  it("should return true for a claim token id", () => {
    expect(isHypercertToken(claimTokenId)).toBe(true);
  });

  it("should return false for a non-claim token id", () => {
    expect(isHypercertToken(fractionTokenId)).toBe(false);
  });
});

describe("getClaimTokenId", () => {
  it("should return the claim token id", () => {
    expect(getHypercertTokenId(claimTokenId)).toBe(claimTokenId);
  });

  it("should return the claim token id for a fraction token id", () => {
    expect(getHypercertTokenId(fractionTokenId)).toBe(claimTokenId);
  });
});
