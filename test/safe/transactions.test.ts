import { describe, it, beforeEach } from "vitest";
import { encodeFunctionData } from "viem";
import { faker } from "@faker-js/faker";
import { HypercertMinterAbi } from "@hypercerts-org/contracts";
import assertionsCount from "chai-assertions-count";
import chai, { expect } from "chai";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import sinon from "sinon";

import { ClientError, SafeTransactionError } from "../../src/types";
import { SafeTransactions } from "../../src/safe/SafeTransactions";
import { walletClient } from "../helpers";

chai.use(assertionsCount);

describe("SafeTransactions", () => {
  const safeAddress = faker.finance.ethereumAddress();
  const contractAddress = faker.finance.ethereumAddress();
  const senderAddress = walletClient.account?.address;
  const mockTxHash = faker.string.hexadecimal({ length: 64 }) as `0x${string}`;
  const mockSignature = faker.string.hexadecimal({ length: 130 }) as `0x${string}`;

  let safeApiKitStub: any;
  let connectedSafeStub: any;
  let safeProtocolKitStub: any;
  let safeTransactions: SafeTransactions;

  beforeEach(() => {
    sinon.restore();
    chai.Assertion.resetAssertsCheck();

    connectedSafeStub = createConnectedSafeStub(contractAddress, mockTxHash, mockSignature);
    safeProtocolKitStub = createSafeProtocolKitStub(connectedSafeStub);
    safeApiKitStub = createSafeApiKitStub();

    safeTransactions = new SafeTransactions(safeAddress, walletClient, {
      address: contractAddress,
      abi: HypercertMinterAbi,
    } as any);
  });

  describe("sendTransaction", () => {
    const validParams = [senderAddress, 1000n, "0xcid", 0];

    it("correctly encodes function data for transaction", async () => {
      const functionName = "mintClaim";

      const expectedData = encodeFunctionData({
        abi: HypercertMinterAbi,
        functionName,
        args: validParams,
      });

      await safeTransactions.sendTransaction(functionName, validParams, {
        safeAddress,
      });

      expect(connectedSafeStub.createTransaction.getCall(0).args[0]).to.deep.include({
        transactions: [
          {
            to: contractAddress,
            data: expectedData,
            value: "0",
          },
        ],
      });
    });

    it("uses correct nonce from API", async () => {
      safeApiKitStub.getNextNonce.resolves("42");

      await safeTransactions.sendTransaction("mintClaim", validParams, {
        safeAddress,
      });

      expect(connectedSafeStub.createTransaction.getCall(0).args[0].options).to.deep.include({ nonce: Number("42") });
    });
  });

  describe("performSafeTransactions", () => {
    const validParams = [senderAddress, 1000n, "0xcid", 0];

    it("throws error when no sender address available", async () => {
      chai.Assertion.expectAssertions(2);

      const invalidWalletClient = { ...walletClient, account: undefined };
      safeTransactions = new SafeTransactions(
        safeAddress,
        invalidWalletClient as any,
        {
          address: contractAddress,
          abi: HypercertMinterAbi,
        } as any,
      );

      try {
        await safeTransactions.sendTransaction("mintClaim", validParams, { safeAddress });
        expect.fail("Should throw ClientError");
      } catch (e) {
        expect(e).to.be.instanceOf(ClientError);
        expect((e as ClientError).message).to.eq("No sender address");
      }
    });

    it("follows complete transaction flow", async () => {
      const hash = await safeTransactions.sendTransaction("mintClaim", validParams, {
        safeAddress,
      });

      expect(safeApiKitStub.getNextNonce.callCount).to.eq(1);
      expect(connectedSafeStub.createTransaction.callCount).to.eq(1);
      expect(connectedSafeStub.getTransactionHash.callCount).to.eq(1);
      expect(connectedSafeStub.signHash.callCount).to.eq(1);
      expect(safeApiKitStub.proposeTransaction.callCount).to.eq(1);
      expect(hash).to.eq(mockTxHash);
    });

    it("properly handles Safe API errors", async () => {
      chai.Assertion.expectAssertions(3);

      const errorMessage = "API Connection Failed";
      safeApiKitStub.proposeTransaction.rejects(new Error(errorMessage));

      try {
        await safeTransactions.sendTransaction("mintClaim", validParams, { safeAddress });
        expect.fail("Should throw SafeTransactionError");
      } catch (e) {
        expect(e).to.be.instanceOf(SafeTransactionError);
        expect((e as SafeTransactionError).message).to.eq(errorMessage);
        expect((e as SafeTransactionError).payload).to.deep.include({
          safeAddress,
          senderAddress,
        });
      }
    });

    it("properly handles Safe Protocol Kit errors", async () => {
      chai.Assertion.expectAssertions(3);

      const errorMessage = "Failed to create transaction";
      connectedSafeStub.createTransaction.rejects(new Error(errorMessage));

      try {
        await safeTransactions.sendTransaction("mintClaim", [senderAddress, 1000n, "0xcid", 0], { safeAddress });
        expect.fail("Should throw SafeTransactionError");
      } catch (e) {
        expect(e).to.be.instanceOf(SafeTransactionError);
        expect((e as SafeTransactionError).message).to.eq(errorMessage);
        expect((e as SafeTransactionError).payload).to.deep.include({
          safeAddress,
          senderAddress,
        });
      }
    });

    it("properly proposes transaction with correct parameters", async () => {
      await safeTransactions.sendTransaction("mintClaim", [senderAddress, 1000n, "0xcid", 0], { safeAddress });

      const proposeCall = safeApiKitStub.proposeTransaction.getCall(0);
      expect(proposeCall.args[0]).to.deep.include({
        safeAddress,
        safeTransactionData: {
          to: contractAddress,
          value: "0",
          data: "0xmockdata",
        },
        safeTxHash: mockTxHash,
        senderAddress,
        senderSignature: mockSignature,
      });
    });
  });
});

function createConnectedSafeStub(contractAddress: string, mockTxHash: `0x${string}`, mockSignature: `0x${string}`) {
  return {
    createTransaction: sinon.stub().resolves({
      data: {
        to: contractAddress,
        value: "0",
        data: "0xmockdata",
      },
    }),
    getTransactionHash: sinon.stub().resolves(mockTxHash),
    signHash: sinon.stub().resolves({ data: mockSignature }),
  };
}

function createSafeProtocolKitStub(connectedSafe: any) {
  const protocolKitStub = {
    connect: sinon.stub().resolves(connectedSafe),
  };

  const SafeMock = {
    init: sinon.stub().resolves(protocolKitStub),
  };
  (Safe as any).default = SafeMock;

  return protocolKitStub;
}

function createSafeApiKitStub() {
  const apiKitStub = {
    getNextNonce: sinon.stub().resolves("1"),
    proposeTransaction: sinon.stub().resolves(),
  };

  const MockSafeApiKit = sinon.stub().returns(apiKitStub);
  // @ts-expect-error - Property 'default' does not exist on type 'SinonStub<any[], any>'.
  MockSafeApiKit.default = MockSafeApiKit;
  (SafeApiKit as any).default = MockSafeApiKit;

  return apiKitStub;
}
