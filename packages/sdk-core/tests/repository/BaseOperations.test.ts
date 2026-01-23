import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import { BaseOperations } from "../../src/repository/BaseOperations.js";
import { ValidationError, NetworkError } from "../../src/core/errors.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { createMockAgent, TEST_REPO_DID } from "../utils/mocks.js";

// Test implementation of BaseOperations
interface TestRecordParams {
  title: string;
  description?: string;
}

interface TestRecordResult {
  uri: string;
  cid: string;
  record: {
    $type: string;
    title: string;
    description?: string;
    createdAt: string;
  };
}

class TestOperations extends BaseOperations<TestRecordParams, TestRecordResult> {
  async create(params: TestRecordParams): Promise<TestRecordResult> {
    const record = {
      $type: "org.test.record",
      title: params.title,
      description: params.description,
      createdAt: new Date().toISOString(),
    };

    const { uri, cid } = await this.validateAndCreate("org.test.record", record);
    return { uri, cid, record };
  }

  // Expose protected methods for testing
  public testCreateStrongRef(uri: string, cid: string) {
    return this.createStrongRef(uri, cid);
  }

  public testCreateStrongRefFromResult(result: { uri: string; cid: string }) {
    return this.createStrongRefFromResult(result);
  }

  public testParseAtUri(uri: string) {
    return this.parseAtUri(uri);
  }

  public testBuildAtUri(did: string, collection: string, rkey: string) {
    return this.buildAtUri(did, collection, rkey);
  }

  public testValidateAndCreate(collection: string, record: unknown, rkey?: string) {
    return this.validateAndCreate(collection, record, rkey);
  }

  public testValidateAndUpdate(collection: string, rkey: string, record: unknown) {
    return this.validateAndUpdate(collection, rkey, record);
  }
}

describe("BaseOperations", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let registry: LexiconRegistry;
  let testOps: TestOperations;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
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

    testOps = new TestOperations(mockAgent as unknown as Agent, TEST_REPO_DID, registry);
  });

  describe("validateAndCreate", () => {
    it("should validate and create a valid record", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei123" },
      });

      const validRecord = {
        $type: "org.test.record",
        title: "Test Record",
        description: "A test",
        createdAt: new Date().toISOString(),
      };

      const result = await testOps.testValidateAndCreate("org.test.record", validRecord);

      expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
      expect(result.cid).toBe("bafyrei123");
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

      await expect(testOps.testValidateAndCreate("org.test.record", invalidRecord)).rejects.toThrow(ValidationError);

      expect(mockAgent.com.atproto.repo.createRecord).not.toHaveBeenCalled();
    });

    it("should create record for unregistered collection without validation", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/custom.type/xyz", cid: "bafyrei456" },
      });

      const customRecord = {
        $type: "custom.type",
        anyField: "any value",
      };

      const result = await testOps.testValidateAndCreate("custom.type", customRecord);

      expect(result.uri).toBe("at://did:plc:test/custom.type/xyz");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled();
    });

    it("should throw NetworkError when API fails", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: false,
      });

      const validRecord = {
        $type: "org.test.record",
        title: "Test",
        createdAt: new Date().toISOString(),
      };

      await expect(testOps.testValidateAndCreate("org.test.record", validRecord)).rejects.toThrow(NetworkError);
    });

    it("should create record with custom rkey", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.test.record/custom-rkey", cid: "bafyrei789" },
      });

      const validRecord = {
        $type: "org.test.record",
        title: "Test",
        createdAt: new Date().toISOString(),
      };

      await testOps.testValidateAndCreate("org.test.record", validRecord, "custom-rkey");

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({ rkey: "custom-rkey" }),
      );
    });
  });

  describe("validateAndUpdate", () => {
    it("should validate and update a valid record", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei999" },
      });

      const validRecord = {
        $type: "org.test.record",
        title: "Updated Title",
        createdAt: new Date().toISOString(),
      };

      const result = await testOps.testValidateAndUpdate("org.test.record", "abc", validRecord);

      expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
      expect(result.cid).toBe("bafyrei999");
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

      await expect(testOps.testValidateAndUpdate("org.test.record", "abc", invalidRecord)).rejects.toThrow(
        ValidationError,
      );

      expect(mockAgent.com.atproto.repo.putRecord).not.toHaveBeenCalled();
    });

    it("should throw NetworkError when update fails", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: false,
      });

      const validRecord = {
        $type: "org.test.record",
        title: "Test",
        createdAt: new Date().toISOString(),
      };

      await expect(testOps.testValidateAndUpdate("org.test.record", "abc", validRecord)).rejects.toThrow(NetworkError);
    });
  });

  describe("createStrongRef", () => {
    it("should create a strongRef with uri and cid", () => {
      const uri = "at://did:plc:test/org.test.record/abc";
      const cid = "bafyrei123";

      const ref = testOps.testCreateStrongRef(uri, cid);

      expect(ref).toEqual({ uri, cid });
    });
  });

  describe("createStrongRefFromResult", () => {
    it("should create strongRef from CreateResult", () => {
      const result = {
        uri: "at://did:plc:test/org.test.record/abc",
        cid: "bafyrei123",
      };

      const ref = testOps.testCreateStrongRefFromResult(result);

      expect(ref).toEqual({ uri: result.uri, cid: result.cid });
    });
  });

  describe("parseAtUri", () => {
    it("should parse a valid AT-URI", () => {
      const uri = "at://did:plc:abc123/org.test.record/xyz789";

      const parsed = testOps.testParseAtUri(uri);

      expect(parsed).toEqual({
        did: "did:plc:abc123",
        collection: "org.test.record",
        rkey: "xyz789",
      });
    });

    it("should throw error for invalid AT-URI format", () => {
      expect(() => testOps.testParseAtUri("https://invalid.url")).toThrow("Invalid AT-URI format");
    });

    it("should throw error for AT-URI with wrong number of parts", () => {
      expect(() => testOps.testParseAtUri("at://did:plc:abc123/collection")).toThrow("Invalid AT-URI format");
    });
  });

  describe("buildAtUri", () => {
    it("should build a valid AT-URI from components", () => {
      const did = "did:plc:abc123";
      const collection = "org.test.record";
      const rkey = "xyz789";

      const uri = testOps.testBuildAtUri(did, collection, rkey);

      expect(uri).toBe("at://did:plc:abc123/org.test.record/xyz789");
    });

    it("should round-trip with parseAtUri", () => {
      const did = "did:plc:abc123";
      const collection = "org.test.record";
      const rkey = "xyz789";

      const uri = testOps.testBuildAtUri(did, collection, rkey);
      const parsed = testOps.testParseAtUri(uri);

      expect(parsed.did).toBe(did);
      expect(parsed.collection).toBe(collection);
      expect(parsed.rkey).toBe(rkey);
    });
  });

  describe("create (abstract method implementation)", () => {
    it("should create a record using the implementation", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.test.record/abc", cid: "bafyrei123" },
      });

      const result = await testOps.create({
        title: "Test Record",
        description: "A test record",
      });

      expect(result.uri).toBe("at://did:plc:test/org.test.record/abc");
      expect(result.cid).toBe("bafyrei123");
      expect(result.record).toMatchObject({
        $type: "org.test.record",
        title: "Test Record",
        description: "A test record",
      });
    });

    it("should validate through the create implementation", async () => {
      await expect(
        testOps.create({
          title: "", // Invalid: empty title
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockAgent.com.atproto.repo.createRecord).not.toHaveBeenCalled();
    });
  });
});
