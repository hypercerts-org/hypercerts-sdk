import { ValidationError, IValidator, ValidationResult } from "../interfaces";
import { AllowlistEntry } from "src/types";
import { isAddress } from "viem";

export interface AllowlistValidationParams {
  expectedUnits: bigint;
}

export class AllowlistValidator implements IValidator<AllowlistEntry[], AllowlistValidationParams> {
  validate(data: unknown, params?: AllowlistValidationParams): ValidationResult<AllowlistEntry[]> {
    if (!params?.expectedUnits) {
      return {
        isValid: false,
        errors: [
          {
            code: "MISSING_PARAMS",
            message: "Expected units parameter is required",
          },
        ],
      };
    }

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          {
            code: "INVALID_INPUT",
            message: "Input must be an array",
          },
        ],
      };
    }

    const entries = data as AllowlistEntry[];
    const errors: ValidationError[] = [];

    // Validate total units
    const totalUnits = entries.reduce((acc, curr) => acc + BigInt(curr.units.toString()), 0n);

    if (totalUnits !== params.expectedUnits) {
      errors.push({
        code: "INVALID_TOTAL_UNITS",
        message: `Total units in allowlist must match expected units`,
        details: {
          expected: params.expectedUnits.toString(),
          actual: totalUnits.toString(),
        },
      });
    }

    // Validate addresses
    const invalidAddresses = entries
      .filter((entry) => !isAddress(entry.address.toLowerCase()))
      .map((entry) => entry.address);

    if (invalidAddresses.length > 0) {
      errors.push({
        code: "INVALID_ADDRESSES",
        message: "Invalid Ethereum addresses found in allowlist",
        details: invalidAddresses,
      });
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
    };
  }
}
