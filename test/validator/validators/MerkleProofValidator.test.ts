import { expect } from "chai";
import { MerkleProofValidator } from "../../../src/validator/validators/MerkleProofValidator";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { describe, it } from "vitest";

describe("MerkleProofValidator", () => {
  const validator = new MerkleProofValidator();
  const validAddress = "0x1234567890123456789012345678901234567890";

  // Create a real merkle tree for testing
  const values = [
    [validAddress, 1000n],
    ["0x2234567890123456789012345678901234567890", 2000n],
  ];
  const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
  const proof = tree.getProof(0); // Get proof for first entry

  it("should validate a valid merkle proof", () => {
    const result = validator.validate({
      root: tree.root,
      signerAddress: validAddress,
      units: 1000n,
      proof,
    });

    expect(result.isValid).to.be.true;
    expect(result.errors).to.be.empty;
  });

  it("should validate ethereum address", () => {
    const result = validator.validate({
      root: tree.root,
      signerAddress: "0xinvalid",
      units: 1000n,
      proof,
    });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("INVALID_ADDRESS");
  });

  it("should validate merkle proof verification", () => {
    const result = validator.validate({
      root: tree.root,
      signerAddress: validAddress,
      units: 2000n, // Wrong units
      proof,
    });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("INVALID_PROOF");
  });

  it("should handle verification errors", () => {
    const result = validator.validate({
      root: "invalid_root",
      signerAddress: validAddress,
      units: 1000n,
      proof,
    });

    expect(result.isValid).to.be.false;
    expect(result.errors[0].code).to.equal("VERIFICATION_ERROR");
  });
});
