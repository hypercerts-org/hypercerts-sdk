import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileOperationsImpl } from "../../src/repository/ProfileOperationsImpl.js";
import { NetworkError } from "../../src/core/errors.js";

describe("ProfileOperationsImpl", () => {
  let mockAgent: any;
  let profileOps: ProfileOperationsImpl;
  const repoDid = "did:plc:testdid123";
  const serverUrl = "https://pds.example.com";

  beforeEach(() => {
    mockAgent = {
      getProfile: vi.fn(),
      com: {
        atproto: {
          repo: {
            getRecord: vi.fn(),
            putRecord: vi.fn(),
            uploadBlob: vi.fn(),
          },
        },
      },
    };

    profileOps = new ProfileOperationsImpl(mockAgent, repoDid, serverUrl);
  });

  describe("get", () => {
    it("should get profile successfully", async () => {
      mockAgent.getProfile.mockResolvedValue({
        success: true,
        data: {
          handle: "test.bsky.social",
          displayName: "Test User",
          description: "A test user",
          avatar: "https://example.com/avatar.jpg",
          banner: "https://example.com/banner.jpg",
        },
      });

      const result = await profileOps.get();

      expect(result.handle).toBe("test.bsky.social");
      expect(result.displayName).toBe("Test User");
      expect(result.description).toBe("A test user");
      expect(result.avatar).toBe("https://example.com/avatar.jpg");
      expect(result.banner).toBe("https://example.com/banner.jpg");
      expect(mockAgent.getProfile).toHaveBeenCalledWith({ actor: repoDid });
    });

    it("should handle profile without optional fields", async () => {
      mockAgent.getProfile.mockResolvedValue({
        success: true,
        data: {
          handle: "minimal.bsky.social",
        },
      });

      const result = await profileOps.get();

      expect(result.handle).toBe("minimal.bsky.social");
      expect(result.displayName).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it("should throw NetworkError when API returns success: false", async () => {
      mockAgent.getProfile.mockResolvedValue({
        success: false,
      });

      await expect(profileOps.get()).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.getProfile.mockRejectedValue(new Error("Profile not found"));

      await expect(profileOps.get()).rejects.toThrow(NetworkError);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      // Default mock for getting existing profile
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            displayName: "Old Name",
            description: "Old description",
          },
        },
      });

      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: true,
        data: {
          uri: "at://did:plc:test/app.bsky.actor.profile/self",
          cid: "bafyrei123",
        },
      });
    });

    it("should update displayName", async () => {
      const result = await profileOps.update({
        displayName: "New Name",
      });

      expect(result.uri).toBe("at://did:plc:test/app.bsky.actor.profile/self");
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            displayName: "New Name",
            description: "Old description",
          }),
        }),
      );
    });

    it("should update description", async () => {
      await profileOps.update({
        description: "New description",
      });

      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            displayName: "Old Name",
            description: "New description",
          }),
        }),
      );
    });

    it("should remove displayName when set to null", async () => {
      await profileOps.update({
        displayName: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.displayName).toBeUndefined();
    });

    it("should remove description when set to null", async () => {
      await profileOps.update({
        description: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.description).toBeUndefined();
    });

    it("should upload and set avatar", async () => {
      const avatarBlob = new Blob(["avatar data"], { type: "image/jpeg" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: { ref: { $link: "avatar-cid" }, mimeType: "image/jpeg", size: 100 },
        },
      });

      await profileOps.update({
        avatar: avatarBlob,
      });

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            avatar: expect.objectContaining({ ref: { $link: "avatar-cid" } }),
          }),
        }),
      );
    });

    it("should remove avatar when set to null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            displayName: "Name",
            avatar: { ref: { $link: "old-avatar" } },
          },
        },
      });

      await profileOps.update({
        avatar: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.avatar).toBeUndefined();
    });

    it("should upload and set banner", async () => {
      const bannerBlob = new Blob(["banner data"], { type: "image/jpeg" });
      mockAgent.com.atproto.repo.uploadBlob.mockResolvedValue({
        success: true,
        data: {
          blob: { ref: { $link: "banner-cid" }, mimeType: "image/jpeg", size: 200 },
        },
      });

      await profileOps.update({
        banner: bannerBlob,
      });

      expect(mockAgent.com.atproto.repo.uploadBlob).toHaveBeenCalled();
      expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          record: expect.objectContaining({
            banner: expect.objectContaining({ ref: { $link: "banner-cid" } }),
          }),
        }),
      );
    });

    it("should remove banner when set to null", async () => {
      mockAgent.com.atproto.repo.getRecord.mockResolvedValue({
        success: true,
        data: {
          value: {
            displayName: "Name",
            banner: { ref: { $link: "old-banner" } },
          },
        },
      });

      await profileOps.update({
        banner: null,
      });

      const putCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];
      expect(putCall.record.banner).toBeUndefined();
    });

    it("should throw NetworkError when putRecord returns success: false", async () => {
      mockAgent.com.atproto.repo.putRecord.mockResolvedValue({
        success: false,
      });

      await expect(
        profileOps.update({ displayName: "New Name" }),
      ).rejects.toThrow(NetworkError);
    });

    it("should throw NetworkError when API throws", async () => {
      mockAgent.com.atproto.repo.putRecord.mockRejectedValue(new Error("Update failed"));

      await expect(
        profileOps.update({ displayName: "New Name" }),
      ).rejects.toThrow(NetworkError);
    });
  });
});
