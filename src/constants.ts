/**
 * Constants
 */

import { Deployment, Environment, SupportedChainIds } from "./types";
import { deployments } from "@hypercerts-org/contracts";

export const DEFAULT_ENVIRONMENT: Environment = "production";

// The APIs we expose

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ENDPOINTS: { [key: string]: string } = {
  test: "https://staging-api.hypercerts.org",
  production: "https://api.hypercerts.org",
};

const SUPPORTED_EAS_SCHEMAS: { [key: string]: { [key: string]: string | boolean } } = {
  BASIC_EVALUATION: {
    uid: "0x2f4f575d5df78ac52e8b124c4c900ec4c540f1d44f5b8825fac0af5308c91449",
    schema:
      "uint256 chain_id,address contract_address,uint256 token_id,uint8 evaluate_basic,uint8 evaluate_work,uint8 evaluate_contributors,uint8 evaluate_properties,string comments,string[] tags",
    resolver: ZERO_ADDRESS,
    revocable: true,
  },
  CREATOR_FEED: {
    uid: "0x48e3e1be1e08084b408a7035ac889f2a840b440bbf10758d14fb722831a200c3",
    schema:
      "uint256 chain_id,address contract_address,uint256 token_id,string title,string description,string[] sources",
    resolver: ZERO_ADDRESS,
    revocable: false,
  },
};

// These are the deployments we manage
const DEPLOYMENTS: { [key in SupportedChainIds]: Deployment } = {
  10: {
    chainId: 10,
    addresses: deployments[10],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
  } as const,
  42220: {
    chainId: 42220,
    addresses: deployments[42220],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
  },
  8453: {
    chainId: 8453,
    addresses: deployments[8453],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
  } as const,
  11155111: {
    chainId: 11155111,
    addresses: deployments[11155111],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: true,
  } as const,
  84532: {
    chainId: 84532,
    addresses: deployments[84532],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: true,
  } as const,
  42161: {
    chainId: 42161,
    addresses: deployments[42161],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
  } as const,
  421614: {
    chainId: 421614,
    addresses: deployments[421614],
    isTestnet: true,
  } as const,
  314159: {
    chainId: 314159,
    addresses: deployments[314159],
    isTestnet: true,
  } as const,
  314: {
    chainId: 314,
    addresses: deployments[314],
    isTestnet: false,
  } as const,
};

export { ENDPOINTS, DEPLOYMENTS };
