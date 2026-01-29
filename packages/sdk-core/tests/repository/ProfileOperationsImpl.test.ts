import { describe, it, expect, vi, beforeEach } from "vitest";
import { Agent } from "@atproto/api";
import { ProfileOperationsImpl } from "../../src/repository/ProfileOperationsImpl.js";
import { NetworkError } from "../../src/core/errors.js";
import type { BlobOperations } from "../../src/repository/interfaces.js";
import { createMockAgent, createMockBlobOperations, createMockBlobRef, TEST_REPO_DID } from "../utils/mocks.js";

const BSKY_PROFILE_COLLECTION = "app.bsky.actor.profile";
const CERTIFIED_PROFILE_COLLECTION = "app.certified.actor.profile";
const TEST_PDS_URL = "https://test.pds.example";

describe("ProfileOperationsImpl", () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let mockBlobs: ReturnType<typeof createMockBlobOperations>;
  let profileOps: ProfileOperationsImpl;

  beforeEach(() => {
    mockAgent = createMockAgent(vi);
    mockBlobs = createMockBlobOperations(vi);
    profileOps = new ProfileOperationsImpl(
      mockAgent as unknown as Agent,
      TEST_REPO_DID,
      mockBlobs as BlobOperations,
      TEST_PDS_URL,
    );
  });

  describe("getBskyProfile", () => {
    it("should return Bsky profile successfully", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: {
          handle: "alice.bsky.social",
          displayName: "Alice",
          description: "Building on AT Protocol",
          avatar: "https://cdn.bsky.app/avatar.jpg",
          banner: "https://cdn.bsky.app/banner.jpg",
        },
      });

      const result = await profileOps.getBskyProfile();

      expect(result.handle).toBe("alice.bsky.social");
      expect(result.displayName).toBe("Alice");
      expect(result.description).toBe("Building on AT Protocol");
      expect(result.avatar).toBe("https://cdn.bsky.app/avatar.jpg");
      expect(result.banner).toBe("https://cdn.bsky.app/banner.jpg");
      expect(mockAgent.getProfile).toHaveBeenCalledWith({ actor: TEST_REPO_DID });
    });

    it("should throw NetworkError if Bsky profile fetch fails", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: false,
        data: {},
      });

      await expect(profileOps.getBskyProfile()).rejects.toThrow(NetworkError);
      await expect(profileOps.getBskyProfile()).rejects.toThrow("Failed to get Bluesky profile");
    });

    it("should throw NetworkError if agent throws error", async () => {
      mockAgent.getProfile!.mockRejectedValue(new Error("Network error"));

      await expect(profileOps.getBskyProfile()).rejects.toThrow(NetworkError);
      await expect(profileOps.getBskyProfile()).rejects.toThrow("Network error");
    });
  });

  describe("getCertifiedProfile", () => {
    it("should return Certified profile with blob URLs", async () => {
      // Mock handle fetch
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: { handle: "alice.bsky.social" },
      });

      // Mock certified profile record
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Alice",
            description: "Certified bio",
            pronouns: "she/her",
            website: "https://alice.com",
            avatar: {
              $type: "org.hypercerts.defs#smallImage",
              image: {
                $type: "blob",
                ref: { $link: "bafyabc", toString: () => "bafyabc" },
                mimeType: "image/png",
                size: 1000,
              },
            },
            banner: {
              $type: "org.hypercerts.defs#largeImage",
              image: {
                $type: "blob",
                ref: { $link: "bafydef", toString: () => "bafydef" },
                mimeType: "image/jpeg",
                size: 5000,
              },
            },
          },
        },
      });

      const result = await profileOps.getCertifiedProfile();

      expect(result.handle).toBe("alice.bsky.social");
      expect(result.displayName).toBe("Alice");
      expect(result.description).toBe("Certified bio");
      expect(result.pronouns).toBe("she/her");
      expect(result.website).toBe("https://alice.com");
      expect(result.avatar).toBe(`${TEST_PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${TEST_REPO_DID}&cid=bafyabc`);
      expect(result.banner).toBe(`${TEST_PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${TEST_REPO_DID}&cid=bafydef`);
      expect(mockAgent.com.atproto.repo.getRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: CERTIFIED_PROFILE_COLLECTION,
        rkey: "self",
      });
    });

    it("should handle URI image format", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: { handle: "test.bsky.social" },
      });

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Test",
            avatar: {
              $type: "org.hypercerts.defs#uri",
              uri: "https://example.com/avatar.jpg",
            },
          },
        },
      });

      const result = await profileOps.getCertifiedProfile();
      expect(result.avatar).toBe("https://example.com/avatar.jpg");
      expect(result.displayName).toBe("Test");
    });

    it("should return empty string for handle if getProfile fails", async () => {
      mockAgent.getProfile!.mockRejectedValue(new Error("Network error"));

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Alice",
            pronouns: "she/her",
          },
        },
      });

      const result = await profileOps.getCertifiedProfile();
      expect(result.handle).toBe("");
      expect(result.displayName).toBe("Alice");
      expect(result.pronouns).toBe("she/her");
    });

    it("should throw NetworkError if profile record fetch fails", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: { handle: "test.bsky.social" },
      });

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        data: {},
      });

      await expect(profileOps.getCertifiedProfile()).rejects.toThrow(NetworkError);
      await expect(profileOps.getCertifiedProfile()).rejects.toThrow("Failed to get Certified profile");
    });

    it("should throw error if image conversion fails", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: { handle: "test.bsky.social" },
      });

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            avatar: {
              $type: "org.hypercerts.defs#smallImage",
              image: {
                // Invalid - missing ref
                $type: "blob",
                mimeType: "image/png",
              },
            },
          },
        },
      });

      await expect(profileOps.getCertifiedProfile()).rejects.toThrow("Unable to extract CID or URI from image record");
    });

    it("should handle profile without images", async () => {
      mockAgent.getProfile!.mockResolvedValue({
        success: true,
        data: { handle: "test.bsky.social" },
      });

      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Test User",
          },
        },
      });

      const result = await profileOps.getCertifiedProfile();
      expect(result.displayName).toBe("Test User");
      expect(result.avatar).toBeUndefined();
      expect(result.banner).toBeUndefined();
    });
  });

  describe("createBskyProfile", () => {
    it("should create Bsky profile with basic fields", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`,
          cid: "bafy123",
        },
      });

      const result = await profileOps.createBskyProfile({
        displayName: "Alice",
        description: "Test user",
      });

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`);
      expect(result.cid).toBe("bafy123");

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: BSKY_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          $type: BSKY_PROFILE_COLLECTION,
          displayName: "Alice",
          description: "Test user",
          createdAt: expect.any(String),
        }),
      });
    });

    it("should create Bsky profile with avatar", async () => {
      const avatarBlob = new Blob(["avatar"], { type: "image/png" });

      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ size: 1000 }));

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`,
          cid: "bafy123",
        },
      });

      await profileOps.createBskyProfile({
        displayName: "Alice",
        avatar: avatarBlob,
      });

      expect(mockBlobs.upload).toHaveBeenCalledWith(avatarBlob);
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: BSKY_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          $type: BSKY_PROFILE_COLLECTION,
          avatar: expect.any(Object),
          createdAt: expect.any(String),
          displayName: "Alice",
        }),
      });
    });

    it("should throw NetworkError on failure", async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: false,
        data: {},
      });

      await expect(profileOps.createBskyProfile({ displayName: "Alice" })).rejects.toThrow(NetworkError);
    });
  });

  describe("updateBskyProfile", () => {
    it("should update Bsky profile fields", async () => {
      // Mock existing profile
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: BSKY_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Old Name",
            description: "Old bio",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`,
          cid: "bafy456",
        },
      });

      const result = await profileOps.updateBskyProfile({
        displayName: "New Name",
      });

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`);
      expect(result.cid).toBe("bafy456");

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: BSKY_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          displayName: "New Name",
          description: "Old bio", // Preserved
        }),
      });
    });

    it("should remove fields when passed null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: BSKY_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Alice",
            description: "Bio to remove",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${BSKY_PROFILE_COLLECTION}/self`,
          cid: "bafy789",
        },
      });

      await profileOps.updateBskyProfile({
        description: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record).not.toHaveProperty("description");
      expect(putCall.record).toHaveProperty("displayName", "Alice");
    });

    it("should throw error if profile not found", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: false,
        data: {},
      });

      await expect(profileOps.updateBskyProfile({ displayName: "Alice" })).rejects.toThrow(NetworkError);
    });
  });

  describe("createCertifiedProfile", () => {
    it("should create Certified profile with all fields", async () => {
      const avatarBlob = new Blob(["avatar"], { type: "image/png" });

      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ size: 1000 }));

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`,
          cid: "bafy123",
        },
      });

      const result = await profileOps.createCertifiedProfile({
        displayName: "Alice",
        description: "Certified profile bio",
        pronouns: "she/her",
        website: "https://alice.com",
        avatar: avatarBlob,
      });

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`);
      expect(result.cid).toBe("bafy123");

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: CERTIFIED_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          $type: CERTIFIED_PROFILE_COLLECTION,
          displayName: "Alice",
          description: "Certified profile bio",
          pronouns: "she/her",
          website: "https://alice.com",
          avatar: expect.objectContaining({
            $type: "org.hypercerts.defs#smallImage",
            image: expect.any(Object),
          }),
          createdAt: expect.any(String),
        }),
      });
    });

    it("should create Certified profile with banner in largeImage format", async () => {
      const bannerBlob = new Blob(["banner"], { type: "image/jpeg" });

      mockBlobs.upload.mockResolvedValue(createMockBlobRef({ mimeType: "image/jpeg", size: 5000 }));

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`,
          cid: "bafy123",
        },
      });

      await profileOps.createCertifiedProfile({
        displayName: "Alice",
        banner: bannerBlob,
      });

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: CERTIFIED_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          banner: expect.objectContaining({
            $type: "org.hypercerts.defs#largeImage",
            image: expect.any(Object),
          }),
        }),
      });
    });
  });

  describe("updateCertifiedProfile", () => {
    it("should update Certified profile preserving existing fields", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Old Name",
            pronouns: "they/them",
            website: "https://old.com",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`,
          cid: "bafy456",
        },
      });

      const result = await profileOps.updateCertifiedProfile({
        displayName: "New Name",
        website: "https://new.com",
      });

      expect(result.uri).toBe(`at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`);

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
        repo: TEST_REPO_DID,
        collection: CERTIFIED_PROFILE_COLLECTION,
        rkey: "self",
        record: expect.objectContaining({
          displayName: "New Name",
          pronouns: "they/them", // Preserved
          website: "https://new.com",
        }),
      });
    });

    it("should remove fields when passed null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            $type: CERTIFIED_PROFILE_COLLECTION,
            createdAt: "2024-01-01T00:00:00.000Z",
            displayName: "Alice",
            pronouns: "she/her",
            website: "https://alice.com",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: `at://${TEST_REPO_DID}/${CERTIFIED_PROFILE_COLLECTION}/self`,
          cid: "bafy789",
        },
      });

      await profileOps.updateCertifiedProfile({
        pronouns: null,
        website: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record).not.toHaveProperty("pronouns");
      expect(putCall.record).not.toHaveProperty("website");
      expect(putCall.record).toHaveProperty("displayName", "Alice");
    });
  });
});
