import { SupportedOverrides } from "src/types";

export const onlyProvidedContractOverrides = (overrides?: SupportedOverrides) => {
  const _overrides = {
    value: overrides?.value,
    gas: overrides?.gasLimit,
    gasPrice: overrides?.gasPrice,
  };

  return Object.fromEntries(Object.entries(_overrides).filter(([_, value]) => value !== undefined));
};
