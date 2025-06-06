/**
 * Constants
 */

import { Deployment, Environment, PeripheryContracts, SupportedChainIds } from "./types";
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

const PERIPHERY_CONTRACTS: { [key in SupportedChainIds]: PeripheryContracts } = {
  10: {
    batchTransferFraction: "0xf77e452ec289da0616574aae371800ca4d6315b1",
  },
  42220: {
    batchTransferFraction: "0xB64B7e4793D72958e028B1D5D556888b115c4c3E",
  },
  8453: {
    batchTransferFraction: "0xc4aEB039BC432343bf4dB57Be203E0540d385a18",
  },
  11155111: {
    batchTransferFraction: "0x59e07f1cc8eb8eca2703179a7217673318a0fe47",
  },
  84532: {
    batchTransferFraction: "0x3C0FaAA04078d715BB05Af82Ca99c41623AeC5Ae",
  },
  42161: {
    batchTransferFraction: "0x8b973c408c2748588b3ECFfDA06D670819FbEb1D",
  },
  421614: {
    batchTransferFraction: "0x0fCCa2bAd3103934304874E782450688B7a044B0",
  },
  314159: {},
  314: {},
};

// These are the deployments we manage
const DEPLOYMENTS: { [key in SupportedChainIds]: Deployment } = {
  10: {
    chainId: 10,
    addresses: deployments[10],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
    periphery: PERIPHERY_CONTRACTS[10],
  } as const,
  42220: {
    chainId: 42220,
    addresses: deployments[42220],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
    periphery: PERIPHERY_CONTRACTS[42220],
  },
  8453: {
    chainId: 8453,
    addresses: deployments[8453],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
    periphery: PERIPHERY_CONTRACTS[8453],
  } as const,
  11155111: {
    chainId: 11155111,
    addresses: deployments[11155111],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: true,
    periphery: PERIPHERY_CONTRACTS[11155111],
  } as const,
  84532: {
    chainId: 84532,
    addresses: deployments[84532],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: true,
    periphery: PERIPHERY_CONTRACTS[84532],
  } as const,
  42161: {
    chainId: 42161,
    addresses: deployments[42161],
    easSchemas: SUPPORTED_EAS_SCHEMAS,
    isTestnet: false,
    periphery: PERIPHERY_CONTRACTS[42161],
  } as const,
  421614: {
    chainId: 421614,
    addresses: deployments[421614],
    isTestnet: true,
    periphery: PERIPHERY_CONTRACTS[421614],
  } as const,
  314159: {
    chainId: 314159,
    addresses: deployments[314159],
    isTestnet: true,
    periphery: PERIPHERY_CONTRACTS[314159],
  } as const,
  314: {
    chainId: 314,
    addresses: deployments[314],
    isTestnet: false,
    periphery: PERIPHERY_CONTRACTS[314],
  } as const,
};

export { ENDPOINTS, DEPLOYMENTS };
