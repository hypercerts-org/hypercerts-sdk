import { AllowlistEntry, HypercertClaimdata, HypercertMetadata, MintingError } from "../types";
import { ValidationError } from "./interfaces";
import { ValidatorFactory } from "./ValidatorFactory";

/**
 * Represents the result of a validation operation.
 *
 * This type is used to return the result of validating data against a schema. It includes a `valid` flag that indicates
 * whether the data is valid, and an `errors` object that contains any errors that occurred during validation.
 *
 */
type ValidationResult = {
  data: AllowlistEntry[] | HypercertClaimdata | HypercertMetadata | unknown;
  valid: boolean;
  errors: Record<string, string | string[]>;
};

/**
 * Maps new validator errors to the legacy format
 */
const mapErrors = (errors: ValidationError[]): Record<string, string | string[]> => {
  return errors.reduce(
    (acc, err) => ({
      ...acc,
      [err.field?.replace("/", "") || err.code]: err.message,
    }),
    {},
  );
};

/**
 * Validates Hypercert metadata.
 *
 * Uses the AJV library to validate the metadata against its schema. If the data does not
 * conform to the schema, it returns the validation errors.
 *
 * @param {unknown} data - The metadata to validate. Should conform to the HypercertMetadata type.
 * @returns {ValidationResult<HypercertMetadata>} Object containing validity flag, validated data, and any validation errors.
 * @deprecated use ValidatorFactory.createMetadataValidator() instead
 */
export const validateMetaData = (data: unknown): ValidationResult => {
  const result = ValidatorFactory.createMetadataValidator().validate(data);

  console.log(result.errors);
  return {
    data: result.data || data,
    valid: result.isValid,
    errors: mapErrors(result.errors),
  };
};

/**
 * Validates Hypercert claim data.
 *
 * Uses the AJV library to validate the claim data against its schema. If the data does not
 * conform to the schema, it returns the validation errors.
 *
 * @param {unknown} data - The claim data to validate. Should conform to the HypercertClaimdata type.
 * @returns {ValidationResult<HypercertClaimdata>} Object containing validity flag, validated data, and any validation errors.
 * @deprecated use ValidatorFactory.createClaimDataValidator() instead
 */
export const validateClaimData = (data: unknown): ValidationResult => {
  const result = ValidatorFactory.createClaimDataValidator().validate(data);
  return {
    data: result.data || data,
    valid: result.isValid,
    errors: mapErrors(result.errors),
  };
};

/**
 * Validates an array of allowlist entries.
 *
 * Checks that the total units match the expected total, units are greater than 0,
 * and all addresses are valid Ethereum addresses.
 *
 * @param {AllowlistEntry[]} data - The allowlist entries to validate.
 * @param {bigint} units - The expected total units in the allowlist.
 * @returns {ValidationResult<AllowlistEntry[]>} Object containing validity flag, validated data, and any validation errors.
 * @deprecated use ValidatorFactory.createAllowlistValidator() instead
 */
export const validateAllowlist = (data: AllowlistEntry[], units: bigint): ValidationResult => {
  const result = ValidatorFactory.createAllowlistValidator().validate(data, { expectedUnits: units });
  return {
    data: result.data || data,
    valid: result.isValid,
    errors: mapErrors(result.errors),
  };
};

/**
 * Verifies a Merkle proof for a given root, signer address, units, and proof.
 *
 * @param {string} root - The root of the Merkle tree.
 * @param {string} signerAddress - The signer's Ethereum address.
 * @param {bigint} units - The number of units.
 * @param {string[]} proof - The Merkle proof to verify.
 * @throws {MintingError} Will throw if the signer address is invalid or if the Merkle proof verification fails.
 * @deprecated use ValidatorFactory.createMerkleProofValidator() instead
 */
export const verifyMerkleProof = (root: string, signerAddress: string, units: bigint, proof: string[]): void => {
  const validator = ValidatorFactory.createMerkleProofValidator();
  const result = validator.validate({ root, signerAddress, units, proof });

  if (!result.isValid) {
    throw new MintingError(result.errors[0].message, { root, proof });
  }
};

/**
 * Verifies multiple Merkle proofs for given roots, a signer address, units, and proofs.
 *
 * @param {string[]} roots - The roots of the Merkle trees.
 * @param {string} signerAddress - The signer's Ethereum address.
 * @param {bigint[]} units - The numbers of units.
 * @param {string[][]} proofs - The Merkle proofs to verify.
 * @throws {MintingError} Will throw if input arrays have mismatched lengths or if any proof verification fails.
 * @deprecated use ValidatorFactory.createMerkleProofValidator() instead
 */
export const verifyMerkleProofs = (roots: string[], signerAddress: string, units: bigint[], proofs: string[][]) => {
  if (roots.length !== units.length || units.length !== proofs.length) {
    throw new MintingError("Invalid input", { roots, units, proofs });
  }

  for (let i = 0; i < roots.length; i++) {
    verifyMerkleProof(roots[i], signerAddress, units[i], proofs[i]);
  }
};

export { ValidatorFactory };
