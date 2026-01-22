import { describe, it, expect, vi, beforeEach } from "vitest";
import { validate } from "@hypercerts-org/lexicon";
import type { OrgHypercertsDefs } from "@hypercerts-org/lexicon";
import { HypercertOperationsImpl } from "../../src/repository/HypercertOperationsImpl.js";
import { ValidationError } from "../../src/core/errors.js";
import type { Agent } from "@atproto/api";
import { createMockAgent, TEST_REPO_DID, TEST_PDS_URL } from "../utils/mocks.js";

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

// Partial mock - only mock validate function
vi.mock("@hypercerts-org/lexicon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hypercerts-org/lexicon")>();
  return {
    ...actual,
    validate: vi.fn(),
  };
});

describe("HypercertOperationsImpl validation", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let hypercertOps: HypercertOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    hypercertOps = new HypercertOperationsImpl(mockAgent as unknown as Agent, TEST_REPO_DID, TEST_PDS_URL);
    vi.clearAllMocks();
  });

  describe("validation integration", () => {
    const validParams = {
      title: "Test Hypercert",
      shortDescription: "A test",
      description: "A test hypercert",
      workScope: createWorkScopeAll(["Climate"]),
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
      rights: {
        name: "CC-BY",
        type: "license",
        description: "Attribution",
      },
    };

    beforeEach(() => {
      // Mock successful record creation
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.rights/abc123", cid: "rights-cid" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { uri: "at://did:plc:test/org.hypercerts.claim.activity/xyz789", cid: "hypercert-cid" },
        });
    });

    it("should call validate() function from lexicon package", async () => {
      vi.mocked(validate).mockReturnValue({ success: true, value: {} });

      await hypercertOps.create(validParams);

      // Verify that validate from the lexicon package was called
      expect(validate).toHaveBeenCalled();
    });

    it("should throw ValidationError when lexicon validation fails", async () => {
      vi.mocked(validate).mockReturnValue({
        success: false,
        error: { name: "ValidationError", message: "Invalid record: missing required field" },
      });

      await expect(hypercertOps.create(validParams)).rejects.toThrow(ValidationError);
    });

    it("should include validation error message in thrown error", async () => {
      const errorMessage = "Missing required field: workScope";
      vi.mocked(validate).mockReturnValue({
        success: false,
        error: { name: "ValidationError", message: errorMessage },
      });

      try {
        await hypercertOps.create(validParams);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as Error).message).toContain("Invalid");
      }
    });
  });
});
