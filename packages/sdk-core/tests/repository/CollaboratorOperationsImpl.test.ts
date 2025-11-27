import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollaboratorOperationsImpl } from "../../src/repository/CollaboratorOperationsImpl.js";
import { NetworkError } from "../../src/core/errors.js";

describe("CollaboratorOperationsImpl", () => {
  let mockSession: any;
  let collaboratorOps: CollaboratorOperationsImpl;
  const repoDid = "did:plc:testdid123";
  const serverUrl = "https://sds.example.com";

  beforeEach(() => {
    mockSession = {
      did: "did:plc:user123",
      sub: "did:plc:user123",
      fetchHandler: vi.fn(),
    };

    collaboratorOps = new CollaboratorOperationsImpl(mockSession, repoDid, serverUrl);
  });

  describe("grant", () => {
    it("should grant viewer access", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await collaboratorOps.grant({ userDid: "did:plc:newuser", role: "viewer" });

      expect(mockSession.fetchHandler).toHaveBeenCalledWith(
        `${serverUrl}/xrpc/com.atproto.sds.grantAccess`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"read":true'),
        }),
      );

      const body = JSON.parse(mockSession.fetchHandler.mock.calls[0][1].body);
      expect(body.permissions.read).toBe(true);
      expect(body.permissions.create).toBe(false);
      expect(body.permissions.update).toBe(false);
      expect(body.permissions.delete).toBe(false);
    });

    it("should grant editor access", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await collaboratorOps.grant({ userDid: "did:plc:newuser", role: "editor" });

      const body = JSON.parse(mockSession.fetchHandler.mock.calls[0][1].body);
      expect(body.permissions.read).toBe(true);
      expect(body.permissions.create).toBe(true);
      expect(body.permissions.update).toBe(true);
      expect(body.permissions.delete).toBe(false);
    });

    it("should grant admin access", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await collaboratorOps.grant({ userDid: "did:plc:newuser", role: "admin" });

      const body = JSON.parse(mockSession.fetchHandler.mock.calls[0][1].body);
      expect(body.permissions.admin).toBe(true);
      expect(body.permissions.delete).toBe(true);
    });

    it("should grant owner access", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await collaboratorOps.grant({ userDid: "did:plc:newuser", role: "owner" });

      const body = JSON.parse(mockSession.fetchHandler.mock.calls[0][1].body);
      expect(body.permissions.owner).toBe(true);
    });

    it("should throw NetworkError on failure", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Forbidden",
      });

      await expect(
        collaboratorOps.grant({ userDid: "did:plc:newuser", role: "viewer" }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("revoke", () => {
    it("should revoke access successfully", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await collaboratorOps.revoke({ userDid: "did:plc:revokeduser" });

      expect(mockSession.fetchHandler).toHaveBeenCalledWith(
        `${serverUrl}/xrpc/com.atproto.sds.revokeAccess`,
        expect.objectContaining({
          method: "POST",
        }),
      );

      const body = JSON.parse(mockSession.fetchHandler.mock.calls[0][1].body);
      expect(body.repo).toBe(repoDid);
      expect(body.userDid).toBe("did:plc:revokeduser");
    });

    it("should throw NetworkError on failure", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        collaboratorOps.revoke({ userDid: "did:plc:user" }),
      ).rejects.toThrow(NetworkError);
    });
  });

  describe("list", () => {
    it("should list collaborators successfully", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:user1",
              permissions: { read: true, create: true, update: true, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
            },
            {
              userDid: "did:plc:user2",
              permissions: { read: true, create: false, update: false, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-02T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.list();

      expect(result).toHaveLength(2);
      expect(result[0].userDid).toBe("did:plc:user1");
      expect(result[0].role).toBe("editor");
      expect(result[1].role).toBe("viewer");
    });

    it("should handle empty collaborators list", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ collaborators: [] }),
      });

      const result = await collaboratorOps.list();

      expect(result).toHaveLength(0);
    });

    it("should correctly map permissions to roles", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:owner",
              permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: true },
              grantedBy: "did:plc:system",
              grantedAt: "2024-01-01T00:00:00Z",
            },
            {
              userDid: "did:plc:admin",
              permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.list();

      expect(result[0].role).toBe("owner");
      expect(result[1].role).toBe("admin");
    });

    it("should throw NetworkError on failure", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Server Error",
      });

      await expect(collaboratorOps.list()).rejects.toThrow(NetworkError);
    });
  });

  describe("hasAccess", () => {
    it("should return true for active collaborator", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:activeuser",
              permissions: { read: true, create: false, update: false, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.hasAccess("did:plc:activeuser");

      expect(result).toBe(true);
    });

    it("should return false for unknown user", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ collaborators: [] }),
      });

      const result = await collaboratorOps.hasAccess("did:plc:unknown");

      expect(result).toBe(false);
    });

    it("should return false for revoked user", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:revokeduser",
              permissions: { read: true, create: false, update: false, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
              revokedAt: "2024-02-01T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.hasAccess("did:plc:revokeduser");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockSession.fetchHandler.mockRejectedValue(new Error("Network error"));

      const result = await collaboratorOps.hasAccess("did:plc:user");

      expect(result).toBe(false);
    });
  });

  describe("getRole", () => {
    it("should return role for active collaborator", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:editor",
              permissions: { read: true, create: true, update: true, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.getRole("did:plc:editor");

      expect(result).toBe("editor");
    });

    it("should return null for unknown user", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ collaborators: [] }),
      });

      const result = await collaboratorOps.getRole("did:plc:unknown");

      expect(result).toBeNull();
    });

    it("should return null for revoked user", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          collaborators: [
            {
              userDid: "did:plc:revoked",
              permissions: { read: true, create: true, update: true, delete: false, admin: false, owner: false },
              grantedBy: "did:plc:owner",
              grantedAt: "2024-01-01T00:00:00Z",
              revokedAt: "2024-02-01T00:00:00Z",
            },
          ],
        }),
      });

      const result = await collaboratorOps.getRole("did:plc:revoked");

      expect(result).toBeNull();
    });
  });
});
