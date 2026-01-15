import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import { createMockAgent, TEST_REPO_DID, TEST_PDS_URL } from "../utils/mocks.js";

// Mock the validate function from lexicon package
vi.mock("@hypercerts-org/lexicon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hypercerts-org/lexicon")>();
  return {
    ...actual,
    validate: vi.fn(() => ({ success: true })),
  };
});

describe("HypercertOperationsImpl", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let hypercertOps: HypercertOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    hypercertOps = new HypercertOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID, TEST_PDS_URL);
  });

  describe("create", () => {
    const validParams = {
      title: "Test Hypercert",
      shortDescription: "A test hypercert",
      description: "A test hypercert for unit testing",
      workScope: {
        withinAnyOf: ["Testing"],
      },
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
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

    it("should create evidence records when provided", async () => {
      const evidence = [
        {
          content: "https://example.com/evidence",
          title: "Evidence Document",
          shortDescription: "Supporting evidence",
          relationType: "supports" as const,
        },
      ];

      // Mock getRecord for evidence creation (called by addEvidence)
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/def456",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: { withinAllOf: ["Testing"] },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      // Mock evidence record creation (third createRecord call after rights and hypercert)
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.evidence/evidence123", cid: "evidence-cid" },
      });

      const result = await hypercertOps.create({
        ...validParams,
        evidence,
      });

      // Verify evidence records were created
      expect(result.evidenceUris).toBeDefined();
      expect(result.evidenceUris).toHaveLength(1);
      expect(result.evidenceUris?.[0]).toContain("evidence");

      // Verify createRecord was called for evidence (3rd call: rights, hypercert, evidence)
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(3);
      const evidenceCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(evidenceCall.collection).toBe("org.hypercerts.claim.evidence");
      expect(evidenceCall.record.title).toBe("Evidence Document");
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
          data: { uri: "at://did:plc:test/app.certified.location/ghi", cid: "location-cid" },
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      // Mock putRecord for the update call
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "updated-cid" },
      });

      const result = await hypercertOps.create({
        ...validParams,
        location: {
          lpVersion: "1.0.0",
          srs: "EPSG:4326",
          locationType: "coordinate-decimal",
          location: "https://example.com/location",
          name: "Test Location",
          description: "A test location",
        },
      });

      expect(result.locationUri).toBe("at://did:plc:test/app.certified.location/ghi");
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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
      const calls = onProgress.mock.calls.map((c: unknown[]) => (c[0] as { name: string }).name);
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
        workScope: {
          withinAllOf: ["Climate"],
          withinAnyOf: [],
          withinNoneOf: [],
        },
        startDate: "2024-01-01",
        endDate: "2024-12-31",
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
                workScope: {
                  withinAllOf: ["Climate"],
                  withinAnyOf: [],
                  withinNoneOf: [],
                },
                startDate: "2024-01-01",
                endDate: "2024-12-31",
                createdAt: "2024-01-01",
              },
            },
            {
              uri: "at://did:plc:test/org.hypercerts.claim.record/2",
              cid: "cid2",
              value: {
                title: "Second",
                description: "Desc",
                workScope: {
                  withinAllOf: ["Climate"],
                  withinAnyOf: [],
                  withinNoneOf: [],
                },
                startDate: "2024-01-01",
                endDate: "2024-12-31",
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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

  describe("attachLocation", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      // Add this mock for putRecord
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.record/abc", cid: "updated-cid" },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.location/xyz", cid: "location-cid" },
      });
    });

    it("should attach a location using a string URI", async () => {
      const hypercertUri = "at://did:plc:test/org.hypercerts.claim.record/abc";
      const result = await hypercertOps.attachLocation(hypercertUri, {
        lpVersion: "1.0.0",
        locationType: "coordinate-decimal",
        location: "https://example.com/location",
        srs: "EPSG:4326",
      });

      expect(result.uri).toContain("location");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(call.record.location).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "https://example.com/location",
      });
    });
    it("should attach a location using a GeoJSON Blob", async () => {
      const hypercertUri = "at://did:plc:test/org.hypercerts.claim.record/abc";
      const blob = new Blob([JSON.stringify({ type: "Point", coordinates: [0, 0] })], {
        type: "application/geo+json",
      });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: { ref: { $link: "blob-cid" }, mimeType: "application/geo+json", size: 100 },
        },
      });

      const result = await hypercertOps.attachLocation(hypercertUri, {
        lpVersion: "1.0.0",
        locationType: "coordinate-decimal",
        location: blob,
        srs: "EPSG:4326",
      });

      expect(result.uri).toContain("location");
      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();

      // Check the location record that was created
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(call.record.location).toEqual({
        $type: "org.hypercerts.defs#smallBlob", // Your code wraps it in smallBlob
        blob: {
          // The actual blob data is nested here
          ref: { $link: "blob-cid" },
          mimeType: "application/geo+json",
          size: 100,
        },
      });
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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

  describe("addEvidence", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.evidence/xyz", cid: "evidence-cid" },
      });
    });

    it("should add evidence to a hypercert with a URI string", async () => {
      const result = await hypercertOps.addEvidence({
        subjectUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        title: "Impact Report",
        content: "https://example.com/report.pdf",
      });

      expect(result.uri).toContain("evidence");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled();
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(call.record.content).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "https://example.com/report.pdf",
      });
    });

    it("should add evidence to a hypercert with a Blob upload", async () => {
      const blob = new Blob(["evidence data"], { type: "application/pdf" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: { ref: { $link: "blob-cid" }, mimeType: "application/pdf", size: 100 },
        },
      });

      const result = await hypercertOps.addEvidence({
        subjectUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        title: "Impact Report",
        content: blob,
      });

      expect(result.uri).toContain("evidence");
      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(call.record.content).toEqual({
        $type: "org.hypercerts.defs#smallBlob",
        blob: { ref: { $link: "blob-cid" }, mimeType: "application/pdf", size: 100 },
      });
    });

    it("should emit evidenceAdded event", async () => {
      const handler = vi.fn();
      hypercertOps.on("evidenceAdded", handler);

      await hypercertOps.addEvidence({
        subjectUri: "at://did:plc:test/org.hypercerts.claim.record/abc",
        title: "Impact Report",
        content: "https://example.com/report.pdf",
      });

      expect(handler).toHaveBeenCalledWith({ uri: expect.any(String), cid: "evidence-cid" });
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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
            workScope: {
              withinAllOf: ["Climate"],
              withinAnyOf: [],
              withinNoneOf: [],
            },
            startDate: "2024-01-01",
            endDate: "2024-12-31",
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

  describe("Project Operations", () => {
    describe("createProject", () => {
      beforeEach(() => {
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.project/abc123", cid: "project-cid" },
        });
      });

      it("should create a project with required fields only", async () => {
        const result = await hypercertOps.createProject({
          title: "Test Project",
          shortDescription: "A test project for unit testing",
        });

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.project/abc123");
        expect(result.cid).toBe("project-cid");
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: "org.hypercerts.claim.project",
            record: expect.objectContaining({
              $type: "org.hypercerts.claim.project",
              title: "Test Project",
              shortDescription: "A test project for unit testing",
              createdAt: expect.any(String),
            }),
          }),
        );
      });

      it("should create a project with all optional fields", async () => {
        const description = { type: "linearDocument", content: "Rich text" };
        const activities = [
          { uri: "at://activity1", cid: "cid1", weight: "50" },
          { uri: "at://activity2", cid: "cid2", weight: "50" },
        ];
        const location = { uri: "at://location", cid: "location-cid" };

        const result = await hypercertOps.createProject({
          title: "Complete Project",
          shortDescription: "A complete project with all fields",
          description,
          activities,
          location,
        });

        expect(result.uri).toBeDefined();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.description).toEqual(description);
        expect(createCall.record.activities).toEqual([
          { activity: { uri: "at://activity1", cid: "cid1" }, weight: "50" },
          { activity: { uri: "at://activity2", cid: "cid2" }, weight: "50" },
        ]);
        expect(createCall.record.location).toEqual(location);
      });

      it("should upload avatar blob when provided", async () => {
        const avatarBlob = new Blob(["avatar data"], { type: "image/png" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: {
              ref: { toString: () => "avatar-cid" },
              mimeType: "image/png",
              size: 100,
            },
          },
        });

        await hypercertOps.createProject({
          title: "Project with Avatar",
          shortDescription: "Project with avatar",
          avatar: avatarBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.avatar).toEqual({
          $type: "blob",
          ref: { $link: "avatar-cid" },
          mimeType: "image/png",
          size: 100,
        });
      });

      it("should upload coverPhoto blob when provided", async () => {
        const coverPhotoBlob = new Blob(["cover photo data"], { type: "image/jpeg" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: {
              ref: { toString: () => "cover-cid" },
              mimeType: "image/jpeg",
              size: 200,
            },
          },
        });

        await hypercertOps.createProject({
          title: "Project with Cover",
          shortDescription: "Project with cover photo",
          coverPhoto: coverPhotoBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.coverPhoto).toEqual({
          $type: "blob",
          ref: { $link: "cover-cid" },
          mimeType: "image/jpeg",
          size: 200,
        });
      });

      it("should upload both avatar and coverPhoto when provided", async () => {
        const avatarBlob = new Blob(["avatar"], { type: "image/png" });
        const coverPhotoBlob = new Blob(["cover"], { type: "image/jpeg" });

        mockAgent.com.atproto.repo.uploadBlob
          .mockResolvedValueOnce({
            success: true,
            data: {
              blob: { ref: { toString: () => "avatar-cid" }, mimeType: "image/png", size: 50 },
            },
          })
          .mockResolvedValueOnce({
            success: true,
            data: {
              blob: { ref: { toString: () => "cover-cid" }, mimeType: "image/jpeg", size: 100 },
            },
          });

        await hypercertOps.createProject({
          title: "Full Project",
          shortDescription: "Project with both images",
          avatar: avatarBlob,
          coverPhoto: coverPhotoBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledTimes(2);
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.avatar).toBeDefined();
        expect(createCall.record.coverPhoto).toBeDefined();
      });

      it("should transform activities array to lexicon format", async () => {
        await hypercertOps.createProject({
          title: "Project with Activities",
          shortDescription: "Project with activities",
          activities: [
            { uri: "at://act1", cid: "cid1", weight: "30" },
            { uri: "at://act2", cid: "cid2", weight: "70" },
          ],
        });

        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.activities).toEqual([
          { activity: { uri: "at://act1", cid: "cid1" }, weight: "30" },
          { activity: { uri: "at://act2", cid: "cid2" }, weight: "70" },
        ]);
      });

      it("should emit projectCreated event", async () => {
        const handler = vi.fn();
        hypercertOps.on("projectCreated", handler);

        await hypercertOps.createProject({
          title: "Event Test",
          shortDescription: "Testing event emission",
        });

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.project/abc123",
          cid: "project-cid",
        });
      });

      it("should throw NetworkError when creation fails", async () => {
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.createProject({
            title: "Failing Project",
            shortDescription: "This will fail",
          }),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw NetworkError when avatar upload fails", async () => {
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: false,
        });

        const avatarBlob = new Blob(["avatar"], { type: "image/png" });

        await expect(
          hypercertOps.createProject({
            title: "Project",
            shortDescription: "Project",
            avatar: avatarBlob,
          }),
        ).rejects.toThrow(NetworkError);
      });
    });

    describe("getProject", () => {
      it("should get a project successfully", async () => {
        const mockRecord = {
          $type: "org.hypercerts.claim.project",
          title: "Test Project",
          shortDescription: "A test project",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.project/abc123",
            cid: "project-cid",
            value: mockRecord,
          },
        });

        const result = await hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.project/abc123");

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.project/abc123");
        expect(result.cid).toBe("project-cid");
        expect(result.record.title).toBe("Test Project");
        expect(result.record.shortDescription).toBe("A test project");
      });

      it("should throw ValidationError for invalid URI format", async () => {
        await expect(hypercertOps.getProject("invalid-uri")).rejects.toThrow(ValidationError);
      });

      it("should throw NetworkError when project not found", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.project/notfound"),
        ).rejects.toThrow(NetworkError);
      });

      it("should handle project with all optional fields", async () => {
        const mockRecord = {
          $type: "org.hypercerts.claim.project",
          title: "Complete Project",
          shortDescription: "Full project",
          description: { type: "linearDocument", content: "Rich" },
          avatar: { $type: "blob", ref: { $link: "avatar-cid" } },
          coverPhoto: { $type: "blob", ref: { $link: "cover-cid" } },
          activities: [{ activity: { uri: "at://act", cid: "cid" }, weight: "100" }],
          location: { uri: "at://loc", cid: "loc-cid" },
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.project/complete",
            cid: "cid",
            value: mockRecord,
          },
        });

        const result = await hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.project/complete");

        expect(result.record.description).toEqual({ type: "linearDocument", content: "Rich" });
        expect(result.record.activities).toHaveLength(1);
        expect(result.record.location).toBeDefined();
      });
    });

    describe("listProjects", () => {
      it("should list projects successfully", async () => {
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.project/1",
                cid: "cid1",
                value: {
                  $type: "org.hypercerts.claim.project",
                  title: "Project 1",
                  shortDescription: "First project",
                  createdAt: "2024-01-01T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.project/2",
                cid: "cid2",
                value: {
                  $type: "org.hypercerts.claim.project",
                  title: "Project 2",
                  shortDescription: "Second project",
                  createdAt: "2024-01-02T00:00:00Z",
                },
              },
            ],
            cursor: "next-cursor",
          },
        });

        const result = await hypercertOps.listProjects({ limit: 10 });

        expect(result.records).toHaveLength(2);
        expect(result.records[0].record.title).toBe("Project 1");
        expect(result.records[1].record.title).toBe("Project 2");
        expect(result.cursor).toBe("next-cursor");
        expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.project",
          limit: 10,
        });
      });

      it("should handle pagination with cursor", async () => {
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: true,
          data: { records: [], cursor: undefined },
        });

        await hypercertOps.listProjects({ cursor: "previous-cursor", limit: 20 });

        expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.project",
          cursor: "previous-cursor",
          limit: 20,
        });
      });

      it("should handle empty results", async () => {
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: true,
          data: { records: [], cursor: undefined },
        });

        const result = await hypercertOps.listProjects();

        expect(result.records).toHaveLength(0);
        expect(result.cursor).toBeUndefined();
      });

      it("should throw NetworkError when listing fails", async () => {
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: false,
        });

        await expect(hypercertOps.listProjects()).rejects.toThrow(NetworkError);
      });
    });

    describe("updateProject", () => {
      beforeEach(() => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.project/abc123",
            cid: "old-cid",
            value: {
              $type: "org.hypercerts.claim.project",
              title: "Old Title",
              shortDescription: "Old description",
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.project/abc123", cid: "new-cid" },
        });
      });

      it("should update project title", async () => {
        const result = await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          title: "New Title",
        });

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.project/abc123");
        expect(result.cid).toBe("new-cid");

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.title).toBe("New Title");
        expect(putCall.record.shortDescription).toBe("Old description"); // Preserved
      });

      it("should update shortDescription", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          shortDescription: "New short description",
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.shortDescription).toBe("New short description");
        expect(putCall.record.title).toBe("Old Title"); // Preserved
      });

      it("should preserve createdAt timestamp", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          title: "Updated",
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.createdAt).toBe("2024-01-01T00:00:00Z");
      });

      it("should update description", async () => {
        const newDescription = { type: "linearDocument", content: "New rich content" };

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          description: newDescription,
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.description).toEqual(newDescription);
      });

      it("should upload and update avatar", async () => {
        const newAvatar = new Blob(["new avatar"], { type: "image/png" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: { ref: { toString: () => "new-avatar-cid" }, mimeType: "image/png", size: 150 },
          },
        });

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          avatar: newAvatar,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.avatar).toEqual({
          $type: "blob",
          ref: { $link: "new-avatar-cid" },
          mimeType: "image/png",
          size: 150,
        });
      });

      it("should upload and update coverPhoto", async () => {
        const newCover = new Blob(["new cover"], { type: "image/jpeg" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: { ref: { toString: () => "new-cover-cid" }, mimeType: "image/jpeg", size: 250 },
          },
        });

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          coverPhoto: newCover,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.coverPhoto).toBeDefined();
      });

      it("should update activities array", async () => {
        const newActivities = [
          { uri: "at://new-act1", cid: "new-cid1", weight: "40" },
          { uri: "at://new-act2", cid: "new-cid2", weight: "60" },
        ];

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          activities: newActivities,
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.activities).toEqual([
          { activity: { uri: "at://new-act1", cid: "new-cid1" }, weight: "40" },
          { activity: { uri: "at://new-act2", cid: "new-cid2" }, weight: "60" },
        ]);
      });

      it("should update location", async () => {
        const newLocation = { uri: "at://new-location", cid: "new-loc-cid" };

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          location: newLocation,
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.location).toEqual(newLocation);
      });

      it("should update multiple fields at once", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          title: "Multi Update",
          shortDescription: "Updated multiple fields",
          activities: [{ uri: "at://act", cid: "cid", weight: "100" }],
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.title).toBe("Multi Update");
        expect(putCall.record.shortDescription).toBe("Updated multiple fields");
        expect(putCall.record.activities).toHaveLength(1);
        expect(putCall.record.createdAt).toBe("2024-01-01T00:00:00Z"); // Still preserved
      });

      it("should emit projectUpdated event", async () => {
        const handler = vi.fn();
        hypercertOps.on("projectUpdated", handler);

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", {
          title: "Updated",
        });

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.project/abc123",
          cid: "new-cid",
        });
      });

      it("should throw ValidationError for invalid URI", async () => {
        await expect(hypercertOps.updateProject("invalid-uri", { title: "New" })).rejects.toThrow(ValidationError);
      });

      it("should throw NetworkError when get fails", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", { title: "New" }),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw NetworkError when put fails", async () => {
        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.project/abc123", { title: "New" }),
        ).rejects.toThrow(NetworkError);
      });
    });

    describe("deleteProject", () => {
      it("should delete a project successfully", async () => {
        mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
          success: true,
        });

        await expect(
          hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.project/abc123"),
        ).resolves.toBeUndefined();

        expect(mockAgent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.project",
          rkey: "abc123",
        });
      });

      it("should emit projectDeleted event", async () => {
        mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
          success: true,
        });

        const handler = vi.fn();
        hypercertOps.on("projectDeleted", handler);

        await hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.project/abc123");

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.project/abc123",
        });
      });

      it("should throw ValidationError for invalid URI", async () => {
        await expect(hypercertOps.deleteProject("invalid-uri")).rejects.toThrow(ValidationError);
      });

      it("should throw NetworkError when deletion fails", async () => {
        mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.project/abc123"),
        ).rejects.toThrow(NetworkError);
      });
    });
  });
});
