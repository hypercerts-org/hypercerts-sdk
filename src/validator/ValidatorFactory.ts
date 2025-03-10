import { HypercertMetadata, HypercertClaimdata, AllowlistEntry } from "src/types";
import { IValidator } from "./interfaces";
import { MerkleProofData, MerkleProofValidator } from "./validators/MerkleProofValidator";
import { MetadataValidator, ClaimDataValidator } from "./validators/MetadataValidator";
import { AllowlistValidator } from "./validators/AllowListValidator";
import { AllowlistValidationParams } from "./validators/AllowListValidator";
import { PropertyValidator, PropertyValue } from "./validators/PropertyValidator";
import { AttestationData, AttestationValidator } from "./validators/AttestationValidator";

export class ValidatorFactory {
  static createMetadataValidator(): IValidator<HypercertMetadata> {
    return new MetadataValidator();
  }

  static createClaimDataValidator(): IValidator<HypercertClaimdata> {
    return new ClaimDataValidator();
  }

  static createAllowlistValidator(): IValidator<AllowlistEntry[], AllowlistValidationParams> {
    return new AllowlistValidator();
  }

  static createMerkleProofValidator(): IValidator<MerkleProofData> {
    return new MerkleProofValidator();
  }

  static createPropertyValidator(): IValidator<PropertyValue> {
    return new PropertyValidator();
  }

  static createAttestationValidator(): IValidator<AttestationData> {
    return new AttestationValidator();
  }
}
