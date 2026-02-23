import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlobRef, type Agent } from "@atproto/api";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { NetworkError, ValidationError } from "../../src/core/errors.js";
import type {
  BlobOperations,
  ContributorIdentityParams,
  ContributionDetailsParams,
} from "../../src/repository/interfaces.js";
import type { RefUri } from "../../src/services/hypercerts/types.js";
import type { ProgressStep, UpdateResult } from "../../src/repository/types.js";
import { createMockAgent, createMockBlobOperations, createMockBlobRef, TEST_REPO_DID } from "../utils/mocks.js";

/**
 * Create a simple string work scope for testing.
 * In beta.12+, workScope is now a union of string | StrongRef.
 * For backward compatibility with tests, accepts an array and joins them.
 */
function createWorkScopeString(scopes: string[]): string {
  return scopes.join(", ");
}

/**
 * Test-only subclass that exposes protected methods for unit testing.
 * This allows us to test internal implementation details while maintaining
 * type safety and avoiding ESLint warnings from 'as any' assertions.
 */
class TestableHypercertOperations extends HypercertOperationsImpl {
  // Expose protected methods as public for testing
  public async testBuildContributorEntries(
    contributorParams: Array<ContributorIdentityParams>,
    detailsParams: ContributionDetailsParams,
    weight?: string,
    onProgress?: (step: ProgressStep) => void,
  ) {
    return this.buildContributorEntries(contributorParams, detailsParams, weight, onProgress);
  }

  public async testAttachContributorsToHypercert(
    hypercertUri: string,
    newContributors: Array<{
      contributorIdentity: RefUri;
      contributionWeight?: string;
      contributionDetails?: RefUri;
    }>,
  ): Promise<UpdateResult> {
    return this.attachContributorsToHypercert(hypercertUri, newContributors);
  }
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
  let mockBlobs: ReturnType<typeof createMockBlobOperations>;
  let hypercertOps: TestableHypercertOperations;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    mockBlobs = createMockBlobOperations(vi);
    hypercertOps = new TestableHypercertOperations(
      mockAgent as unknown as Agent,
      TEST_REPO_DID,
      mockBlobs as BlobOperations,
    );
  });

  describe("create", () => {
    const validParams = {
      title: "Test Hypercert",
      shortDescription: "A test hypercert",
      description: "A test hypercert for unit testing",
      workScope: createWorkScopeString(["Testing"]),
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

    it("should upload image and include in hypercert with correct wrapper", async () => {
      const imageBlob = new Blob(["image data"], { type: "image/png" });
      const mockBlobRef = createMockBlobRef({ mimeType: "image/png", size: 1024 });
      mockBlobs.upload.mockResolvedValue(mockBlobRef);

      await hypercertOps.create({
        ...validParams,
        image: imageBlob,
      });

      expect(mockBlobs.upload).toHaveBeenCalledWith(imageBlob);

      // Verify the hypercert record (second createRecord call)
      const hypercertCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(hypercertCall.record.image).toEqual({
        $type: "org.hypercerts.defs#smallImage",
        image: mockBlobRef,
      });
      expect(hypercertCall.record.image.$type).toBe("org.hypercerts.defs#smallImage");
      expect(hypercertCall.record.image.image).toBeInstanceOf(BlobRef);
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

    it("should create attachment records when provided", async () => {
      const attachments = [
        {
          content: "https://example.com/attachment",
          title: "Attachment Document",
          shortDescription: "Supporting attachment",
        },
      ];

      // Mock getRecord for attachment creation (called by addAttachment)
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.record/def456",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: createWorkScopeString(["Testing"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      // Mock attachment record creation (third createRecord call after rights and hypercert)
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.attachment/attachment123", cid: "attachment-cid" },
      });

      const result = await hypercertOps.create({
        ...validParams,
        attachments,
      });

      // Verify attachment records were created
      expect(result.attachmentUris).toBeDefined();
      expect(result.attachmentUris).toHaveLength(1);
      expect(result.attachmentUris?.[0]).toContain("attachment");

      // Verify createRecord was called for attachment (3rd call: rights, hypercert, attachment)
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(3);
      const attachmentCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(attachmentCall.collection).toBe("org.hypercerts.claim.attachment");
      expect(attachmentCall.record.title).toBe("Attachment Document");
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
      // String DIDs are converted to contributorInformation records first
      mockAgent.com.atproto.repo.createRecord.mockReset();
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], contributionDetails: "Developer" }],
      });

      expect(result.hypercertUri).toBeDefined();

      // Verify contributorInformation record was created
      const contributorCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(contributorCall.collection).toBe("org.hypercerts.claim.contributorInformation");
      expect(contributorCall.record.identifier).toBe("did:plc:contrib1");

      // Verify contributors are embedded in the claim record with StrongRef (includes $type)
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(createCall.record.contributors).toBeDefined();
      expect(createCall.record.contributors).toHaveLength(1);
      expect(createCall.record.contributors[0].contributorIdentity).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
        cid: "contributor-cid",
      });
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      const result = await hypercertOps.create({
        ...validParams,
        contributions: [
          {
            contributors: ["did:plc:contrib1"],
            contributionDetails: { role: "Developer", contributionDescription: "Backend work" },
          },
        ],
      });

      expect(result.hypercertUri).toBeDefined();

      // Verify contribution details record was created
      const contributionCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(contributionCall.collection).toBe("org.hypercerts.claim.contributionDetails");
      expect(contributionCall.record.role).toBe("Developer");
      expect(contributionCall.record.contributionDescription).toBe("Backend work");

      // Verify contributors use StrongRef in the claim record (with $type for lexicon validation)
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[3][0];
      expect(createCall.record.contributors).toBeDefined();
      expect(createCall.record.contributors[0].contributorIdentity).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
        cid: "contributor-cid",
      });
      expect(createCall.record.contributors[0].contributionDetails).toEqual({
        $type: "com.atproto.repo.strongRef",
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], contributionDetails: "Developer", weight: "0.75" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:contrib1"], contributionDetails: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
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
            contributionDetails: { role: "Developer", contributionDescription: "Backend work" },
            weight: "1.5",
          },
        ],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[3][0];
      expect(createCall.record.contributors[0].contributionWeight).toBe("1.5");
      expect(createCall.record.contributors[0].contributionDetails).toEqual({
        $type: "com.atproto.repo.strongRef",
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

      // When a StrongRef is provided directly, no contributorInformation record is created
      const contributorRef = { uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz", cid: "profile-cid" };
      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: [contributorRef], contributionDetails: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      // StrongRef gets $type added for lexicon validation
      expect(createCall.record.contributors[0].contributorIdentity).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz",
        cid: "profile-cid",
      });
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/string-did",
            cid: "string-contributor-cid",
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.record/def", cid: "hypercert-cid" },
        });

      // String DID creates a contributorInformation record, StrongRef is used directly
      const contributorRef = { uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz", cid: "profile-cid" };
      await hypercertOps.create({
        ...validParams,
        contributions: [{ contributors: ["did:plc:string-did", contributorRef], contributionDetails: "Developer" }],
      });

      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(createCall.record.contributors).toHaveLength(2);
      // String DID gets converted to StrongRef pointing to contributorInformation record
      expect(createCall.record.contributors[0].contributorIdentity).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/string-did",
        cid: "string-contributor-cid",
      });
      // Provided StrongRef gets $type added
      expect(createCall.record.contributors[1].contributorIdentity).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.actor.profile/xyz",
        cid: "profile-cid",
      });
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
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
        contributions: [{ contributors: ["did:plc:contrib1"], contributionDetails: detailsRef }],
      });

      // Should create rights + contributorInformation + hypercert (NOT contributionDetails since ref was provided)
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(3);
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[2][0];
      expect(createCall.record.contributors[0].contributionDetails).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/existing",
        cid: "existing-cid",
      });
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
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
            contributionDetails: {
              role: "Developer",
              contributionDescription: "Backend work",
              customField: "custom value",
              anotherProp: 123,
            },
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
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
            cid: "contributor-cid",
          },
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
            contributionDetails: {
              role: "Developer",
              contributionDescription: "Backend work",
              startDate: "2024-01-15T00:00:00Z",
              endDate: "2024-06-30T23:59:59Z",
            },
          },
        ],
      });

      // Verify contributionDetails record includes timeframe
      const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
      expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
      expect(detailsCall.record.startDate).toBe("2024-01-15T00:00:00Z");
      expect(detailsCall.record.endDate).toBe("2024-06-30T23:59:59Z");
    });

    describe("contributionDetails $type and createdAt preservation", () => {
      it("should preserve caller-supplied createdAt in contributionDetails record", async () => {
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
            data: {
              uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
              cid: "contributor-cid",
            },
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
              contributionDetails: {
                role: "Developer",
                contributionDescription: "Backend work",
                createdAt: "2024-01-15T00:00:00.000Z",
              },
            },
          ],
        });

        const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
        expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
        expect(detailsCall.record.createdAt).toBe("2024-01-15T00:00:00.000Z");
      });

      it("should default createdAt when not provided in contributionDetails", async () => {
        const fakeNow = "2025-06-01T12:00:00.000Z";
        vi.useFakeTimers();
        vi.setSystemTime(new Date(fakeNow));

        try {
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
              data: {
                uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
                cid: "contributor-cid",
              },
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
                contributionDetails: {
                  role: "Developer",
                  contributionDescription: "Backend work",
                  // no createdAt provided
                },
              },
            ],
          });

          const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
          expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
          expect(detailsCall.record.createdAt).toBe(fakeNow);
        } finally {
          vi.useRealTimers();
        }
      });

      it("should preserve caller-supplied $type in contributionDetails record", async () => {
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
            data: {
              uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
              cid: "contributor-cid",
            },
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
              contributionDetails: {
                role: "Developer",
                contributionDescription: "Backend work",
                $type: "org.custom.contributionDetails",
              },
            },
          ],
        });

        const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
        expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
        expect(detailsCall.record.$type).toBe("org.custom.contributionDetails");
      });

      it("should default $type when not provided in contributionDetails", async () => {
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
            data: {
              uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/contrib1",
              cid: "contributor-cid",
            },
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
              contributionDetails: {
                role: "Developer",
                contributionDescription: "Backend work",
                // no $type provided
              },
            },
          ],
        });

        const detailsCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0];
        expect(detailsCall.collection).toBe("org.hypercerts.claim.contributionDetails");
        expect(detailsCall.record.$type).toBe("org.hypercerts.claim.contributionDetails");
      });
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
        workScope: createWorkScopeString(["Climate"]),
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
                workScope: createWorkScopeString(["Climate"]),
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
                workScope: createWorkScopeString(["Climate"]),
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
            workScope: createWorkScopeString(["Climate"]),
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

    it("should upload new image with correct wrapper", async () => {
      const imageBlob = new Blob(["new image"], { type: "image/png" });
      const mockBlobRef = createMockBlobRef({ mimeType: "image/png", size: 2048 });
      mockBlobs.upload.mockResolvedValue(mockBlobRef);

      await hypercertOps.update({
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        updates: {},
        image: imageBlob,
      });

      expect(mockBlobs.upload).toHaveBeenCalledWith(imageBlob);

      // Verify the putRecord call
      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.image).toEqual({
        $type: "org.hypercerts.defs#smallImage",
        image: mockBlobRef,
      });
      expect(putCall.record.image.$type).toBe("org.hypercerts.defs#smallImage");
      expect(putCall.record.image.image).toBeInstanceOf(BlobRef);
    });

    it("should remove image when set to null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          cid: "bafyreiabc123",
          uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
          value: {
            title: "Title",
            description: "Desc",
            workScope: createWorkScopeString(["Climate"]),
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

    it("should update contributors array", async () => {
      const newContributors = [
        {
          contributorIdentity: {
            uri: `at://${TEST_REPO_DID}/org.hypercerts.claim.contributorInformation/xyz`,
            cid: "contributor-cid",
            $type: "com.atproto.repo.strongRef" as const,
          },
          contributionDetails: "Lead Developer",
          contributionWeight: "2.0",
        },
      ];

      await hypercertOps.update({
        uri: `at://${TEST_REPO_DID}/org.hypercerts.claim.activity/abc123`,
        updates: {
          contributors: newContributors,
        },
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.contributors).toEqual(newContributors);
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
            workScope: createWorkScopeString(["Climate"]),
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
      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "application/geo+json" }));

      const result = await hypercertOps.attachLocation(hypercertUri, {
        lpVersion: "1.0.0",
        locationType: "coordinate-decimal",
        location: blob,
        srs: "EPSG:4326",
      });

      expect(result.uri).toContain("location");
      expect(mockBlobs.upload).toHaveBeenCalledWith(blob);

      // Check the location record that was created
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify the location wrapper type
      expect(call.record.location.$type).toBe("org.hypercerts.defs#smallBlob");

      // Verify blob is a BlobRef instance with correct properties
      expect(call.record.location.blob).toBeInstanceOf(BlobRef);
      expect(call.record.location.blob.mimeType).toBe("application/geo+json");
      expect(call.record.location.blob.size).toBe(100);
      expect(call.record.location.blob.ref).toBeDefined();
    });

    it("should attach a location using a simple text string (beta.13+ format)", async () => {
      const hypercertUri = "at://did:plc:test/org.hypercerts.claim.record/abc";
      const result = await hypercertOps.attachLocation(hypercertUri, {
        lpVersion: "1.0.0",
        locationType: "coordinate-decimal",
        location: "New York, NY, USA", // Simple text string, not a URL
        srs: "EPSG:4326",
        name: "Project Site",
      });

      expect(result.uri).toContain("location");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Simple text strings get wrapped in URI ref format
      expect(call.record.location).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "New York, NY, USA",
      });
      expect(call.record.name).toBe("Project Site");
    });

    it("should attach a location using a geo: URI string", async () => {
      const hypercertUri = "at://did:plc:test/org.hypercerts.claim.record/abc";
      const result = await hypercertOps.attachLocation(hypercertUri, {
        lpVersion: "1.0.0",
        locationType: "coordinate-decimal",
        location: "geo:37.7749,-122.4194", // geo: URI scheme
        srs: "EPSG:4326",
      });

      expect(result.uri).toContain("location");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // geo: URIs also get wrapped in URI ref format
      expect(call.record.location).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "geo:37.7749,-122.4194",
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

  describe("buildContributorEntries (helper)", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/xyz", cid: "record-cid" },
      });
    });

    it("should resolve inline role string", async () => {
      const result = await hypercertOps.testBuildContributorEntries(
        ["did:plc:user1"],
        "Developer",
        undefined,
        undefined,
      );

      expect(result).toHaveLength(1);
      expect(result[0].contributionDetails).toBe("Developer");
      expect(result[0].contributorIdentity).toMatchObject({
        uri: expect.stringContaining("contributorInformation"),
        cid: "record-cid",
      });
    });

    it("should create contributionDetails record from object", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/xyz", cid: "details-cid" },
      });

      const result = await hypercertOps.testBuildContributorEntries(
        ["did:plc:user1"],
        {
          role: "Project Lead",
          contributionDescription: "Led project",
          startDate: "2024-01-01",
          endDate: "2024-06-30",
        },
        "2.0",
        undefined,
      );

      expect(result).toHaveLength(1);
      expect(result[0].contributionDetails).toMatchObject({
        uri: expect.stringContaining("contributionDetails"),
        cid: "details-cid",
      });
      expect(result[0].contributionWeight).toBe("2.0");
    });

    it("should handle multiple contributors with shared details", async () => {
      const result = await hypercertOps.testBuildContributorEntries(
        ["did:plc:user1", "did:plc:user2", "did:plc:user3"],
        "Volunteer",
        "1.0",
        undefined,
      );

      expect(result).toHaveLength(3);
      expect(result[0].contributionDetails).toBe("Volunteer");
      expect(result[1].contributionDetails).toBe("Volunteer");
      expect(result[2].contributionDetails).toBe("Volunteer");
    });

    it("should create contributorInformation from create params", async () => {
      await hypercertOps.testBuildContributorEntries(
        [{ identifier: "did:plc:alice", displayName: "Alice Smith" }],
        "Coordinator",
        undefined,
        undefined,
      );

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "org.hypercerts.claim.contributorInformation",
          record: expect.objectContaining({
            identifier: "did:plc:alice",
            displayName: "Alice Smith",
          }),
        }),
      );
    });
  });

  describe("attachContributorsToHypercert (helper)", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
          value: {
            $type: "org.hypercerts.claim.activity",
            title: "Test",
            description: "Test",
            shortDescription: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            rights: { uri: "at://rights", cid: "rights-cid" },
            contributors: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.activity/abc", cid: "updated-cid" },
      });
    });

    it("should append contributors to empty array", async () => {
      const newContributors = [
        {
          contributorIdentity: { uri: "at://test/info/1", cid: "cid1", $type: "com.atproto.repo.strongRef" as const },
          contributionDetails: "Developer" as const,
          contributionWeight: "1.0",
        },
      ];

      const result = await hypercertOps.testAttachContributorsToHypercert(
        "at://did:plc:test/org.hypercerts.claim.activity/abc",
        newContributors,
      );

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.activity/abc");
      expect(result.cid).toBe("updated-cid");

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors).toHaveLength(1);
    });

    it("should preserve existing contributors when appending", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
          value: {
            $type: "org.hypercerts.claim.activity",
            title: "Test",
            description: "Test",
            shortDescription: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            rights: { uri: "at://rights", cid: "rights-cid" },
            contributors: [
              {
                contributorIdentity: { uri: "at://existing", cid: "cid0", $type: "com.atproto.repo.strongRef" },
                contributionDetails: "Existing Role",
              },
            ],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const newContributors = [
        {
          contributorIdentity: { uri: "at://test/info/1", cid: "cid1", $type: "com.atproto.repo.strongRef" as const },
          contributionDetails: "New Role" as const,
        },
      ];

      await hypercertOps.testAttachContributorsToHypercert(
        "at://did:plc:test/org.hypercerts.claim.activity/abc",
        newContributors,
      );

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors).toHaveLength(2);
      expect(updateCall.record.contributors[0].contributionDetails).toBe("Existing Role");
      expect(updateCall.record.contributors[1].contributionDetails).toBe("New Role");
    });

    it("should handle hypercert with no contributors field", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
          value: {
            $type: "org.hypercerts.claim.activity",
            title: "Test",
            description: "Test",
            shortDescription: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            rights: { uri: "at://rights", cid: "rights-cid" },
            // No contributors field
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const newContributors = [
        {
          contributorIdentity: { uri: "at://test/info/1", cid: "cid1", $type: "com.atproto.repo.strongRef" as const },
          contributionDetails: "Developer" as const,
        },
      ];

      await hypercertOps.testAttachContributorsToHypercert(
        "at://did:plc:test/org.hypercerts.claim.activity/abc",
        newContributors,
      );

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors).toHaveLength(1);
    });
  });

  describe("addContribution (refactored)", () => {
    beforeEach(() => {
      // Mock getRecord - hypercert with empty contributors
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/org.hypercerts.claim.activity/abc`,
          cid: "hypercert-cid",
          value: {
            $type: "org.hypercerts.claim.activity",
            title: "Test Hypercert",
            description: "Test",
            shortDescription: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            rights: { uri: "at://rights", cid: "rights-cid" },
            contributors: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      // Mock createRecord - for contributionDetails/contributorInformation
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/org.hypercerts.claim.contributionDetails/xyz`,
          cid: "record-cid",
        },
      });

      // Mock putRecord - for updating hypercert
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/org.hypercerts.claim.activity/abc`,
          cid: "updated-cid",
        },
      });
    });

    it("should add single contributor with inline role", async () => {
      const result = await hypercertOps.addContribution({
        hypercertUri: `at://${TEST_REPO_DID}/org.hypercerts.claim.activity/abc`,
        contributors: ["did:plc:user1"],
        contributionDetails: "Developer",
      });

      // Verify hypercert was updated
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          repo: TEST_REPO_DID,
          collection: "org.hypercerts.claim.activity",
          record: expect.objectContaining({
            contributors: expect.arrayContaining([
              expect.objectContaining({
                contributionDetails: "Developer",
              }),
            ]),
          }),
        }),
      );

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/org.hypercerts.claim.activity/abc`);
      expect(result.cid).toBe("updated-cid");
    });

    it("should add multiple contributors with shared role", async () => {
      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: ["did:plc:user1", "did:plc:user2", "did:plc:user3"],
        contributionDetails: "Volunteer",
      });

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors).toHaveLength(3);
    });

    it("should create contributionDetails record from object", async () => {
      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: ["did:plc:user1"],
        contributionDetails: {
          role: "Project Lead",
          contributionDescription: "Led the project",
          startDate: "2024-01-01",
          endDate: "2024-06-30",
        },
      });

      // Verify contributionDetails record was created
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "org.hypercerts.claim.contributionDetails",
          record: expect.objectContaining({
            role: "Project Lead",
            contributionDescription: "Led the project",
          }),
        }),
      );

      // Verify hypercert references the created record
      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors[0].contributionDetails).toMatchObject({
        uri: expect.stringContaining("contributionDetails"),
        cid: "record-cid",
      });
    });

    it("should use existing contributionDetails StrongRef", async () => {
      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: ["did:plc:user1"],
        contributionDetails: {
          uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/existing",
          cid: "existing-cid",
        },
      });

      // Verify no new contributionDetails record created (only contributorInformation)
      const createCalls = mockAgent.com.atproto.repo.createRecord.mock.calls;
      expect(createCalls.some((call) => call[0].collection === "org.hypercerts.claim.contributionDetails")).toBe(false);

      // Verify hypercert uses the provided StrongRef
      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors[0].contributionDetails).toMatchObject({
        uri: "at://did:plc:test/org.hypercerts.claim.contributionDetails/existing",
        cid: "existing-cid",
      });
    });

    it("should create contributorInformation from create params", async () => {
      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: [
          {
            identifier: "did:plc:alice",
            displayName: "Alice Smith",
          },
        ],
        contributionDetails: "Coordinator",
      });

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "org.hypercerts.claim.contributorInformation",
          record: expect.objectContaining({
            identifier: "did:plc:alice",
            displayName: "Alice Smith",
          }),
        }),
      );
    });

    it("should include weight when provided", async () => {
      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: ["did:plc:user1"],
        contributionDetails: "Lead Developer",
        weight: "2.5",
      });

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors[0]).toMatchObject({
        contributionWeight: "2.5",
      });
    });

    it("should append to existing contributors without replacing", async () => {
      // Mock hypercert with existing contributor
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
          value: {
            $type: "org.hypercerts.claim.activity",
            title: "Test",
            description: "Test",
            shortDescription: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            rights: { uri: "at://rights", cid: "rights-cid" },
            contributors: [
              {
                contributorIdentity: {
                  uri: "at://did:plc:test/org.hypercerts.claim.contributorInformation/existing",
                  cid: "existing-cid",
                  $type: "com.atproto.repo.strongRef",
                },
                contributionDetails: "Existing Role",
              },
            ],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      await hypercertOps.addContribution({
        hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        contributors: ["did:plc:new-user"],
        contributionDetails: "New Role",
      });

      const updateCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(updateCall.record.contributors).toHaveLength(2);
      expect(updateCall.record.contributors[0].contributionDetails).toBe("Existing Role");
    });

    it("should throw NetworkError if hypercert not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValueOnce({
        success: false,
      });

      await expect(
        hypercertOps.addContribution({
          hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/missing",
          contributors: ["did:plc:user"],
          contributionDetails: "Developer",
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError if update fails", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValueOnce({
        success: false,
      });

      await expect(
        hypercertOps.addContribution({
          hypercertUri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          contributors: ["did:plc:user"],
          contributionDetails: "Developer",
        }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("processContributors (integration check)", () => {
    it("should still work after refactor", async () => {
      // Set up mocks for record creation
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://test/record", cid: "test-cid" },
      });

      // Test the create() flow which uses processContributors
      await hypercertOps.create({
        title: "Test",
        description: "Test",
        shortDescription: "Test",
        workScope: createWorkScopeString(["Climate"]),
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        rights: { name: "CC-BY", type: "license", description: "Open" },
        contributions: [
          {
            contributors: ["did:plc:user1", "did:plc:user2"],
            contributionDetails: "Developer",
            weight: "1.0",
          },
          {
            contributors: ["did:plc:user3"],
            contributionDetails: { role: "Lead", contributionDescription: "Led project" },
            weight: "2.0",
          },
        ],
      });

      // Verify contributors were processed and included in hypercert
      const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls.find(
        (call) => call[0].collection === "org.hypercerts.claim.activity",
      );
      expect(createCall).toBeDefined();
      expect(createCall![0].record.contributors).toHaveLength(3); // 2 + 1
    });
  });

  describe("addAttachment", () => {
    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
          value: {
            title: "Test",
            description: "Test",
            workScope: createWorkScopeString(["Climate"]),
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            createdAt: "2024-01-01",
          },
        },
      });

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.attachment/xyz", cid: "attachment-cid" },
      });
    });

    it("should add attachment with single subject (string) and single URI content", async () => {
      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Impact Report",
        content: "https://example.com/report.pdf",
      });

      expect(result.uri).toContain("attachment");
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled();
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify subjects array with StrongRef (includes $type)
      expect(call.record.subjects).toEqual([
        {
          $type: "com.atproto.repo.strongRef",
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
        },
      ]);

      // Verify content array
      expect(call.record.content).toEqual([
        {
          $type: "org.hypercerts.defs#uri",
          uri: "https://example.com/report.pdf",
        },
      ]);

      // Verify collection is attachment
      expect(call.collection).toBe("org.hypercerts.claim.attachment");
    });

    it("should add attachment with single subject (StrongRef) and single Blob content", async () => {
      const blob = new Blob(["evidence data"], { type: "application/pdf" });
      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "application/pdf" }));

      const result = await hypercertOps.addAttachment({
        subjects: { uri: "at://did:plc:test/org.hypercerts.claim.activity/abc", cid: "hypercert-cid" },
        title: "Impact Report",
        content: blob,
      });

      expect(result.uri).toContain("attachment");
      expect(mockBlobs.upload).toHaveBeenCalledWith(blob);
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify subjects array (should use provided StrongRef with $type added)
      expect(call.record.subjects).toEqual([
        {
          $type: "com.atproto.repo.strongRef",
          uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          cid: "hypercert-cid",
        },
      ]);

      // Verify content array with blob
      expect(call.record.content).toHaveLength(1);

      // Verify content wrapper type
      expect(call.record.content[0].$type).toBe("org.hypercerts.defs#smallBlob");

      // Verify blob is a BlobRef instance with correct properties
      expect(call.record.content[0].blob).toBeInstanceOf(BlobRef);
      expect(call.record.content[0].blob.mimeType).toBe("application/pdf");
      expect(call.record.content[0].blob.size).toBe(100);
      expect(call.record.content[0].blob.ref).toBeDefined();
    });

    it("should add attachment with multiple subjects", async () => {
      // Mock getRecord to return different CIDs for different URIs
      mockAgent.com.atproto.repo.getRecord.mockImplementation((params) => {
        const rkey = params.rkey || "";
        return Promise.resolve({
          success: true,
          data: {
            uri: `at://did:plc:test/org.hypercerts.claim.activity/${rkey}`,
            cid: `cid-${rkey}`,
            value: { title: "Test" },
          },
        });
      });

      const result = await hypercertOps.addAttachment({
        subjects: [
          "at://did:plc:test/org.hypercerts.claim.activity/abc",
          "at://did:plc:test/org.hypercerts.claim.activity/def",
        ],
        title: "Multi-subject Attachment",
        content: "https://example.com/report.pdf",
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify subjects array contains both StrongRefs
      expect(call.record.subjects).toHaveLength(2);
      expect(call.record.subjects[0].uri).toContain("abc");
      expect(call.record.subjects[1].uri).toContain("def");
    });

    it("should add attachment with multiple content items (mixed URIs and Blobs)", async () => {
      const blob = new Blob(["evidence data"], { type: "application/pdf" });
      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "application/pdf" }));

      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Mixed Content Attachment",
        content: ["https://example.com/report.pdf", blob],
      });

      expect(result.uri).toContain("attachment");
      expect(mockBlobs.upload).toHaveBeenCalled();
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify content array contains both URI and blob
      expect(call.record.content).toHaveLength(2);
      expect(call.record.content[0]).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "https://example.com/report.pdf",
      });

      // Verify blob content wrapper type
      expect(call.record.content[1].$type).toBe("org.hypercerts.defs#smallBlob");

      // Verify blob is a BlobRef instance with correct properties
      expect(call.record.content[1].blob).toBeInstanceOf(BlobRef);
      expect(call.record.content[1].blob.mimeType).toBe("application/pdf");
      expect(call.record.content[1].blob.size).toBe(100);
      expect(call.record.content[1].blob.ref).toBeDefined();
    });

    it("should add attachment with contentType", async () => {
      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Image Attachment",
        content: "https://example.com/image.png",
        contentType: "image",
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify contentType is included
      expect(call.record.contentType).toBe("image");
    });

    it("should add attachment with location (StrongRef)", async () => {
      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Location-based Attachment",
        content: "https://example.com/report.pdf",
        location: { uri: "at://did:plc:test/app.certified.location/loc123", cid: "location-cid" },
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify location is included as StrongRef (with $type field)
      expect(call.record.location).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/app.certified.location/loc123",
        cid: "location-cid",
      });
    });

    it("should add attachment with location (URI string)", async () => {
      // Mock getRecord for location lookup
      const locationGetRecord = vi.fn().mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/app.certified.location/loc123",
          cid: "location-cid-fetched",
          value: { name: "Test Location" },
        },
      });
      mockAgent.com.atproto.repo.getRecord.mockImplementation((params) => {
        if (params.collection === "app.certified.location") {
          return locationGetRecord(params);
        }
        return Promise.resolve({
          success: true,
          data: {
            uri: "at://did:plc:test/org.hypercerts.claim.activity/abc",
            cid: "hypercert-cid",
            value: { title: "Test" },
          },
        });
      });

      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Location-based Attachment",
        content: "https://example.com/report.pdf",
        location: "at://did:plc:test/app.certified.location/loc123",
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify location StrongRef was created from URI (with $type field)
      expect(call.record.location).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/app.certified.location/loc123",
        cid: "location-cid-fetched",
      });
    });

    it("should add attachment with location (inline object)", async () => {
      // Mock createRecord for location creation
      mockAgent.com.atproto.repo.createRecord.mockImplementation((params) => {
        if (params.collection === "app.certified.location") {
          return Promise.resolve({
            success: true,
            data: { uri: "at://did:plc:test/app.certified.location/new123", cid: "new-location-cid" },
          });
        }
        // For attachment creation
        if (params.collection === "org.hypercerts.claim.attachment") {
          return Promise.resolve({
            success: true,
            data: { uri: "at://did:plc:test/org.hypercerts.claim.attachment/xyz", cid: "attachment-cid" },
          });
        }
        // Default fallback
        return Promise.resolve({
          success: true,
          data: { uri: "at://did:plc:test/unknown/123", cid: "unknown-cid" },
        });
      });

      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Location-based Attachment",
        content: "https://example.com/report.pdf",
        location: {
          lpVersion: "1.0.0",
          srs: "EPSG:4326",
          locationType: "coordinate-decimal",
          location: "https://location-uri.com",
          name: "San Francisco",
        },
      });

      expect(result.uri).toContain("attachment");
      const attachmentCall = mockAgent.com.atproto.repo.createRecord.mock.calls.find(
        (call) => call[0].collection === "org.hypercerts.claim.attachment",
      );

      // Verify location was created and StrongRef was added (without $type in return from createLocationRecord)
      expect(attachmentCall?.[0].record.location).toEqual({
        uri: "at://did:plc:test/app.certified.location/new123",
        cid: "new-location-cid",
      });
    });

    it("should add attachment with rich text facets", async () => {
      const shortDescriptionFacets = [
        {
          index: { byteStart: 0, byteEnd: 6 },
          features: [{ $type: "app.bsky.richtext.facet#mention" as const, did: "did:plc:alice" as const }],
        },
      ];
      const descriptionFacets = [
        {
          index: { byteStart: 0, byteEnd: 20 },
          features: [{ $type: "app.bsky.richtext.facet#link" as const, uri: "https://example.com" as const }],
        },
      ];

      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Attachment with Facets",
        shortDescription: "@alice check this",
        description: "https://example.com",
        content: "https://example.com/report.pdf",
        shortDescriptionFacets,
        descriptionFacets,
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify facets are included
      expect(call.record.shortDescriptionFacets).toEqual(shortDescriptionFacets);
      expect(call.record.descriptionFacets).toEqual(descriptionFacets);
    });

    it("should not include removed fields (relationType, contributors, locations)", async () => {
      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "Clean Attachment",
        content: "https://example.com/report.pdf",
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

      // Verify removed fields are not present
      expect(call.record.relationType).toBeUndefined();
      expect(call.record.contributors).toBeUndefined();
      expect(call.record.locations).toBeUndefined();
    });

    it("should throw ValidationError when content is missing", async () => {
      await expect(
        hypercertOps.addAttachment({
          subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          title: "Invalid Attachment",
          // @ts-expect-error - testing missing required field
          content: undefined,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError when subject fetch fails", async () => {
      mockAgent.com.atproto.repo.getRecord.mockRejectedValue(new Error("Network error"));

      await expect(
        hypercertOps.addAttachment({
          subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          title: "Attachment",
          content: "https://example.com/report.pdf",
        }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw ValidationError when content URI is not a valid URI", async () => {
      await expect(
        hypercertOps.addAttachment({
          subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          title: "Attachment with invalid URI",
          content: "not-a-valid-uri",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when content URI is plain text", async () => {
      await expect(
        hypercertOps.addAttachment({
          subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          title: "Attachment with plain text",
          content: "just some random text",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when any content URI in array is invalid", async () => {
      await expect(
        hypercertOps.addAttachment({
          subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
          title: "Attachment with mixed content",
          content: ["https://example.com/valid.pdf", "not-a-valid-uri"],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should accept valid non-http URI schemes in content", async () => {
      const result = await hypercertOps.addAttachment({
        subjects: "at://did:plc:test/org.hypercerts.claim.activity/abc",
        title: "IPFS Attachment",
        content: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      });

      expect(result.uri).toContain("attachment");
      const call = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(call.record.content).toEqual([
        {
          $type: "org.hypercerts.defs#uri",
          uri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        },
      ]);
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
            workScope: createWorkScopeString(["Climate"]),
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
        subject: "at://did:plc:test/org.hypercerts.claim.record/abc",
        metric: "CO2 Reduced",
        unit: "tons",
        value: "100",
        measurers: [{ did: "did:plc:measurer1" }],
      });

      expect(result.uri).toContain("measurement");
    });

    it("should create a measurement with all optional fields", async () => {
      const result = await hypercertOps.addMeasurement({
        subject: "at://did:plc:test/org.hypercerts.claim.record/abc",
        metric: "Forest Area",
        unit: "hectares",
        value: "500",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        measurers: [{ did: "did:plc:auditor1" }],
        methodType: "satellite-imagery",
        methodURI: "https://example.com/methodology",
        evidenceURI: ["https://example.com/report"],
        comment: "Verified via satellite imagery analysis",
      });

      expect(result.uri).toContain("measurement");
    });
  });

  describe("updateMeasurement", () => {
    const existingMeasurement = {
      $type: "org.hypercerts.claim.measurement",
      subject: { uri: "at://did:plc:test/org.hypercerts.claim.activity/abc", cid: "subject-cid" },
      metric: "CO2 Reduced",
      unit: "tons",
      value: "100",
      createdAt: "2024-01-01T00:00:00Z",
      measurers: ["did:plc:measurer1"],
    };

    beforeEach(() => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.measurement/xyz",
          cid: "old-measurement-cid",
          value: existingMeasurement,
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.claim.measurement/xyz", cid: "new-measurement-cid" },
      });
    });

    it("should update a measurement successfully", async () => {
      const result = await hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/xyz", {
        value: "200",
        comment: "Updated after re-verification",
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.claim.measurement/xyz");
      expect(result.cid).toBe("new-measurement-cid");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            value: "200",
            comment: "Updated after re-verification",
            // Preserved from existing
            metric: "CO2 Reduced",
            unit: "tons",
          }),
        }),
      );
    });

    it("should preserve createdAt and subject from existing record", async () => {
      await hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/xyz", {
        value: "300",
      });

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            createdAt: "2024-01-01T00:00:00Z",
            subject: { uri: "at://did:plc:test/org.hypercerts.claim.activity/abc", cid: "subject-cid" },
          }),
        }),
      );
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(hypercertOps.updateMeasurement("invalid-uri", { value: "200" })).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when URI targets wrong collection", async () => {
      await expect(
        hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.activity/xyz", { value: "200" }),
      ).rejects.toThrow(ValidationError);

      await expect(
        hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.collection/xyz", { value: "200" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NetworkError when measurement not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        error: { message: "Not found" },
      });

      await expect(
        hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/missing", { value: "200" }),
      ).rejects.toThrow(NetworkError);
    });

    it("should update locations correctly", async () => {
      const newLocations = [{ uri: "at://did:plc:test/app.certified.location/loc1", cid: "loc-cid" }];

      await hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/xyz", {
        locations: newLocations,
      });

      // processLocations transforms StrongRefs to $Typed format
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            locations: [
              {
                $type: "com.atproto.repo.strongRef",
                uri: "at://did:plc:test/app.certified.location/loc1",
                cid: "loc-cid",
              },
            ],
          }),
        }),
      );
    });

    it("should handle partial updates correctly", async () => {
      // Only update comment, leave everything else unchanged
      await hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/xyz", {
        comment: "New comment only",
      });

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            // Original values preserved
            metric: "CO2 Reduced",
            unit: "tons",
            value: "100",
            measurers: ["did:plc:measurer1"],
            // New value
            comment: "New comment only",
          }),
        }),
      );
    });

    it("should emit measurementUpdated event on success", async () => {
      const handler = vi.fn();
      hypercertOps.on("measurementUpdated", handler);

      await hypercertOps.updateMeasurement("at://did:plc:test/org.hypercerts.claim.measurement/xyz", {
        value: "200",
      });

      expect(handler).toHaveBeenCalledWith({
        uri: "at://did:plc:test/org.hypercerts.claim.measurement/xyz",
        cid: "new-measurement-cid",
      });
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
            workScope: createWorkScopeString(["Climate"]),
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

    it("should create a collection with simple text location string (beta.13+ format)", async () => {
      // Mock createRecord for location
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/app.certified.location/loc456", cid: "location-cid" },
      });
      // Mock createRecord for collection
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        success: true,
        data: { uri: "at://did:plc:test/org.hypercerts.collection/xyz", cid: "collection-cid" },
      });

      const result = await hypercertOps.createCollection({
        title: "My SF Collection",
        items: [],
        location: {
          lpVersion: "1.0",
          srs: "EPSG:4326",
          locationType: "coordinate-decimal",
          location: "San Francisco, CA, USA", // Simple text string, not a URL
          name: "West Coast Office",
        },
      });

      expect(result.uri).toContain("collection");
      expect(result.record.location?.uri).toBe("at://did:plc:test/app.certified.location/loc456");

      // Verify the location record was created with text string wrapped in URI ref
      const locationCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];
      expect(locationCall.collection).toBe("app.certified.location");
      expect(locationCall.record.location).toEqual({
        $type: "org.hypercerts.defs#uri",
        uri: "San Francisco, CA, USA",
      });
      expect(locationCall.record.name).toBe("West Coast Office");
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

      // Mock blob upload via BlobOperations (not agent.uploadBlob)
      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef());

      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef({ mimeType: "image/jpeg", size: 200 }));

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
      expect(mockBlobs.upload).toHaveBeenCalledTimes(2);
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

      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef({ size: 150 }));

      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef({ mimeType: "image/jpeg", size: 250 }));

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

      // Mock blob upload via BlobOperations (not agent.uploadBlob)
      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef());

      mockBlobs.upload.mockResolvedValueOnce(createMockBlobRef({ mimeType: "image/jpeg", size: 200 }));

      const result = await hypercertOps.updateCollection("at://did:plc:test/org.hypercerts.collection/abc123", {
        avatar: newAvatar,
        banner: newBanner,
      });

      expect(result.uri).toBe("at://did:plc:test/org.hypercerts.collection/abc123");
      expect(mockBlobs.upload).toHaveBeenCalledTimes(2);
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

    it("should throw NetworkError when putRecord fails", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "collection-cid",
          value: {
            $type: "org.hypercerts.claim.collection",
            title: "Test Collection",
            items: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({ success: false });

      await expect(
        hypercertOps.attachLocationToCollection(`at://${TEST_REPO_DID}/org.hypercerts.collection/abc123`, {
          uri: `at://${TEST_REPO_DID}/app.certified.location/loc123`,
          cid: "location-cid",
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

    it("should throw NetworkError when putRecord fails", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.collection/abc123",
          cid: "collection-cid",
          value: {
            $type: "org.hypercerts.claim.collection",
            title: "Test Collection",
            items: [],
            createdAt: "2024-01-01T00:00:00Z",
            location: { uri: "at://location", cid: "location-cid" },
          },
        },
      });
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({ success: false });

      await expect(
        hypercertOps.removeLocationFromCollection(`at://${TEST_REPO_DID}/org.hypercerts.collection/abc123`),
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
        mockBlobs.upload.mockResolvedValue(createMockBlobRef());

        await hypercertOps.createProject({
          title: "Project with Avatar",
          items: [],
          avatar: avatarBlob,
        });

        expect(mockBlobs.upload).toHaveBeenCalledWith(avatarBlob);
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

        // Verify wrapper type
        expect(createCall.record.avatar.$type).toBe("org.hypercerts.defs#smallImage");

        // Verify image is a BlobRef instance with correct properties
        expect(createCall.record.avatar.image).toBeInstanceOf(BlobRef);
        expect(createCall.record.avatar.image.mimeType).toBe("image/png");
        expect(createCall.record.avatar.image.size).toBe(100);
        expect(createCall.record.avatar.image.ref).toBeDefined();
      });

      it("should upload banner blob when provided", async () => {
        const bannerBlob = new Blob(["banner data"], { type: "image/jpeg" });
        mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "image/jpeg", size: 200 }));

        await hypercertOps.createProject({
          title: "Project with Banner",
          items: [],
          banner: bannerBlob,
        });

        expect(mockBlobs.upload).toHaveBeenCalledWith(bannerBlob);
        const createCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0];

        // Verify wrapper type
        expect(createCall.record.banner.$type).toBe("org.hypercerts.defs#largeImage");

        // Verify image is a BlobRef instance with correct properties
        expect(createCall.record.banner.image).toBeInstanceOf(BlobRef);
        expect(createCall.record.banner.image.mimeType).toBe("image/jpeg");
        expect(createCall.record.banner.image.size).toBe(200);
        expect(createCall.record.banner.image.ref).toBeDefined();
      });

      it("should upload both avatar and banner when provided", async () => {
        const avatarBlob = new Blob(["avatar"], { type: "image/png" });
        const bannerBlob = new Blob(["banner"], { type: "image/jpeg" });

        mockBlobs.upload
          .mockResolvedValueOnce(createMockBlobRef({ size: 50 }))
          .mockResolvedValueOnce(createMockBlobRef({ mimeType: "image/jpeg", size: 100 }));

        await hypercertOps.createProject({
          title: "Full Project",
          items: [],
          avatar: avatarBlob,
          banner: bannerBlob,
        });

        expect(mockBlobs.upload).toHaveBeenCalledTimes(2);
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
        mockBlobs.upload.mockRejectedValue(new NetworkError("Upload failed"));

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
        mockBlobs.upload.mockResolvedValue(createMockBlobRef({ size: 150 }));

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          avatar: newAvatar,
        });

        expect(mockBlobs.upload).toHaveBeenCalledWith(newAvatar);
        const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];

        // Verify wrapper type
        expect(putCall.record.avatar.$type).toBe("org.hypercerts.defs#smallImage");

        // Verify image is a BlobRef instance with correct properties
        expect(putCall.record.avatar.image).toBeInstanceOf(BlobRef);
        expect(putCall.record.avatar.image.mimeType).toBe("image/png");
        expect(putCall.record.avatar.image.size).toBe(150);
        expect(putCall.record.avatar.image.ref).toBeDefined();
      });

      it("should upload and update banner", async () => {
        const newBanner = new Blob(["new banner"], { type: "image/jpeg" });
        mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "image/jpeg", size: 250 }));

        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          banner: newBanner,
        });

        expect(mockBlobs.upload).toHaveBeenCalledWith(newBanner);
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

      it("should call getRecord exactly once per updateProject invocation", async () => {
        await hypercertOps.updateProject("at://did:plc:test/org.hypercerts.claim.collection/abc123", {
          title: "New Title",
        });

        expect(mockAgent.com.atproto.repo.getRecord).toHaveBeenCalledTimes(1);
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

  describe("resolveToStrongRef", () => {
    it("should return StrongRef as-is when given a valid StrongRef", async () => {
      const input = {
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        cid: "test-cid",
      };

      // @ts-expect-error - accessing private method for testing
      const result = await hypercertOps.resolveToStrongRef(input);

      expect(result).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri: "at://did:plc:test/org.hypercerts.claim.record/abc123",
        cid: "test-cid",
      });
      expect(mockAgent.com.atproto.repo.getRecord).not.toHaveBeenCalled();
    });

    it("should resolve string URI to StrongRef by fetching the record", async () => {
      const uri = "at://did:plc:test/org.hypercerts.claim.record/abc123";
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri,
          cid: "fetched-cid",
          value: { $type: "org.hypercerts.claim.record" },
        },
      });

      // @ts-expect-error - accessing private method for testing
      const result = await hypercertOps.resolveToStrongRef(uri);

      expect(result).toEqual({
        $type: "com.atproto.repo.strongRef",
        uri,
        cid: "fetched-cid",
      });
      expect(mockAgent.com.atproto.repo.getRecord).toHaveBeenCalledWith({
        repo: "did:plc:test",
        collection: "org.hypercerts.claim.record",
        rkey: "abc123",
      });
    });

    it("should throw ValidationError for invalid URI format", async () => {
      const invalidUri = "invalid-uri-format";

      // @ts-expect-error - accessing private method for testing
      await expect(hypercertOps.resolveToStrongRef(invalidUri)).rejects.toThrow(ValidationError);
      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.resolveToStrongRef(invalidUri),
      ).rejects.toThrow("Invalid AT-URI format");
    });

    it("should throw NetworkError when getRecord fails", async () => {
      const uri = "at://did:plc:test/org.hypercerts.claim.record/abc123";
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        error: { message: "Record not found" },
      });

      // @ts-expect-error - accessing private method for testing
      await expect(hypercertOps.resolveToStrongRef(uri)).rejects.toThrow(NetworkError);
      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.resolveToStrongRef(uri),
      ).rejects.toThrow("Failed to fetch record");
    });

    it("should throw NetworkError when record has no CID", async () => {
      const uri = "at://did:plc:test/org.hypercerts.claim.record/abc123";
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri,
          cid: undefined,
          value: { $type: "org.hypercerts.claim.record" },
        },
      });

      // @ts-expect-error - accessing private method for testing
      await expect(hypercertOps.resolveToStrongRef(uri)).rejects.toThrow(NetworkError);
      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.resolveToStrongRef(uri),
      ).rejects.toThrow("returned no CID");
    });

    it("should throw ValidationError for invalid input type", async () => {
      const invalidInput = 12345;

      await expect(
        // @ts-expect-error - accessing private method with intentionally invalid input for testing
        hypercertOps.resolveToStrongRef(invalidInput),
      ).rejects.toThrow(ValidationError);
      await expect(
        // @ts-expect-error - accessing private method with intentionally invalid input for testing
        hypercertOps.resolveToStrongRef(invalidInput),
      ).rejects.toThrow("Invalid input: expected string URI or StrongRef");
    });

    it("should throw ValidationError for object without uri/cid", async () => {
      const invalidInput = { foo: "bar" };

      await expect(
        // @ts-expect-error - accessing private method with intentionally invalid input for testing
        hypercertOps.resolveToStrongRef(invalidInput),
      ).rejects.toThrow(ValidationError);
      await expect(
        // @ts-expect-error - accessing private method with intentionally invalid input for testing
        hypercertOps.resolveToStrongRef(invalidInput),
      ).rejects.toThrow("Invalid input: expected string URI or StrongRef");
    });
  });

  describe("fetchRecord (private helper)", () => {
    it("should throw NetworkError when getRecord returns success:false", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({ success: false });

      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.fetchRecord("at://did:plc:test/org.hypercerts.claim.collection/abc123"),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when getRecord returns no CID", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/org.hypercerts.claim.collection/abc123",
          cid: undefined,
          value: {},
        },
      });

      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.fetchRecord("at://did:plc:test/org.hypercerts.claim.collection/abc123"),
      ).rejects.toThrow(NetworkError);

      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.fetchRecord("at://did:plc:test/org.hypercerts.claim.collection/abc123"),
      ).rejects.toThrow("returned no CID");
    });
  });

  describe("saveRecord (private helper)", () => {
    it("should throw NetworkError when putRecord returns success:false", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({ success: false });

      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.saveRecord("org.hypercerts.claim.collection", "abc123", {
          $type: "org.hypercerts.claim.collection",
        }),
      ).rejects.toThrow(NetworkError);

      await expect(
        // @ts-expect-error - accessing private method for testing
        hypercertOps.saveRecord("org.hypercerts.claim.collection", "abc123", {
          $type: "org.hypercerts.claim.collection",
        }),
      ).rejects.toThrow("Failed to save record");
    });
  });
});
