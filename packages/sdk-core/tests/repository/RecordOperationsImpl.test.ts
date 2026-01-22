import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import { RecordOperationsImpl } from "../../src/repository/RecordOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { createMockAgent, TEST_REPO_DID } from "../utils/mocks.js";

describe("RecordOperationsImpl", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let recordOps: RecordOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    recordOps = new RecordOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID);
  });

  describe("create", () => {
    it("should create a record successfully", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/collection/rkey", cid: "bafyrei123" },
      });

      const result = await recordOps.create({
        collection: "app.bsky.feed.post",
        record: { text: "Hello world" },
      });

      expect(result.uri).toBe("at://did:plc:test/collection/rkey");
      expect(result.cid).toBe("bafyrei123");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: "app.bsky.feed.post",
        record: { text: "Hello world" },
        rkey: undefined,
      });
    });

    it("should create a record with custom rkey", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/collection/custom-rkey", cid: "bafyrei123" },
      });

      await recordOps.create({
        collection: "app.bsky.feed.post",
        record: { text: "Hello" },
        rkey: "custom-rkey",
      });

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({ rkey: "custom-rkey" }),
      );
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: false,
      });

      await expect(
        recordOps.create({
          collection: "app.bsky.feed.post",
          record: { text: "Hello" },
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.createRecord.mockRejectedValue(new Error("Network failure"));

      await expect(
        recordOps.create({
          collection: "app.bsky.feed.post",
          record: { text: "Hello" },
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("update", () => {
    it("should update a record successfully", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/collection/rkey", cid: "bafyrei456" },
      });

      const result = await recordOps.update({
        collection: "app.bsky.feed.post",
        rkey: "test-rkey",
        record: { text: "Updated text" },
      });

      expect(result.uri).toBe("at://did:plc:test/collection/rkey");
      expect(result.cid).toBe("bafyrei456");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: "app.bsky.feed.post",
        rkey: "test-rkey",
        record: { text: "Updated text" },
      });
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: false,
      });

      await expect(
        recordOps.update({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
          record: { text: "Hello" },
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.putRecord.mockRejectedValue(new Error("Network failure"));

      await expect(
        recordOps.update({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
          record: { text: "Hello" },
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("get", () => {
    it("should get a record successfully", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/collection/rkey",
          cid: "bafyrei123",
          value: { text: "Hello world" },
        },
      });

      const result = await recordOps.get({
        collection: "app.bsky.feed.post",
        rkey: "test-rkey",
      });

      expect(result.uri).toBe("at://did:plc:test/collection/rkey");
      expect(result.cid).toBe("bafyrei123");
      expect(result.value).toEqual({ text: "Hello world" });
    });

    it("should handle missing cid", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/collection/rkey",
          cid: undefined,
          value: { text: "Hello" },
        },
      });

      const result = await recordOps.get({
        collection: "app.bsky.feed.post",
        rkey: "test-rkey",
      });

      expect(result.cid).toBe("");
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
      });

      await expect(
        recordOps.get({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.getRecord.mockRejectedValue(new Error("Not found"));

      await expect(
        recordOps.get({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("list", () => {
    it("should list records successfully", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: {
          records: [
            { uri: "at://did:plc:test/collection/1", cid: "bafyrei1", value: { text: "First" } },
            { uri: "at://did:plc:test/collection/2", cid: "bafyrei2", value: { text: "Second" } },
          ],
          cursor: "next-cursor",
        },
      });

      const result = await recordOps.list({
        collection: "app.bsky.feed.post",
        limit: 10,
      });

      expect(result.records).toHaveLength(2);
      expect(result.cursor).toBe("next-cursor");
    });

    it("should handle empty results", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: {
          records: [],
          cursor: undefined,
        },
      });

      const result = await recordOps.list({
        collection: "app.bsky.feed.post",
      });

      expect(result.records).toHaveLength(0);
      expect(result.cursor).toBeUndefined();
    });

    it("should handle null records", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: {
          records: null,
          cursor: null,
        },
      });

      const result = await recordOps.list({
        collection: "app.bsky.feed.post",
      });

      expect(result.records).toHaveLength(0);
      expect(result.cursor).toBeUndefined();
    });

    it("should pass pagination parameters", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: { records: [], cursor: undefined },
      });

      await recordOps.list({
        collection: "app.bsky.feed.post",
        limit: 50,
        cursor: "prev-cursor",
      });

      expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: "app.bsky.feed.post",
        limit: 50,
        cursor: "prev-cursor",
      });
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: false,
      });

      await expect(recordOps.list({ collection: "app.bsky.feed.post" })).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.listRecords.mockRejectedValue(new Error("Network failure"));

      await expect(recordOps.list({ collection: "app.bsky.feed.post" })).rejects.toThrow(NetworkError);
    });
  });

  describe("delete", () => {
    it("should delete a record successfully", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
        success: true,
      });

      await expect(
        recordOps.delete({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
        }),
      ).resolves.toBeUndefined();

      expect(mockAgent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: "app.bsky.feed.post",
        rkey: "test-rkey",
      });
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
        success: false,
      });

      await expect(
        recordOps.delete({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockRejectedValue(new Error("Network failure"));

      await expect(
        recordOps.delete({
          collection: "app.bsky.feed.post",
          rkey: "test-rkey",
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("validation", () => {
    let registry: LexiconRegistry;
    let recordOpsWithRegistry: RecordOperationsImpl;

    beforeEach(() => {
      registry = new LexiconRegistry();

      // Register a test lexicon
      registry.registerFromJSON({
        lexicon: 1,
        id: "org.test.record",
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type", "title", "createdAt"],
              properties: {
                $type: { type: "string", const: "org.test.record" },
                title: { type: "string", minLength: 1 },
                description: { type: "string" },
                createdAt: { type: "string", format: "datetime" },
              },
            },
          },
        },
      });

      recordOpsWithRegistry = new RecordOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID, registry);
    });

    describe("create with validation", () => {
      it("should validate and create a valid record", async () => {
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei123" },
        });

        const validRecord = {
          $type: "org.test.record",
          title: "Test Record",
          description: "A test record",
          createdAt: new Date().toISOString(),
        };

        const result = await recordOpsWithRegistry.create({
          collection: "org.test.record",
          record: validRecord,
        });

        expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.test.record",
          record: validRecord,
          rkey: undefined,
        });
      });

      it("should throw ValidationError for invalid record", async () => {
        const invalidRecord = {
          $type: "org.test.record",
          // Missing required 'title' field
          createdAt: new Date().toISOString(),
        };

        await expect(
          recordOpsWithRegistry.create({
            collection: "org.test.record",
            record: invalidRecord,
          }),
        ).rejects.toThrow(ValidationError);

        // Should not call the API
        expect(mockAgent.com.atproto.repo.createRecord).not.toHaveBeenCalled();
      });

      it("should skip validation for unregistered collections", async () => {
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/custom.collection/xyz", cid: "bafyrei456" },
        });

        const customRecord = {
          $type: "custom.collection",
          anyField: "any value",
        };

        const result = await recordOpsWithRegistry.create({
          collection: "custom.collection",
          record: customRecord,
        });

        expect(result.uri).toBe("at://did:plc:test/custom.collection/xyz");
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled();
      });

      it("should skip validation when skipValidation is true", async () => {
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.test.record/xyz", cid: "bafyrei789" },
        });

        const invalidRecord = {
          $type: "org.test.record",
          // Missing required 'title' field
          createdAt: new Date().toISOString(),
        };

        const result = await recordOpsWithRegistry.create({
          collection: "org.test.record",
          record: invalidRecord,
          skipValidation: true,
        });

        expect(result.uri).toBe("at://did:plc:test/org.test.record/xyz");
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled();
      });
    });

    describe("update with validation", () => {
      it("should validate and update a valid record", async () => {
        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei999" },
        });

        const validRecord = {
          $type: "org.test.record",
          title: "Updated Record",
          description: "Updated description",
          createdAt: new Date().toISOString(),
        };

        const result = await recordOpsWithRegistry.update({
          collection: "org.test.record",
          rkey: "abc",
          record: validRecord,
        });

        expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
        expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.test.record",
          rkey: "abc",
          record: validRecord,
        });
      });

      it("should throw ValidationError for invalid record on update", async () => {
        const invalidRecord = {
          $type: "org.test.record",
          title: "", // Empty string violates minLength: 1
          createdAt: new Date().toISOString(),
        };

        await expect(
          recordOpsWithRegistry.update({
            collection: "org.test.record",
            rkey: "abc",
            record: invalidRecord,
          }),
        ).rejects.toThrow(ValidationError);

        // Should not call the API
        expect(mockAgent.com.atproto.repo.putRecord).not.toHaveBeenCalled();
      });

      it("should skip validation on update when skipValidation is true", async () => {
        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei888" },
        });

        const invalidRecord = {
          $type: "org.test.record",
          // Missing required 'title' field
          createdAt: new Date().toISOString(),
        };

        const result = await recordOpsWithRegistry.update({
          collection: "org.test.record",
          rkey: "abc",
          record: invalidRecord,
          skipValidation: true,
        });

        expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
        expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalled();
      });
    });
  });
});
