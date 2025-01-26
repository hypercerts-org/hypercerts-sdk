import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { IValidator, ValidationError, ValidationResult } from "../interfaces";
import { isAddress } from "viem";

export interface MerkleProofData {
  root: string;
  signerAddress: string;
  units: bigint;
  proof: string[];
}

export class MerkleProofValidator implements IValidator<MerkleProofData> {
  validate(data: unknown): ValidationResult<MerkleProofData> {
    const proofData = data as MerkleProofData;
    const errors: ValidationError[] = [];

    if (!isAddress(proofData.signerAddress)) {
      errors.push({
        code: "INVALID_ADDRESS",
        message: "Invalid signer address",
      });
    }

    try {
      const verified = StandardMerkleTree.verify(
        proofData.root,
        ["address", "uint256"],
        [proofData.signerAddress, proofData.units],
        proofData.proof,
      );

      if (!verified) {
        errors.push({
          code: "INVALID_PROOF",
          message: "Merkle proof verification failed",
        });
      }
    } catch (error) {
      errors.push({
        code: "VERIFICATION_ERROR",
        message: "Error during verification",
        details: error,
      });
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? proofData : undefined,
      errors,
    };
  }
}
