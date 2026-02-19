import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import type { BlobOperations } from "../../src/repository/interfaces.js";
import type { CreateAcknowledgementParams } from "../../src/services/hypercerts/types.js";
import { createMockAgent, createMockBlobOperations, TEST_REPO_DID } from "../utils/mocks.js";

// Mock the validate function from lexicon package
vi.mock("@hypercerts-org/lexicon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hypercerts-org/lexicon")>();
  return {
    ...actual,
    validate: vi.fn(() => ({ success: true })),
  };
});

const ACKNOWLEDGEMENT_NSID = "org.hypercerts.acknowledgement";
const TEST_SUBJECT_URI = "at://did:plc:test/org.hypercerts.claim.activity/abc123";
const TEST_SUBJECT_CID = "bafkreisubjectcid";
const TEST_CONTEXT_URI = "at://did:plc:test/org.hypercerts.claim.collection/col123";
const TEST_CONTEXT_CID = "bafkreicontextcid";
const TEST_ACK_URI = `at://did:plc:test/${ACKNOWLEDGEMENT_NSID}/ack123`;
const TEST_ACK_CID = "bafkreiackncid";

const validAckParams: CreateAcknowledgementParams = {
  subject: { $type: "com.atproto.repo.strongRef", uri: TEST_SUBJECT_URI, cid: TEST_SUBJECT_CID },
  context: { $type: "com.atproto.repo.strongRef", uri: TEST_CONTEXT_URI, cid: TEST_CONTEXT_CID },
  acknowledged: true,
  comment: "Confirmed participation.",
};

describe("AcknowledgementOperations", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let mockBlobs: ReturnType<typeof createMockBlobOperations>;
  let hypercertOps: HypercertOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    mockBlobs = createMockBlobOperations(vi);
    hypercertOps = new HypercertOperationsImpl(
      mockAgent as unknown as Agent,
      TEST_REPO_DID,
      mockBlobs as BlobOperations,
    );
  });

  // ---------------------------------------------------------------------------
  // createAcknowledgement
  // ---------------------------------------------------------------------------

  describe("createAcknowledgement", () => {
    it("should create an acknowledgement record successfully", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      const result = await hypercertOps.createAcknowledgement(validAckParams);

      expect(result.uri).toBe(TEST_ACK_URI);
      expect(result.cid).toBe(TEST_ACK_CID);
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(1);
    });

    it("should auto-populate $type if omitted", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      const params: CreateAcknowledgementParams = {
        subject: validAckParams.subject,
        context: validAckParams.context,
        acknowledged: true,
        // $type intentionally omitted
      };

      await hypercertOps.createAcknowledgement(params);

      const callArgs = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(callArgs.record.$type).toBe(ACKNOWLEDGEMENT_NSID);
    });

    it("should auto-populate createdAt if omitted", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      const params: CreateAcknowledgementParams = {
        subject: validAckParams.subject,
        context: validAckParams.context,
        acknowledged: false,
        // createdAt intentionally omitted
      };

      const before = new Date().toISOString();
      await hypercertOps.createAcknowledgement(params);
      const after = new Date().toISOString();

      const callArgs = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(callArgs.record.createdAt).toBeDefined();
      expect(callArgs.record.createdAt >= before).toBe(true);
      expect(callArgs.record.createdAt <= after).toBe(true);
    });

    it("should preserve provided createdAt", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      const customCreatedAt = "2024-01-15T12:00:00.000Z";
      await hypercertOps.createAcknowledgement({
        ...validAckParams,
        createdAt: customCreatedAt,
      });

      const callArgs = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(callArgs.record.createdAt).toBe(customCreatedAt);
    });

    it("should create acknowledgement with collection correct NSID", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      await hypercertOps.createAcknowledgement(validAckParams);

      const callArgs = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(callArgs.collection).toBe(ACKNOWLEDGEMENT_NSID);
      expect(callArgs.repo).toBe(TEST_REPO_DID);
    });

    it("should include optional comment in the record", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID },
      });

      await hypercertOps.createAcknowledgement({
        ...validAckParams,
        comment: "My comment",
      });

      const callArgs = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(callArgs.record.comment).toBe("My comment");
    });

    it("should throw NetworkError when createRecord fails", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({ success: false });

      await expect(hypercertOps.createAcknowledgement(validAckParams)).rejects.toThrow(NetworkError);
    });

    it("should throw ValidationError when validation fails", async () => {
      const { validate } = await import("@hypercerts-org/lexicon");
      vi.mocked(validate).mockReturnValueOnce({
        success: false,
        error: new Error("validation failed") as import("@atproto/lexicon").ValidationError,
      });

      await expect(hypercertOps.createAcknowledgement(validAckParams)).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // getAcknowledgement
  // ---------------------------------------------------------------------------

  describe("getAcknowledgement", () => {
    const mockAckRecord = {
      $type: ACKNOWLEDGEMENT_NSID,
      subject: { $type: "com.atproto.repo.strongRef", uri: TEST_SUBJECT_URI, cid: TEST_SUBJECT_CID },
      context: { $type: "com.atproto.repo.strongRef", uri: TEST_CONTEXT_URI, cid: TEST_CONTEXT_CID },
      acknowledged: true,
      comment: "Confirmed.",
      createdAt: "2024-01-15T12:00:00.000Z",
    };

    it("should return the acknowledgement record when found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID, value: mockAckRecord },
      });

      const result = await hypercertOps.getAcknowledgement(TEST_ACK_URI);

      expect(result).not.toBeNull();
      expect(result?.acknowledged).toBe(true);
      expect(result?.comment).toBe("Confirmed.");
    });

    it("should return null when the record is not found (NetworkError)", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({ success: false });

      const result = await hypercertOps.getAcknowledgement(TEST_ACK_URI);

      expect(result).toBeNull();
    });

    it("should throw ValidationError for an invalid URI format", async () => {
      await expect(hypercertOps.getAcknowledgement("not-a-valid-uri")).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // updateAcknowledgement
  // ---------------------------------------------------------------------------

  describe("updateAcknowledgement", () => {
    const existingRecord = {
      $type: ACKNOWLEDGEMENT_NSID,
      subject: { $type: "com.atproto.repo.strongRef", uri: TEST_SUBJECT_URI, cid: TEST_SUBJECT_CID },
      context: { $type: "com.atproto.repo.strongRef", uri: TEST_CONTEXT_URI, cid: TEST_CONTEXT_CID },
      acknowledged: false,
      comment: "Initially rejected.",
      createdAt: "2024-01-15T12:00:00.000Z",
    };

    it("should update the acknowledgement field", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID, value: existingRecord },
      });
      mockAgent.com.atproto.repo.putRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: "new-cid" },
      });

      const result = await hypercertOps.updateAcknowledgement(TEST_ACK_URI, {
        acknowledged: true,
        comment: "Changed to acknowledged.",
      });

      expect(result.uri).toBe(TEST_ACK_URI);

      const putArgs = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putArgs.record.acknowledged).toBe(true);
      expect(putArgs.record.comment).toBe("Changed to acknowledged.");
    });

    it("should preserve immutable fields (subject, context, createdAt) during update", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID, value: existingRecord },
      });
      mockAgent.com.atproto.repo.putRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: "new-cid" },
      });

      await hypercertOps.updateAcknowledgement(TEST_ACK_URI, {
        acknowledged: true,
      });

      const putArgs = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putArgs.record.createdAt).toBe("2024-01-15T12:00:00.000Z");
      expect(putArgs.record.subject.uri).toBe(TEST_SUBJECT_URI);
      expect(putArgs.record.context.uri).toBe(TEST_CONTEXT_URI);
    });

    it("should throw NetworkError when update fails", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: TEST_ACK_URI, cid: TEST_ACK_CID, value: existingRecord },
      });
      mockAgent.com.atproto.repo.putRecord.mockResolvedValueOnce({ success: false });

      await expect(hypercertOps.updateAcknowledgement(TEST_ACK_URI, { acknowledged: true })).rejects.toThrow(
        NetworkError,
      );
    });

    it("should throw ValidationError for invalid URI", async () => {
      await expect(hypercertOps.updateAcknowledgement("bad-uri", {})).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteAcknowledgement
  // ---------------------------------------------------------------------------

  describe("deleteAcknowledgement", () => {
    it("should delete the acknowledgement record", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValueOnce({ success: true });

      await expect(hypercertOps.deleteAcknowledgement(TEST_ACK_URI)).resolves.toBeUndefined();

      expect(mockAgent.com.atproto.repo.deleteRecord).toHaveBeenCalledTimes(1);
      const callArgs = mockAgent.com.atproto.repo.deleteRecord.mock.calls[0][0];
      expect(callArgs.collection).toBe(ACKNOWLEDGEMENT_NSID);
      expect(callArgs.rkey).toBe("ack123");
      expect(callArgs.repo).toBe(TEST_REPO_DID);
    });

    it("should throw NetworkError when deleteRecord fails", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValueOnce({ success: false });

      await expect(hypercertOps.deleteAcknowledgement(TEST_ACK_URI)).rejects.toThrow(NetworkError);
    });

    it("should throw ValidationError for an invalid URI format", async () => {
      await expect(hypercertOps.deleteAcknowledgement("not-valid")).rejects.toThrow(ValidationError);
    });
  });
});
