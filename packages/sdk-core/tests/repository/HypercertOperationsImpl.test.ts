import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@atproto/api";
import type { OrgHypercertsDefs } from "@hypercerts-org/lexicon";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import { createMockAgent, TEST_REPO_DID, TEST_PDS_URL } from "../utils/mocks.js";

function createWorkScopeAny(tags: string[]): OrgHypercertsDefs.WorkScopeAny {
  return {
    $type: "org.hypercerts.defs#workScopeAny",
    op: "any",
    args: tags.map((tag) => ({
      $type: "org.hypercerts.defs#workScopeAtom",
      atom: { uri: `at://did:plc:tag/${tag.toLowerCase()}#main`, cid: "bafybeig" },
    })),
  };
}

function createWorkScopeAll(tags: string[]): OrgHypercertsDefs.WorkScopeAll {
  return {
    $type: "org.hypercerts.defs#workScopeAll",
    op: "all",
    args: tags.map((tag) => ({
      $type: "org.hypercerts.defs#workScopeAtom",
      atom: { uri: `at://did:plc:tag/${tag.toLowerCase()}#main`, cid: "bafybeig" },
    })),
  };
}

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
      workScope: createWorkScopeAny(["Testing"]),
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

    it("should include rich text facets when provided", async () => {
      const shortDescriptionFacets = [
        {
          index: { byteStart: 13, byteEnd: 19 },
          features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:alice123" }],
        },
      ];

      const descriptionFacets = [
        {
          index: { byteStart: 6, byteEnd: 33 },
          features: [{ $type: "app.bsky.richtext.facet#link", uri: "https://example.com/cleanup" }],
        },
      ];

      await hypercertOps.create({
        ...validParams,
        shortDescription: "Organized by @alice",
        shortDescriptionFacets,
        description: "Visit https://example.com/cleanup for details",
        descriptionFacets,
      });

      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(hypercertCall.record.shortDescriptionFacets).toEqual(shortDescriptionFacets);
      expect(hypercertCall.record.descriptionFacets).toEqual(descriptionFacets);
    });

    it("should create hypercert without facets when not provided", async () => {
      await hypercertOps.create(validParams);

      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(hypercertCall.record.shortDescriptionFacets).toBeUndefined();
      expect(hypercertCall.record.descriptionFacets).toBeUndefined();
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
            workScope: createWorkScopeAll(["Testing"]),
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
      // Reset mocks and set up for location (new order: location → rights → hypercert)
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/app.certified.location/ghi", cid: "location-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        locations: [
          {
            lpVersion: "1.0.0",
            srs: "EPSG:4326",
            locationType: "coordinate-decimal",
            location: "https://example.com/location",
            name: "Test Location",
            description: "A test location",
          },
        ],
      });

      expect(result.locationUris).toEqual(["at://did:plc:test/app.certified.location/ghi"]);
      expect(result.locationCids).toEqual(["location-cid"]);
    });

    it("should attach multiple locations when provided", async () => {
      // Reset mocks and set up for multiple locations (location1 → location2 → rights → hypercert)
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/app.certified.location/loc1", cid: "location-cid-1" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/app.certified.location/loc2", cid: "location-cid-2" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        locations: [
          {
            lpVersion: "1.0.0",
            srs: "EPSG:4326",
            locationType: "coordinate-decimal",
            location: "https://example.com/location1",
            name: "Location 1",
          },
          {
            lpVersion: "1.0.0",
            srs: "EPSG:4326",
            locationType: "coordinate-decimal",
            location: "https://example.com/location2",
            name: "Location 2",
          },
        ],
      });

      expect(result.locationUris).toEqual([
        "at://did:plc:test/app.certified.location/loc1",
        "at://did:plc:test/app.certified.location/loc2",
      ]);
      expect(result.locationCids).toEqual(["location-cid-1", "location-cid-2"]);

      // Verify the hypercert record has both locations embedded
      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[3][0];
      expect(hypercertCall.record.locations).toHaveLength(2);
      expect(hypercertCall.record.locations[0]).toEqual({
        uri: "at://did:plc:test/app.certified.location/loc1",
        cid: "location-cid-1",
      });
      expect(hypercertCall.record.locations[1]).toEqual({
        uri: "at://did:plc:test/app.certified.location/loc2",
        cid: "location-cid-2",
      });
    });

    it("should create contributions when provided", async () => {
      // Contributors are now embedded in the claim record, not created as separate records
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer" }],
      });

      expect(result.hypercertUri).toBeDefined();

      // Verify contributors are embedded in the claim record
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors).toBeDefined();
      expect(createCall.record.contributors).toHaveLength(1);
      expect(createCall.record.contributors[0].contributorIdentity).toBe("did:plc:contrib1");
      expect(createCall.record.contributors[0].contributionDetails).toBe("Developer");
    });

    it("should create detailed contributions (StrongRef) when description is provided", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz", cid: "details-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer", description: "Backend work" }],
      });

      expect(result.hypercertUri).toBeDefined();

      // Verify contribution details record was created
      const contributionCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(contributionCall.collection).toBe("org.hypercerts.claim.contributionDetails");
      expect(contributionCall.record.role).toBe("Developer");
      expect(contributionCall.record.contributionDescription).toBe("Backend work");

      // Verify contributors use StrongRef in the claim record
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(createCall.record.contributors).toBeDefined();
      expect(createCall.record.contributors[0].contributorIdentity).toBe("did:plc:contrib1");
      expect(createCall.record.contributors[0].contributionDetails).toEqual({
        uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz",
        cid: "details-cid",
      });
    });

    it("should embed contributionWeight when provided", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer", weight: "0.75" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors[0].contributionWeight).toBe("0.75");
      expect(createCall.record.contributors[0].contributionDetails).toBe("Developer");
    });

    it("should omit contributionWeight when not provided", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors[0].contributionWeight).toBeUndefined();
    });

    it("should handle contributionWeight with description (StrongRef)", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz", cid: "details-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [
          { contributors: ["did:plc:contrib1"], role: "Developer", description: "Backend work", weight: "1.5" },
        ],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(createCall.record.contributors[0].contributionWeight).toBe("1.5");
      expect(createCall.record.contributors[0].contributionDetails).toEqual({
        uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz",
        cid: "details-cid",
      });
    });

    it("should support StrongRef for contributor identity", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const contributorRef = { uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz", cid: "profile-cid" };
      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: [contributorRef], role: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors[0].contributorIdentity).toEqual(contributorRef);
    });

    it("should support mixed string DIDs and StrongRefs for contributors", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const contributorRef = { uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz", cid: "profile-cid" };
      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:string-did", contributorRef], role: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors).toHaveLength(2);
      expect(createCall.record.contributors[0].contributorIdentity).toBe("did:plc:string-did");
      expect(createCall.record.contributors[1].contributorIdentity).toEqual(contributorRef);
    });

    it("should use contributionDetailsRef directly when provided", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const detailsRef = {
        uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/existing",
        cid: "existing-cid",
      };
      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], role: "Developer", contributionDetailsRef: detailsRef }],
      });

      // Should only create rights + hypercert, NOT contributionDetails (since ref was provided)
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(2);
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(createCall.record.contributors[0].contributionDetails).toEqual(detailsRef);
    });

    it("should pass through extra properties to contributionDetails record", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz", cid: "details-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [
          {
            contributors: ["did:plc:contrib1"],
            role: "Developer",
            description: "Backend work",
            customField: "custom value",
            anotherProp: 123,
          },
        ],
      });

      const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(detailsCall.record.customField).toBe("custom value");
      expect(detailsCall.record.anotherProp).toBe(123);
    });

    it("should include startDate and endDate in contributionDetails record", async () => {
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz", cid: "details-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [
          {
            contributors: ["did:plc:contrib1"],
            role: "Developer",
            description: "Backend work",
            startDate: "2024-01-15T00:00:00Z",
            endDate: "2024-06-30T23:59:59Z",
          },
        ],
      });

      // Verify contributionDetails record includes timeframe
      const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
      expect(detailsCall.record.startDate).toBe("2024-01-15T00:00:00Z");
      expect(detailsCall.record.endDate).toBe("2024-06-30T23:59:59Z");
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
        workScope: createWorkScopeAll(["Climate"]),
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
                workScope: createWorkScopeAll(["Climate"]),
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
                workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
            workScope: createWorkScopeAll(["Climate"]),
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
        items: [{ itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "50" }],
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
        items: [],
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should throw ValidationError for invalid collection data", async () => {
      const { validate } = await import("@hypercerts-org/lexicon");
      const mockValidate = validate as ReturnType<typeof vi.fn>;

      // Mock validation failure
      mockValidate.mockReturnValue({
        success: false,
        error: { message: "Missing required field: title" },
      });

      await expect(
        hypercertOps.createCollection({
          title: "", // Invalid: empty title
          items: [],
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        hypercertOps.createCollection({
          title: "",
          items: [],
        }),
      ).rejects.toThrow("Invalid collection record");

      // Reset mock to default success behavior for other tests
      mockValidate.mockReturnValue({ success: true });
    });

    it("should create a collection with inline location (StrongRef)", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "collection-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "My Collection",
        items: [],
        location: { uri: "at://did:plc:test/app.certified.location/loc123", cid: "location-cid" },
      });

      expect(result.uri).toContain("collection");
      expect(result.record.location?.uri).toEqual("at://did:plc:test/app.certified.location/loc123");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            location: expect.objectContaining({
              uri: "at://did:plc:test/app.certified.location/loc123",
              cid: "location-cid",
            }),
          }),
        }),
      );
    });

    it("should create a collection with inline location (AT-URI string)", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/app.certified.location/existing",
          cid: "existing-location-cid",
        },
      });
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "collection-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "My Collection",
        items: [],
        location: "at://did:plc:test/app.certified.location/existing",
      });

      expect(result.uri).toContain("collection");
      expect(result.record.location?.uri).toBe("at://did:plc:test/app.certified.location/existing");
      // Should have fetched the location to get CID
      expect(mockAgent.com.atproto.repo.getRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "app.certified.location",
          rkey: "existing",
        }),
      );
    });

    it("should create a collection with inline location (location object)", async () => {
      // Mock createRecord for location
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/app.certified.location/loc123", cid: "location-cid" },
      });
      // Mock createRecord for collection
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "collection-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "My Collection",
        items: [],
        location: {
          lpVersion: "1.0",
          srs: "EPSG:4326",
          locationType: "coordinate-decimal",
          location: "https://example.com/loc",
        },
      });

      expect(result.uri).toContain("collection");
      expect(result.record.location?.uri).toBe("at://did:plc:test/app.certified.location/loc123");
      // Should have created location first
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "app.certified.location",
        }),
      );
    });

    it("should create a collection with weighted items", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/weighted", cid: "weighted-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "Weighted Collection",
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "30" },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "70" },
        ],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "Weighted Collection",
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "30" },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "70" },
            ],
          }),
        }),
      );
    });

    it("should create a collection with mixed weighted and unweighted items", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/mixed", cid: "mixed-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "Mixed Collection",
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "50" },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" } }, // No weight
          { itemIdentifier: { uri: "at://claim3", cid: "cid3" }, itemWeight: "25" },
        ],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "50" },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
              { itemIdentifier: { uri: "at://claim3", cid: "cid3" }, itemWeight: "25" },
            ],
          }),
        }),
      );
    });

    it("should create a collection with items without weights", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/unweighted", cid: "unweighted-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "Unweighted Collection",
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" } },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
        ],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" } },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
            ],
          }),
        }),
      );
    });

    it("should create a collection with avatar and banner (Blob)", async () => {
      const avatarBlob = new Blob(["avatar"], { type: "image/png" });
      const bannerBlob = new Blob(["banner"], { type: "image/jpeg" });

      // Mock blob upload
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-avatar" },
            mimeType: "image/png",
            size: 100,
          },
        },
      });

      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-banner" },
            mimeType: "image/jpeg",
            size: 200,
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/branded", cid: "branded-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "Branded Collection",
        avatar: avatarBlob,
        banner: bannerBlob,
        items: [],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledTimes(2);
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "Branded Collection",
            avatar: expect.objectContaining({
              $type: "org.hypercerts.defs#smallImage",
            }),
            banner: expect.objectContaining({
              $type: "org.hypercerts.defs#largeImage",
            }),
          }),
        }),
      );
    });

    it("should create a collection with avatar and banner (URI strings)", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/uris", cid: "uris-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "Collection with URIs",
        avatar: "https://example.com/avatar.png",
        banner: "https://example.com/banner.jpg",
        items: [],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            avatar: expect.objectContaining({
              $type: "org.hypercerts.defs#uri",
              uri: "https://example.com/avatar.png",
            }),
            banner: expect.objectContaining({
              $type: "org.hypercerts.defs#uri",
              uri: "https://example.com/banner.jpg",
            }),
          }),
        }),
      );
    });

    it("should create a project with avatar and banner", async () => {
      const logoBlob = new Blob(["logo"], { type: "image/png" });
      const headerBlob = new Blob(["header"], { type: "image/jpeg" });

      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-logo" },
            mimeType: "image/png",
            size: 150,
          },
        },
      });

      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-header" },
            mimeType: "image/jpeg",
            size: 250,
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.collection/project123", cid: "project-cid" },
      });

      const result = await hypercertOps.createProject({
        title: "Climate Action Project",
        avatar: logoBlob,
        banner: headerBlob,
        shortDescription: "Community climate initiative",
        items: [],
      });

      expect(result.uri).toContain("collection");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "Climate Action Project",
            type: "project",
            avatar: expect.objectContaining({
              $type: "org.hypercerts.defs#smallImage",
            }),
            banner: expect.objectContaining({
              $type: "org.hypercerts.defs#largeImage",
            }),
          }),
        }),
      );
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

  describe("updateCollection", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "old-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Old Title",
            items: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/abc123", cid: "new-cid" },
      });
    });

    it("should update a collection successfully", async () => {
      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        title: "New Title",
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(result.cid).toBe("new-cid");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "New Title",
            items: [], // Preserved
            createdAt: "2024-01-01T00:00:00Z", // Preserved
          }),
        }),
      );
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(hypercertOps.updateCollection("invalid-uri", { title: "New Title" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NetworkError when collection not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        error: { message: "Not found" },
      });

      await expect(
        hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/missing", {
          title: "New Title",
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should prevent type changes", async () => {
      await expect(
        hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
          type: "project",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should update collection items with weights", async () => {
      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "40" },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "60" },
        ],
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "40" },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "60" },
            ],
          }),
        }),
      );
    });

    it("should update collection adding weights to existing items", async () => {
      // Setup: collection with unweighted items
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "old-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Collection",
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" } },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
            ],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "30" },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "70" },
        ],
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "30" },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "70" },
            ],
          }),
        }),
      );

      // Explicitly verify that itemWeight was added to both items
      const putRecordCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      const updatedItems = putRecordCall.record.items;
      expect(updatedItems[0]).toHaveProperty("itemWeight", "30");
      expect(updatedItems[1]).toHaveProperty("itemWeight", "70");
    });

    it("should update collection removing weights from items", async () => {
      // Setup: collection with weighted items
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "old-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Collection",
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" }, itemWeight: "50" },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" }, itemWeight: "50" },
            ],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        items: [
          { itemIdentifier: { uri: "at://claim1", cid: "cid1" } },
          { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
        ],
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");

      // Verify that putRecord was called
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            items: [
              { itemIdentifier: { uri: "at://claim1", cid: "cid1" } },
              { itemIdentifier: { uri: "at://claim2", cid: "cid2" } },
            ],
          }),
        }),
      );

      // Explicitly verify that itemWeight was removed from both items
      const putRecordCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      const updatedItems = putRecordCall.record.items;
      expect(updatedItems[0]).not.toHaveProperty("itemWeight");
      expect(updatedItems[1]).not.toHaveProperty("itemWeight");
    });

    it("should update collection avatar and banner (Blob)", async () => {
      const newAvatar = new Blob(["new-avatar"], { type: "image/png" });
      const newBanner = new Blob(["new-banner"], { type: "image/jpeg" });

      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-new-avatar" },
            mimeType: "image/png",
            size: 100,
          },
        },
      });

      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValueOnce({
        success: true,
        data: {
          blob: {
            $type: "blob",
            ref: { $link: "bafyrei-new-banner" },
            mimeType: "image/jpeg",
            size: 200,
          },
        },
      });

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        avatar: newAvatar,
        banner: newBanner,
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledTimes(2);
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            avatar: expect.objectContaining({
              $type: "org.hypercerts.defs#smallImage",
            }),
            banner: expect.objectContaining({
              $type: "org.hypercerts.defs#largeImage",
            }),
          }),
        }),
      );
    });

    it("should update collection avatar and banner (URI strings)", async () => {
      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        avatar: "https://example.com/new-avatar.png",
        banner: "https://example.com/new-banner.jpg",
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            avatar: expect.objectContaining({
              $type: "org.hypercerts.defs#uri",
              uri: "https://example.com/new-avatar.png",
            }),
            banner: expect.objectContaining({
              $type: "org.hypercerts.defs#uri",
              uri: "https://example.com/new-banner.jpg",
            }),
          }),
        }),
      );
    });

    it("should remove avatar and banner when set to null", async () => {
      // Setup: collection with avatar and banner
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "old-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Collection",
            items: [],
            avatar: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/old-avatar.png" },
            banner: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/old-banner.jpg" },
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        avatar: null,
        banner: null,
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.not.objectContaining({
            avatar: expect.anything(),
            banner: expect.anything(),
          }),
        }),
      );
    });

    it("should preserve avatar and banner when not updating them", async () => {
      // Setup: collection with avatar and banner
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "old-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Old Title",
            items: [],
            avatar: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/avatar.png" },
            banner: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/banner.jpg" },
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        title: "New Title",
        // Not updating avatar or banner
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            title: "New Title",
            avatar: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/avatar.png" },
            banner: { $type: "org.hypercerts.defs#uri", uri: "https://example.com/banner.jpg" },
          }),
        }),
      );
    });
  });

  describe("deleteCollection", () => {
    it("should delete a collection successfully", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
        success: true,
        data: {},
      });

      await expect(
        hypercertOps.deleteCollection(`at://${TEST_REPO_DID}/org.hypercerts.collection/abc123`),
      ).resolves.toBeUndefined();

      expect(mockAgent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: "org.hypercerts.collection",
        rkey: "abc123",
      });
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(hypercertOps.deleteCollection("invalid-uri")).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError on delete failure", async () => {
      mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
        success: false,
        error: { message: "Delete failed" },
      });

      await expect(hypercertOps.deleteCollection("at://did:plc:test/org.hypercerts.collection/abc123")).rejects.toThrow(
        NetworkError,
      );
    });
  });

  describe("attachLocationToCollection", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "collection-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Test Collection",
            items: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/abc123", cid: "updated-cid" },
      });
    });

    it("should attach location successfully", async () => {
      const result = await hypercertOps.attachLocationToCollection(
        `at://${TEST_REPO_DID}/org.hypercerts.collection/abc123`,
        { uri: `at://${TEST_REPO_DID}/app.certified.location/loc123`, cid: "location-cid" },
      );

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/app.certified.location/loc123`);
      expect(result.cid).toBe("location-cid");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            location: {
              $type: "com.atproto.repo.strongRef",
              uri: `at://${TEST_REPO_DID}/app.certified.location/loc123`,
              cid: "location-cid",
            },
          }),
        }),
      );
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(
        hypercertOps.attachLocationToCollection("invalid-uri", {
          uri: "at://location",
          cid: "cid",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError when collection not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        error: { message: "Not found" },
      });

      await expect(
        hypercertOps.attachLocationToCollection("at://did:plc:test/org.hypercerts.collection/missing", {
          uri: "at://location",
          cid: "cid",
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("removeLocationFromCollection", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "collection-cid",
          value: {
            $type: "org.hypercerts.collection",
            title: "Test Collection",
            items: [],
            createdAt: "2024-01-01T00:00:00Z",
            location: { uri: "at://location", cid: "location-cid" },
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/abc123", cid: "updated-cid" },
      });
    });

    it("should remove location successfully", async () => {
      await expect(
        hypercertOps.removeLocationFromCollection("at://did:plc:test/org.hypercerts.collection/abc123"),
      ).resolves.toBeUndefined();

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.not.objectContaining({
            location: expect.anything(),
          }),
        }),
      );
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(hypercertOps.removeLocationFromCollection("invalid-uri")).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError when collection not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        error: { message: "Not found" },
      });

      await expect(
        hypercertOps.removeLocationFromCollection("at://did:plc:test/org.hypercerts.collection/missing"),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("Project Operations", () => {
    // Projects are collections with type='project'
    // createProject now calls createCollection with type="project" in a single step
    describe("createProject", () => {
      beforeEach(() => {
        // Mock createRecord for createCollection call
        mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123", cid: "project-cid" },
        });
      });

      it("should create a project with required fields only", async () => {
        const result = await hypercertOps.createProject({
          title: "Test Project",
          items: [],
        });

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.collection/abc123");
        expect(result.cid).toBe("project-cid");
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: "org.hypercerts.claim.collection",
            record: expect.objectContaining({
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Test Project",
              createdAt: expect.any(String),
            }),
          }),
        );
      });

      it("should create a project with all optional fields", async () => {
        const description = { blocks: [] };
        const items = [
          { itemIdentifier: { uri: "at://activity1", cid: "cid1" }, itemWeight: "50" },
          { itemIdentifier: { uri: "at://activity2", cid: "cid2" }, itemWeight: "50" },
        ];

        const result = await hypercertOps.createProject({
          title: "Complete Project",
          shortDescription: "A complete project with all fields",
          description,
          items,
        });

        expect(result.uri).toBeDefined();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.description).toEqual(description);
        expect(createCall.record.items).toEqual(items);
      });

      it("should upload avatar blob when provided", async () => {
        const avatarBlob = new Blob(["avatar data"], { type: "image/png" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: {
              ref: { $link: "avatar-cid" },
              mimeType: "image/png",
              size: 100,
            },
          },
        });

        await hypercertOps.createProject({
          title: "Project with Avatar",
          items: [],
          avatar: avatarBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.avatar).toEqual({
          $type: "org.hypercerts.defs#smallImage",
          image: { ref: { $link: "avatar-cid" }, mimeType: "image/png", size: 100 },
        });
      });

      it("should upload banner blob when provided", async () => {
        const bannerBlob = new Blob(["banner data"], { type: "image/jpeg" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: {
              ref: { $link: "banner-cid" },
              mimeType: "image/jpeg",
              size: 200,
            },
          },
        });

        await hypercertOps.createProject({
          title: "Project with Banner",
          items: [],
          banner: bannerBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.banner).toEqual({
          $type: "org.hypercerts.defs#largeImage",
          image: { ref: { $link: "banner-cid" }, mimeType: "image/jpeg", size: 200 },
        });
      });

      it("should upload both avatar and banner when provided", async () => {
        const avatarBlob = new Blob(["avatar"], { type: "image/png" });
        const bannerBlob = new Blob(["banner"], { type: "image/jpeg" });

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
              blob: { ref: { toString: () => "banner-cid" }, mimeType: "image/jpeg", size: 100 },
            },
          });

        await hypercertOps.createProject({
          title: "Full Project",
          items: [],
          avatar: avatarBlob,
          banner: bannerBlob,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalledTimes(2);
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.avatar).toBeDefined();
        expect(createCall.record.banner).toBeDefined();
      });

      it("should pass items array to record", async () => {
        const items = [
          { itemIdentifier: { uri: "at://act1", cid: "cid1" }, itemWeight: "30" },
          { itemIdentifier: { uri: "at://act2", cid: "cid2" }, itemWeight: "70" },
        ];

        await hypercertOps.createProject({
          title: "Project with Items",
          items,
        });

        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
        expect(createCall.record.items).toEqual(items);
      });

      it("should emit projectCreated event", async () => {
        const handler = vi.fn();
        hypercertOps.on("projectCreated", handler);

        await hypercertOps.createProject({
          title: "Event Test",
          items: [],
        });

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
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
            items: [],
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
            items: [],
            avatar: avatarBlob,
          }),
        ).rejects.toThrow(NetworkError);
      });
    });

    describe("getProject", () => {
      it("should get a project successfully", async () => {
        // Projects are collections with type='project'
        const mockRecord = {
          $type: "org.hypercerts.claim.collection",
          type: "project",
          title: "Test Project",
          shortDescription: "A test project",
          items: [],
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "project-cid",
            value: mockRecord,
          },
        });

        const result = await hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.collection/abc123");

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.collection/abc123");
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
          hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.collection/notfound"),
        ).rejects.toThrow(NetworkError);
      });

      it("should handle project with all optional fields", async () => {
        // Projects are collections with type='project'
        const mockRecord = {
          $type: "org.hypercerts.claim.collection",
          type: "project",
          title: "Complete Project",
          shortDescription: "Full project",
          description: { type: "linearDocument", content: "Rich" },
          avatar: { $type: "blob", ref: { $link: "avatar-cid" } },
          banner: { $type: "blob", ref: { $link: "cover-cid" } },
          items: [{ itemIdentifier: { uri: "at://act", cid: "cid" }, itemWeight: "100" }],
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/complete",
            cid: "cid",
            value: mockRecord,
          },
        });

        const result = await hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.collection/complete");

        expect(result.record.description).toEqual({ type: "linearDocument", content: "Rich" });
        expect(result.record.items).toHaveLength(1);
      });

      it("should throw ValidationError when record is not a project", async () => {
        // A collection with type='favorites' should not be returned as a project
        const mockRecord = {
          $type: "org.hypercerts.claim.collection",
          type: "favorites",
          title: "My Favorites",
          items: [],
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/fav",
            cid: "cid",
            value: mockRecord,
          },
        });

        await expect(hypercertOps.getProject("at://did:plc:test/org.hypercerts.claim.collection/fav")).rejects.toThrow(
          ValidationError,
        );
      });
    });

    describe("listProjects", () => {
      it("should list projects successfully", async () => {
        // Lists collections and filters for type='project'
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/1",
                cid: "cid1",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 1",
                  shortDescription: "First project",
                  items: [],
                  createdAt: "2024-01-01T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/2",
                cid: "cid2",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 2",
                  shortDescription: "Second project",
                  items: [],
                  createdAt: "2024-01-02T00:00:00Z",
                },
              },
            ],
            cursor: undefined,
          },
        });

        const result = await hypercertOps.listProjects({ limit: 10 });

        expect(result.records).toHaveLength(2);
        expect(result.records[0].record.title).toBe("Project 1");
        expect(result.records[1].record.title).toBe("Project 2");
        expect(result.cursor).toBeUndefined();
        expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.collection",
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
          collection: "org.hypercerts.claim.collection",
          cursor: "previous-cursor",
          limit: 20,
        });
      });

      it("should filter out non-project collections", async () => {
        mockAgent.com.atproto.repo.listRecords.mockResolvedValue({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/1",
                cid: "cid1",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 1",
                  items: [],
                  createdAt: "2024-01-01T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/2",
                cid: "cid2",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "favorites", // Not a project
                  title: "My Favorites",
                  items: [],
                  createdAt: "2024-01-02T00:00:00Z",
                },
              },
            ],
            cursor: undefined,
          },
        });

        const result = await hypercertOps.listProjects();

        // Should only return the project, not the favorites collection
        expect(result.records).toHaveLength(1);
        expect(result.records[0].record.title).toBe("Project 1");
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

      it("should loop-fetch when cursor is returned and limit is specified", async () => {
        // First page: 2 projects with cursor
        mockAgent.com.atproto.repo.listRecords.mockResolvedValueOnce({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/1",
                cid: "cid1",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 1",
                  items: [],
                  createdAt: "2024-01-01T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/2",
                cid: "cid2",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 2",
                  items: [],
                  createdAt: "2024-01-02T00:00:00Z",
                },
              },
            ],
            cursor: "page2",
          },
        });

        // Second page: 2 more projects with no cursor
        mockAgent.com.atproto.repo.listRecords.mockResolvedValueOnce({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/3",
                cid: "cid3",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 3",
                  items: [],
                  createdAt: "2024-01-03T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/4",
                cid: "cid4",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 4",
                  items: [],
                  createdAt: "2024-01-04T00:00:00Z",
                },
              },
            ],
            cursor: undefined,
          },
        });

        const result = await hypercertOps.listProjects({ limit: 10 });

        // Should have fetched both pages
        expect(result.records).toHaveLength(4);
        expect(result.records[0].record.title).toBe("Project 1");
        expect(result.records[3].record.title).toBe("Project 4");
        expect(result.cursor).toBeUndefined();
        expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledTimes(2);
      });

      it("should stop fetching when limit is reached", async () => {
        // First page: 2 projects with cursor
        mockAgent.com.atproto.repo.listRecords.mockResolvedValueOnce({
          success: true,
          data: {
            records: [
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/1",
                cid: "cid1",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 1",
                  items: [],
                  createdAt: "2024-01-01T00:00:00Z",
                },
              },
              {
                uri: "at://did:plc:test/org.hypercerts.claim.collection/2",
                cid: "cid2",
                value: {
                  $type: "org.hypercerts.claim.collection",
                  type: "project",
                  title: "Project 2",
                  items: [],
                  createdAt: "2024-01-02T00:00:00Z",
                },
              },
            ],
            cursor: "page2",
          },
        });

        const result = await hypercertOps.listProjects({ limit: 2 });

        // Should only return first 2 projects
        expect(result.records).toHaveLength(2);
        expect(result.records[0].record.title).toBe("Project 1");
        expect(result.records[1].record.title).toBe("Project 2");
        expect(result.cursor).toBe("page2");
        expect(mockAgent.com.atproto.repo.listRecords).toHaveBeenCalledTimes(1);
      });
    });

    describe("updateProject", () => {
      beforeEach(() => {
        // Projects are collections with type='project'
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "old-cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Old Title",
              shortDescription: "Old description",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123", cid: "new-cid" },
        });
      });

      it("should update project title", async () => {
        const result = await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "New Title",
        });

        expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.collection/abc123");
        expect(result.cid).toBe("new-cid");

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.title).toBe("New Title");
        expect(putCall.record.shortDescription).toBe("Old description"); // Preserved
      });

      it("should update shortDescription", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          shortDescription: "New short description",
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.shortDescription).toBe("New short description");
        expect(putCall.record.title).toBe("Old Title"); // Preserved
      });

      it("should preserve createdAt timestamp", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "Updated",
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.createdAt).toBe("2024-01-01T00:00:00Z");
      });

      it("should update description", async () => {
        const newDescription = { type: "linearDocument", content: "New rich content" };

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          description: newDescription,
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.description).toEqual(newDescription);
      });

      it("should upload and update avatar", async () => {
        const newAvatar = new Blob(["new avatar"], { type: "image/png" });
        const mockRef = { toString: () => "new-avatar-cid" };
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: { ref: mockRef, mimeType: "image/png", size: 150 },
          },
        });

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          avatar: newAvatar,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.avatar).toEqual({
          $type: "org.hypercerts.defs#smallImage",
          image: { ref: mockRef, mimeType: "image/png", size: 150 },
        });
      });

      it("should upload and update banner", async () => {
        const newBanner = new Blob(["new banner"], { type: "image/jpeg" });
        mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
          success: true,
          data: {
            blob: { ref: { toString: () => "new-banner-cid" }, mimeType: "image/jpeg", size: 250 },
          },
        });

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          banner: newBanner,
        });

        expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.banner).toBeDefined();
      });

      it("should update items array", async () => {
        const newItems = [
          { itemIdentifier: { uri: "at://new-act1", cid: "new-cid1" }, itemWeight: "40" },
          { itemIdentifier: { uri: "at://new-act2", cid: "new-cid2" }, itemWeight: "60" },
        ];

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          items: newItems,
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.items).toEqual(newItems);
      });

      it("should update multiple fields at once", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "Multi Update",
          shortDescription: "Updated multiple fields",
          items: [{ itemIdentifier: { uri: "at://act", cid: "cid" }, itemWeight: "100" }],
        });

        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
        expect(putCall.record.title).toBe("Multi Update");
        expect(putCall.record.shortDescription).toBe("Updated multiple fields");
        expect(putCall.record.items).toHaveLength(1);
        expect(putCall.record.createdAt).toBe("2024-01-01T00:00:00Z"); // Still preserved
      });

      it("should emit projectUpdated event", async () => {
        const handler = vi.fn();
        hypercertOps.on("projectUpdated", handler);

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "Updated",
        });

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
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
          hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", { title: "New" }),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw NetworkError when put fails", async () => {
        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: false,
        });

        await expect(
          hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", { title: "New" }),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw ValidationError when record is not a project", async () => {
        // Mock a collection with type='favorites' instead of type='project'
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/fav",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "favorites",
              title: "My Favorites",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        await expect(
          hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/fav", { title: "New" }),
        ).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError for invalid collection data", async () => {
        const { validate } = await import("@hypercerts-org/lexicon");
        const mockValidate = validate as ReturnType<typeof vi.fn>;

        // Mock successful getRecord (already set in beforeEach, but let's be explicit)
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Old Title",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        // updateProject flow:
        // 1. getRecord in updateProject (no validation)
        // 2. updateCollection getRecord (no validation - reads directly)
        // 3. validation before putRecord in updateCollection (line 1709) - should fail here
        mockValidate.mockReturnValueOnce({
          success: false,
          error: { message: "Invalid title format" },
        }); // Validation before putRecord - should fail

        const result = hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "", // Invalid: empty title
        });

        await expect(result).rejects.toThrow(ValidationError);
        await expect(result).rejects.toThrow("Invalid collection record");

        // Reset mock to default success behavior for other tests
        mockValidate.mockReturnValue({ success: true });
      });
    });

    describe("deleteProject", () => {
      beforeEach(() => {
        // Mock getRecord to return a valid project (collection with type='project')
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Test Project",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });
      });

      it("should delete a project successfully", async () => {
        mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
          success: true,
        });

        await expect(
          hypercertOps.deleteProject(`at://${TEST_REPO_DID}/org.hypercerts.claim.collection/abc123`),
        ).resolves.toBeUndefined();

        expect(mockAgent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.collection",
          rkey: "abc123",
        });
      });

      it("should emit projectDeleted event", async () => {
        mockAgent.com.atproto.repo.deleteRecord.mockResolvedValue({
          success: true,
        });

        const handler = vi.fn();
        hypercertOps.on("projectDeleted", handler);

        await hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.collection/abc123");

        expect(handler).toHaveBeenCalledWith({
          uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
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
          hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.collection/abc123"),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw ValidationError when record is not a project", async () => {
        // Mock a collection with type='favorites' instead of type='project'
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/fav",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "favorites",
              title: "My Favorites",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        await expect(
          hypercertOps.deleteProject("at://did:plc:test/org.hypercerts.claim.collection/fav"),
        ).rejects.toThrow(ValidationError);
      });
    });

    describe("attachLocationToProject", () => {
      beforeEach(() => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "project-cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Test Project",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123", cid: "updated-cid" },
        });
      });

      it("should attach location successfully", async () => {
        const result = await hypercertOps.attachLocationToProject(
          `at://${TEST_REPO_DID}/org.hypercerts.claim.collection/abc123`,
          { uri: `at://${TEST_REPO_DID}/app.certified.location/loc123`, cid: "location-cid" },
        );

        expect(result.uri).toBe(`at://${TEST_REPO_DID}/app.certified.location/loc123`);
        expect(result.cid).toBe("location-cid");
        expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            record: expect.objectContaining({
              location: {
                $type: "com.atproto.repo.strongRef",
                uri: `at://${TEST_REPO_DID}/app.certified.location/loc123`,
                cid: "location-cid",
              },
            }),
          }),
        );
      });

      it("should throw ValidationError for invalid URI format", async () => {
        await expect(
          hypercertOps.attachLocationToProject("invalid-uri", {
            uri: "at://location",
            cid: "cid",
          }),
        ).rejects.toThrow(ValidationError);
      });

      it("should throw NetworkError when project not found", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: false,
          error: { message: "Not found" },
        });

        await expect(
          hypercertOps.attachLocationToProject("at://did:plc:test/org.hypercerts.claim.collection/missing", {
            uri: "at://location",
            cid: "cid",
          }),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw ValidationError when record is not a project", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/fav",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "favorites",
              title: "My Favorites",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        await expect(
          hypercertOps.attachLocationToProject("at://did:plc:test/org.hypercerts.claim.collection/fav", {
            uri: "at://location",
            cid: "cid",
          }),
        ).rejects.toThrow(ValidationError);
      });
    });

    describe("removeLocationFromProject", () => {
      beforeEach(() => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
            cid: "project-cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "project",
              title: "Test Project",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
              location: { uri: "at://location", cid: "location-cid" },
            },
          },
        });

        mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123", cid: "updated-cid" },
        });
      });

      it("should remove location successfully", async () => {
        await expect(
          hypercertOps.removeLocationFromProject("at://did:plc:test/org.hypercerts.claim.collection/abc123"),
        ).resolves.toBeUndefined();

        expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            record: expect.not.objectContaining({
              location: expect.anything(),
            }),
          }),
        );
      });

      it("should throw ValidationError for invalid URI format", async () => {
        await expect(hypercertOps.removeLocationFromProject("invalid-uri")).rejects.toThrow(ValidationError);
      });

      it("should throw NetworkError when project not found", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: false,
          error: { message: "Not found" },
        });

        await expect(
          hypercertOps.removeLocationFromProject("at://did:plc:test/org.hypercerts.claim.collection/missing"),
        ).rejects.toThrow(NetworkError);
      });

      it("should throw ValidationError when record is not a project", async () => {
        mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.collection/fav",
            cid: "cid",
            value: {
              $type: "org.hypercerts.claim.collection",
              type: "favorites",
              title: "My Favorites",
              items: [],
              createdAt: "2024-01-01T00:00:00Z",
              location: { uri: "at://location", cid: "location-cid" },
            },
          },
        });

        await expect(
          hypercertOps.removeLocationFromProject("at://did:plc:test/org.hypercerts.claim.collection/fav"),
        ).rejects.toThrow(ValidationError);
      });
    });
  });
});
