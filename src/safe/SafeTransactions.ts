import { GetContractReturnType, WalletClient, encodeFunctionData } from "viem";
import { HypercertMinterAbi } from "@hypercerts-org/contracts";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";

import { ClientError, ContractOverrides, SafeTransactionError, SupportedOverrides } from "src/types";
import { onlyProvidedContractOverrides } from "src/utils/overrides";

type SafeTx = {
  to: string;
  data: string;
  value: string;
};

// The expect error statements are due to the fact that the SDKs are CommonJS modules.
export class SafeTransactions {
  private readonly apiKit: SafeApiKit;

  constructor(
    private safeAddress: string,
    private walletClient: WalletClient,
    private contract: GetContractReturnType<typeof HypercertMinterAbi>,
  ) {
    if (!walletClient.chain?.id) {
      throw new Error("No chain ID found in wallet client");
    }
    // @ts-expect-error Property 'default' does not exist on type 'typeof SafeApiKit'
    this.apiKit = new SafeApiKit.default({
      chainId: BigInt(walletClient.chain.id),
    });
  }

  public sendTransaction = (
    functionName: string,
    params: unknown[],
    overrides?: SupportedOverrides,
  ): Promise<`0x${string}`> => {
    const transactions = [
      {
        to: this.contract.address,
        data: encodeFunctionData({
          abi: this.contract.abi,
          functionName,
          args: params,
        }),
        value: "0",
      },
    ];

    return this.performSafeTransactions(this.safeAddress, transactions, onlyProvidedContractOverrides(overrides));
  };

  private performSafeTransactions = async (
    safeAddress: string,
    transactions: SafeTx[],
    overrides?: ContractOverrides,
  ): Promise<`0x${string}`> => {
    const senderAddress = this.walletClient.account?.address;
    if (!senderAddress) {
      throw new ClientError("No sender address");
    }

    try {
      // @ts-expect-error Property 'default' does not exist on type 'typeof Safe'
      const protocolKit = await Safe.default.init({
        provider: this.walletClient as any,
        safeAddress: safeAddress,
      });
      const connected = await protocolKit.connect(this.walletClient as any);

      const nonceString = await this.apiKit.getNextNonce(safeAddress);
      const safeTx = await connected.createTransaction({
        transactions,
        options: {
          nonce: Number(nonceString),
          ...onlyProvidedContractOverrides(overrides),
        },
      });
      const safeTxHash = await connected.getTransactionHash(safeTx);
      const senderSignature = await connected.signHash(safeTxHash);

      await this.apiKit.proposeTransaction({
        safeAddress,
        safeTransactionData: safeTx.data,
        safeTxHash,
        senderAddress,
        senderSignature: senderSignature.data,
      });

      return safeTxHash as `0x${string}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Safe transaction failed";
      const errorPayload = { safeAddress, senderAddress, transactions };
      throw new SafeTransactionError(errorMessage, errorPayload);
    }
  };
}
