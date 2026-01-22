import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSidecarRecord,
  attachSidecar,
  batchCreateSidecars,
  createWithSidecars,
} from "../../src/lexicons/sidecar.js";
import type { Repository } from "../../src/repository/Repository.js";
import type { CreateResult } from "../../src/repository/types.js";

describe("Sidecar Pattern Utilities", () => {
  let mockRepo: Repository;

  beforeEach(() => {
    // Create a minimal mock repository
    mockRepo = {
      records: {
        create: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as Repository;
  });

  describe("createSidecarRecord", () => {
    it("should create a sidecar record", async () => {
      const mockResult: CreateResult = {
        uri: "at://did:plc:abc123/org.myapp.evaluation/3km2vj4kfqp2a",
        cid: "bafyreiabc123",
      };

      vi.mocked(mockRepo.records.create).mockResolvedValue(mockResult);

      const result = await createSidecarRecord(mockRepo, "org.myapp.evaluation", {
        $type: "org.myapp.evaluation",
        subject: { uri: "at://did:plc:abc123/org.hypercerts.claim.activity/abc", cid: "bafyrei123" },
        score: 85,
      });

      expect(result).toEqual(mockResult);
      expect(mockRepo.records.create).toHaveBeenCalledWith({
        collection: "org.myapp.evaluation",
        record: {
          $type: "org.myapp.evaluation",
          subject: { uri: "at://did:plc:abc123/org.hypercerts.claim.activity/abc", cid: "bafyrei123" },
          score: 85,
        },
        rkey: undefined,
      });
    });

    it("should pass rkey option", async () => {
      const mockResult: CreateResult = {
        uri: "at://did:plc:abc123/org.myapp.evaluation/custom-key",
        cid: "bafyreiabc123",
      };

      vi.mocked(mockRepo.records.create).mockResolvedValue(mockResult);

      await createSidecarRecord(
        mockRepo,
        "org.myapp.evaluation",
        { $type: "org.myapp.evaluation" },
        { rkey: "custom-key" },
      );

      expect(mockRepo.records.create).toHaveBeenCalledWith({
        collection: "org.myapp.evaluation",
        record: { $type: "org.myapp.evaluation" },
        rkey: "custom-key",
      });
    });
  });

  describe("attachSidecar", () => {
    it("should attach a sidecar to a main record", async () => {
      const mainRecord = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/main123",
        cid: "bafyreimain123",
      };

      const sidecarResult: CreateResult = {
        uri: "at://did:plc:abc123/org.myapp.evaluation/side456",
        cid: "bafyreiside456",
      };

      vi.mocked(mockRepo.records.create).mockResolvedValue(sidecarResult);

      const result = await attachSidecar(mockRepo, {
        mainRecord,
        sidecar: {
          collection: "org.myapp.evaluation",
          record: {
            $type: "org.myapp.evaluation",
            subject: mainRecord,
            score: 90,
          },
        },
      });

      expect(result.mainRecord).toEqual(mainRecord);
      expect(result.sidecarRecord).toEqual(sidecarResult);
      expect(mockRepo.records.create).toHaveBeenCalledWith({
        collection: "org.myapp.evaluation",
        record: {
          $type: "org.myapp.evaluation",
          subject: mainRecord,
          score: 90,
        },
        rkey: undefined,
      });
    });
  });

  describe("batchCreateSidecars", () => {
    it("should create multiple sidecar records", async () => {
      const mainRecord = {
        uri: "at://did:plc:abc123/org.hypercerts.claim.activity/main123",
        cid: "bafyreimain123",
      };

      const sidecarResults: CreateResult[] = [
        { uri: "at://did:plc:abc123/org.myapp.evaluation/side1", cid: "bafyreiside1" },
        { uri: "at://did:plc:abc123/org.myapp.comment/side2", cid: "bafyreiside2" },
      ];

      vi.mocked(mockRepo.records.create)
        .mockResolvedValueOnce(sidecarResults[0])
        .mockResolvedValueOnce(sidecarResults[1]);

      const sidecars = [
        {
          collection: "org.myapp.evaluation",
          record: { $type: "org.myapp.evaluation", subject: mainRecord, score: 85 },
        },
        {
          collection: "org.myapp.comment",
          record: { $type: "org.myapp.comment", subject: mainRecord, text: "Great!" },
        },
      ];

      const results = await batchCreateSidecars(mockRepo, sidecars);

      expect(results).toEqual(sidecarResults);
      expect(mockRepo.records.create).toHaveBeenCalledTimes(2);
    });

    it("should handle empty sidecars array", async () => {
      const results = await batchCreateSidecars(mockRepo, []);

      expect(results).toEqual([]);
      expect(mockRepo.records.create).not.toHaveBeenCalled();
    });
  });

  describe("createWithSidecars", () => {
    it("should create main record and sidecars", async () => {
      const mainResult: CreateResult = {
        uri: "at://did:plc:abc123/org.hypercerts.project/proj123",
        cid: "bafyreiproj123",
      };

      const sidecarResults: CreateResult[] = [
        { uri: "at://did:plc:abc123/org.hypercerts.claim.activity/claim1", cid: "bafyreiclaim1" },
        { uri: "at://did:plc:abc123/org.hypercerts.claim.activity/claim2", cid: "bafyreiclaim2" },
      ];

      vi.mocked(mockRepo.records.create)
        .mockResolvedValueOnce(mainResult)
        .mockResolvedValueOnce(sidecarResults[0])
        .mockResolvedValueOnce(sidecarResults[1]);

      const result = await createWithSidecars(mockRepo, {
        main: {
          collection: "org.hypercerts.project",
          record: {
            $type: "org.hypercerts.project",
            title: "Climate Initiative",
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
        sidecars: [
          {
            collection: "org.hypercerts.claim.activity",
            record: {
              $type: "org.hypercerts.claim.activity",
              title: "Tree Planting",
            },
          },
          {
            collection: "org.hypercerts.claim.activity",
            record: {
              $type: "org.hypercerts.claim.activity",
              title: "Carbon Measurement",
            },
          },
        ],
      });

      expect(result.main).toEqual(mainResult);
      expect(result.sidecars).toEqual(sidecarResults);
      expect(mockRepo.records.create).toHaveBeenCalledTimes(3);

      // Verify main record was created first
      expect(mockRepo.records.create).toHaveBeenNthCalledWith(1, {
        collection: "org.hypercerts.project",
        record: {
          $type: "org.hypercerts.project",
          title: "Climate Initiative",
          createdAt: "2024-01-01T00:00:00Z",
        },
        rkey: undefined,
      });

      // Verify sidecars were created after
      expect(mockRepo.records.create).toHaveBeenNthCalledWith(2, {
        collection: "org.hypercerts.claim.activity",
        record: {
          $type: "org.hypercerts.claim.activity",
          title: "Tree Planting",
        },
        rkey: undefined,
      });
    });

    it("should create main record without sidecars", async () => {
      const mainResult: CreateResult = {
        uri: "at://did:plc:abc123/org.hypercerts.project/proj123",
        cid: "bafyreiproj123",
      };

      vi.mocked(mockRepo.records.create).mockResolvedValue(mainResult);

      const result = await createWithSidecars(mockRepo, {
        main: {
          collection: "org.hypercerts.project",
          record: {
            $type: "org.hypercerts.project",
            title: "Solo Project",
          },
        },
        sidecars: [],
      });

      expect(result.main).toEqual(mainResult);
      expect(result.sidecars).toEqual([]);
      expect(mockRepo.records.create).toHaveBeenCalledTimes(1);
    });

    it("should pass options to record creation", async () => {
      const mainResult: CreateResult = {
        uri: "at://did:plc:abc123/org.hypercerts.project/custom-key",
        cid: "bafyreiproj123",
      };

      vi.mocked(mockRepo.records.create).mockResolvedValue(mainResult);

      await createWithSidecars(mockRepo, {
        main: {
          collection: "org.hypercerts.project",
          record: { $type: "org.hypercerts.project", title: "Test" },
          rkey: "custom-key",
        },
        sidecars: [],
      });

      expect(mockRepo.records.create).toHaveBeenCalledWith({
        collection: "org.hypercerts.project",
        record: { $type: "org.hypercerts.project", title: "Test" },
        rkey: "custom-key",
      });
    });
  });
});
