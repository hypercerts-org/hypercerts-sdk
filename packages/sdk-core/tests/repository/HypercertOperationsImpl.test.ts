import { describe, it, expect, vi, beforeEach } from "vitest";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import { HYPERCERT_LEXICONS } from "../../src/lexicons/hypercerts/index.js";

describe("HypercertOperationsImpl", () => {
  let mockAgent: any;
  let lexiconRegistry: LexiconRegistry;
  let hypercertOps: HypercertOperationsImpl;
  const repoDid = "did:plc:testdid123";
  const serverUrl = "https://pds.example.com";

  beforeEach(() => {
    mockAgent = {
      com: {
        atproto: {
          repo: {
            createRecord: vi.fn(),
            putRecord: vi.fn(),
            getRecord: vi.fn(),
            listRecords: vi.fn(),
            deleteRecord: vi.fn(),
            uploadBlob: vi.fn(),
          },
        },
      },
    };

    lexiconRegistry = new LexiconRegistry();
    lexiconRegistry.registerMany(HYPERCERT_LEXICONS);
    // Mock validate to always return valid - we test LexiconRegistry separately
    vi.spyOn(lexiconRegistry, "validate").mockReturnValue({ valid: true });
    hypercertOps = new HypercertOperationsImpl(mockAgent, repoDid, serverUrl, lexiconRegistry);
  });

  describe("create", () => {
    const validParams = {
      title: "Test Hypercert",
      description: "A test hypercert for unit testing",
      workScope: "Testing",
      workTimeframeFrom: "2024-01-01T00:00:00Z",
      workTimeframeTo: "2024-12-31T23:59:59Z",
      rights: {
        name: "Attribution",
        type: "CC-BY-4.0",
        description: "Creative Commons Attribution",
      },
    };

    beforeEach(() => {
      // Mock successful rights creation
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc123", cid: "rights-cid" },
      });
      // Mock successful hypercert creation
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def456", cid: "hypercert-cid" },
      });
    });

    it("should create a hypercert with rights successfully", async () => {
      const result = await hypercertOps.create(validParams);

      expect(result.rightsUri).toBe("at://did:plc:test/org.hypercerts.claim.rights/abc123");
      expect(result.rightsCid).toBe("rights-cid");
      expect(result.hypercertUri).toBe("at://did:plc:test/org.hypercerts.claim.record/def456");
      expect(result.hypercertCid).toBe("hypercert-cid");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(2);
    });

    it("should upload image and include in hypercert", async () => {
      const imageBlob = new Blob(["image data"], { type: "image/png" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: { ref: { $link: "image-cid" }, mimeType: "image/png", size: 100 },
        },
      });

      await hypercertOps.create({
        ...validParams,
        image: imageBlob,
      });

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
    });

    it("should include shortDescription when provided", async () => {
      await hypercertOps.create({
        ...validParams,
        shortDescription: "Short desc",
      });

      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(hypercertCall.record.shortDescription).toBe("Short desc");
    });

    it("should include evidence when provided", async () => {
      const evidence = [{ uri: "https://example.com/evidence", title: "Evidence" }];

      await hypercertOps.create({
        ...validParams,
        evidence,
      });

      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(hypercertCall.record.evidence).toEqual(evidence);
    });

    it("should attach location when provided", async () => {
      // Reset mocks and set up for location
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.location/ghi", cid: "location-cid" },
        });

      // Mock getRecord for attachLocation's internal get call
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/def",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: "Test",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      const result = await hypercertOps.create({
        ...validParams,
        location: { value: "New York, NY" },
      });

      expect(result.locationUri).toBe("at://did:plc:test/org.hypercerts.claim.location/ghi");
    });

    it("should create contributions when provided", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.contribution/contrib1", cid: "contrib-cid" },
        });

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/def",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: "Test",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      const result = await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer" }],
      });

      expect(result.contributionUris).toHaveLength(1);
    });

    it("should call onProgress callback", async () => {
      const onProgress = vi.fn();

      await hypercertOps.create({
        ...validParams,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      const calls = onProgress.mock.calls.map((c: any[]) => c[0].name);
      expect(calls).toContain("createRights");
      expect(calls).toContain("createHypercert");
    });

    it("should emit events", async () => {
      const rightsCreatedHandler = vi.fn();
      const recordCreatedHandler = vi.fn();

      hypercertOps.on("rightsCreated", rightsCreatedHandler);
      hypercertOps.on("recordCreated", recordCreatedHandler);

      await hypercertOps.create(validParams);

      expect(rightsCreatedHandler).toHaveBeenCalledWith({ uri: expect.any(String), cid: "rights-cid" });
      expect(recordCreatedHandler).toHaveBeenCalledWith({ uri: expect.any(String), cid: "hypercert-cid" });
    });

    it("should throw NetworkError when rights creation fails", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: false,
      });

      await expect(hypercertOps.create(validParams)).rejects.toThrow(NetworkError);
    });
  });

  describe("get", () => {
    it("should get a hypercert successfully", async () => {
      const mockRecord = {
        title: "Test",
        description: "Test description",
        workScope: "Testing",
        workTimeframeFrom: "2024-01-01",
        workTimeframeTo: "2024-12-31",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
          cid: "test-cid",
          value: mockRecord,
        },
      });

      const result = await hypercertOps.get("at://did:plc:test/org.hypercerts.claim.record/abc123");

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.record/abc123");
      expect(result.cid).toBe("test-cid");
      expect(result.record.title).toBe("Test");
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(hypercertOps.get("invalid-uri")).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
      });

      await expect(hypercertOps.get("at://did:plc:test/org.hypercerts.claim.record/abc123")).rejects.toThrow(
        NetworkError,
      );
    });
  });

  describe("list", () => {
    it("should list hypercerts successfully", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: {
          records: [
            {
              uri: "at://did:plc:test/org.hypercerts.claim.record/1",
              cid: "cid1",
              value: {
                title: "First",
                description: "Desc",
                workScope: "Scope",
                workTimeframeFrom: "2024-01-01",
                workTimeframeTo: "2024-12-31",
                createdAt: "2024-01-01",
              },
            },
            {
              uri: "at://did:plc:test/org.hypercerts.claim.record/2",
              cid: "cid2",
              value: {
                title: "Second",
                description: "Desc",
                workScope: "Scope",
                workTimeframeFrom: "2024-01-01",
                workTimeframeTo: "2024-12-31",
                createdAt: "2024-01-01",
              },
            },
          ],
          cursor: "next",
        },
      });

      const result = await hypercertOps.list({ limit: 10 });

      expect(result.records).toHaveLength(2);
      expect(result.cursor).toBe("next");
    });

    it("should handle empty results", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: { records: [], cursor: undefined },
      });

      const result = await hypercertOps.list();

      expect(result.records).toHaveLength(0);
      expect(result.cursor).toBeUndefined();
    });
  });

  describe("update", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
          cid: "old-cid",
          value: {
            title: "Old Title",
            description: "Old description",
            workScope: "Old scope",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01T00:00:00Z",
            rights: { uri: "at://rights", cid: "rights-cid" },
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.record/abc123", cid: "new-cid" },
      });
    });

    it("should update a hypercert successfully", async () => {
      const result = await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: { title: "New Title" },
      });

      expect(result.cid).toBe("new-cid");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "New Title",
            description: "Old description", // Preserved
          }),
        }),
      );
    });

    it("should preserve createdAt and rights", async () => {
      await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: { title: "New Title" },
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(putCall.record.rights).toEqual({ uri: "at://rights", cid: "rights-cid" });
    });

    it("should upload new image", async () => {
      const imageBlob = new Blob(["new image"], { type: "image/png" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: { blob: { ref: { $link: "new-image-cid" }, mimeType: "image/png", size: 100 } },
      });

      await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: {},
        image: imageBlob,
      });

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
    });

    it("should remove image when set to null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            title: "Title",
            description: "Desc",
            workScope: "Scope",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
            rights: { uri: "at://rights", cid: "cid" },
            image: { ref: { $link: "old-image" } },
          },
        },
      });

      await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: {},
        image: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.image).toBeUndefined();
    });

    it("should emit recordUpdated event", async () => {
      const handler = vi.fn();
      hypercertOps.on("recordUpdated", handler);

      await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: { title: "New" },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete a hypercert successfully", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
        success: true,
      });

      await expect(
        hypercertOps.delete("at://did:plc:test/org.hypercerts.claim.record/abc123"),
      ).resolves.toBeUndefined();
    });

    it("should throw ValidationError for invalid URI", async () => {
      await expect(hypercertOps.delete("invalid")).rejects.toThrow(ValidationError);
    });
  });

  describe("addContribution", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: "Test",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.contribution/xyz", cid: "contrib-cid" },
      });
    });

    it("should create a contribution linked to hypercert", async () => {
      const result = await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        contributors: ["did:plc:contributor1"],
        role: "Developer",
        description: "Built the thing",
      });

      expect(result.uri).toContain("contribution");
    });

    it("should create standalone contribution without hypercert", async () => {
      const result = await hypercertOps.addContribution({
        contributors: ["did:plc:contributor1"],
        role: "Developer",
      });

      expect(result.uri).toBeDefined();
    });

    it("should emit contributionCreated event", async () => {
      const handler = vi.fn();
      hypercertOps.on("contributionCreated", handler);

      await hypercertOps.addContribution({
        contributors: ["did:plc:test"],
        role: "Tester",
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("addMeasurement", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: "Test",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.measurement/xyz", cid: "measurement-cid" },
      });
    });

    it("should create a measurement", async () => {
      const result = await hypercertOps.addMeasurement({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        measurers: ["did:plc:measurer1"],
        metric: "CO2 Reduced",
        value: "100 tons",
      });

      expect(result.uri).toContain("measurement");
    });
  });

  describe("addEvaluation", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: "Test",
            workTimeframeFrom: "2024-01-01",
            workTimeframeTo: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.evaluation/xyz", cid: "eval-cid" },
      });
    });

    it("should create an evaluation", async () => {
      const result = await hypercertOps.addEvaluation({
        subjectUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        evaluators: ["did:plc:evaluator1"],
        summary: "Excellent work",
      });

      expect(result.uri).toContain("evaluation");
    });
  });

  describe("createCollection", () => {
    it("should create a collection", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "collection-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "My Collection",
        claims: [{ uri: "at://claim1", cid: "cid1", weight: "50" }],
      });

      expect(result.uri).toContain("collection");
    });

    it("should emit collectionCreated event", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "cid" },
      });

      const handler = vi.fn();
      hypercertOps.on("collectionCreated", handler);

      await hypercertOps.createCollection({
        title: "Collection",
        claims: [],
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("getCollection", () => {
    it("should get a collection", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc",
          cid: "cid",
          value: { title: "Collection", claims: [], createdAt: "2024-01-01" },
        },
      });

      const result = await hypercertOps.getCollection("at://did:plc:test/org.hypercerts.collection/abc");

      expect(result.record.title).toBe("Collection");
    });
  });

  describe("listCollections", () => {
    it("should list collections", async () => {
      mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
        success: true,
        data: {
          records: [
            {
              uri: "at://test/org.hypercerts.collection/1",
              cid: "cid",
              value: { title: "Col", claims: [], createdAt: "2024-01-01" },
            },
          ],
          cursor: undefined,
        },
      });

      const result = await hypercertOps.listCollections();

      expect(result.records).toHaveLength(1);
    });
  });
});
