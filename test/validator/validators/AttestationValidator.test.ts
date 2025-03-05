import { describe, it, expect } from "vitest";
import { AttestationValidator } from "../../../src/validator/validators/AttestationValidator";
import { DEPLOYMENTS } from "../../../src/constants";

describe("AttestationValidator", () => {
  const validator = new AttestationValidator();
  const validChainId = Object.keys(DEPLOYMENTS)[0];
  const validAddress = Object.values(DEPLOYMENTS[Number(validChainId) as keyof typeof DEPLOYMENTS].addresses)[0];
  // Using a valid hypercert token ID format
  const validTokenId = BigInt("340282366920938463463374607431768211456");

  describe("valid cases", () => {
    it("accepts valid attestation with number chain_id", () => {
      const result = validator.validate({
        chain_id: Number(validChainId),
        contract_address: validAddress,
        token_id: validTokenId,
      });
      expect(result.isValid).toBe(true);
    });

    it("accepts valid attestation with string chain_id", () => {
      const result = validator.validate({
        chain_id: validChainId,
        contract_address: validAddress,
        token_id: validTokenId,
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects valid attestation with hex string token_id", () => {
      const result = validator.validate({
        chain_id: validChainId,
        contract_address: validAddress,
        token_id: "0x9c09000000000000000000000000000000",
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe("invalid cases", () => {
    describe("chain_id validation", () => {
      it("rejects non-numeric chain_id", () => {
        const result = validator.validate({
          chain_id: "abc",
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("chain_id");
      });

      it("rejects unknown chain_id", () => {
        const result = validator.validate({
          chain_id: "999999",
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].code).toBe("INVALID_CHAIN_ID");
      });
    });

    describe("contract_address validation", () => {
      it("rejects invalid address format", () => {
        const result = validator.validate({
          chain_id: validChainId,
          contract_address: "not-an-address",
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("contract_address");
      });

      it("rejects unknown contract address", () => {
        const result = validator.validate({
          chain_id: validChainId,
          contract_address: "0x1234567890123456789012345678901234567890",
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].code).toBe("INVALID_CONTRACT_ADDRESS");
      });
    });

    describe("token_id validation", () => {
      it("rejects non-hypercert token_id", () => {
        const result = validator.validate({
          chain_id: validChainId,
          contract_address: validAddress,
          token_id: "123",
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].code).toBe("INVALID_TOKEN_ID");
      });

      it("rejects non-numeric token_id", () => {
        const result = validator.validate({
          chain_id: validChainId,
          contract_address: validAddress,
          token_id: "340282366920938463463374607431768211457",
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("token_id");
      });
    });

    describe("missing fields", () => {
      it("rejects missing chain_id", () => {
        const result = validator.validate({
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("chain_id");
      });

      it("rejects missing contract_address", () => {
        const result = validator.validate({
          chain_id: validChainId,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("contract_address");
      });

      it("rejects missing token_id", () => {
        const result = validator.validate({
          chain_id: validChainId,
          contract_address: validAddress,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0].field).toBe("token_id");
      });
    });

    describe("type coercion edge cases", () => {
      it("rejects null values", () => {
        const result = validator.validate({
          chain_id: null,
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
      });

      it("rejects undefined values", () => {
        const result = validator.validate({
          chain_id: undefined,
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
      });

      it("rejects object values", () => {
        const result = validator.validate({
          chain_id: {},
          contract_address: validAddress,
          token_id: validTokenId,
        });
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("Additional fields", () => {
    const validData = {
      chain_id: 10,
      contract_address: "0x822F17A9A5EeCFd66dBAFf7946a8071C265D1d07",
      token_id: BigInt("340282366920938463463374607431768211456"),
      tags: ["Zuzalu 2023"],
      comments: "",
      evaluate_work: 1,
      evaluate_basic: 1,
      evaluate_properties: 1,
      evaluate_contributors: 1,
    };

    it("should accept data with additional fields", () => {
      const result = validator.validate(validData);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        ...validData,
        chain_id: BigInt(validData.chain_id),
      });
    });
  });
});
