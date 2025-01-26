import { HypercertClaimdata, HypercertMetadata } from "src/types/metadata";
import { SchemaValidator } from "../base/SchemaValidator";
import claimDataSchema from "../../resources/schema/claimdata.json";
import metaDataSchema from "../../resources/schema/metadata.json";

export class MetadataValidator extends SchemaValidator<HypercertMetadata> {
  constructor() {
    super(metaDataSchema, [claimDataSchema]);
  }
}

export class ClaimDataValidator extends SchemaValidator<HypercertClaimdata> {
  constructor() {
    super(claimDataSchema);
  }
}
