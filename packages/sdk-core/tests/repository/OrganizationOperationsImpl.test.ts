import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "../../src/core/types.js";
import { OrganizationOperationsImpl } from "../../src/repository/OrganizationOperationsImpl.js";
import { NetworkError } from "../../src/core/errors.js";
import { createMockSession, TEST_REPO_DID, TEST_SDS_URL } from "../utils/mocks.js";

describe("OrganizationOperationsImpl", () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let orgOps: OrganizationOperationsImpl;

  beforeEach(() => {
    mockSession = createMockSession(vi);
    orgOps = new OrganizationOperationsImpl(mockSession as unknown as Session, TEST_REPO_DID, TEST_SDS_URL);
  });

  describe("create", () => {
    it("should create an organization successfully", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          did: "did:plc:neworg123",
          handle: "myorg.example.com",
          name: "My Organization",
          description: "A test organization",
          createdAt: "2024-01-01T00:00:00Z",
        }),
      });

      const result = await orgOps.create({
        name: "My Organization",
        description: "A test organization",
        handlePrefix: "myorg",
      });

      expect(result.did).toBe("did:plc:neworg123");
      expect(result.handle).toBe("myorg.example.com");
      expect(result.name).toBe("My Organization");
      expect(result.accessType).toBe("owner");
      expect(result.permissions.owner).toBe(true);

      expect(mockSession.fetchHandler).toHaveBeenCalledWith(
        `${TEST_SDS_URL}/xrpc/com.sds.organization.create`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should create organization with minimal params", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          did: "did:plc:org",
          handle: "org.example.com",
          name: "Org",
        }),
      });

      const result = await orgOps.create({ name: "Org", handlePrefix: "test" });

      expect(result.name).toBe("Org");
      expect(result.createdAt).toBeDefined(); // Should default to current time
    });

    it("should throw NetworkError on failure", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Conflict",
      });

      await expect(orgOps.create({ name: "Test Org", handlePrefix: "test" })).rejects.toThrow(NetworkError);
    });
  });

  describe("get", () => {
    it("should get an organization by DID", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          organizations: [
            {
              did: "did:plc:org1",
              handle: "org1.example.com",
              name: "Organization 1",
              description: "First org",
              accessType: "owner",
              permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: true },
            },
            {
              did: "did:plc:org2",
              handle: "org2.example.com",
              name: "Organization 2",
              accessType: "shared",
              permissions: { read: true, create: true, update: true, delete: false, admin: false, owner: false },
            },
          ],
        }),
      });

      const result = await orgOps.get("did:plc:org1");

      expect(result).not.toBeNull();
      expect(result!.did).toBe("did:plc:org1");
      expect(result!.name).toBe("Organization 1");
    });

    it("should return null for non-existent organization", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          organizations: [],
        }),
      });

      const result = await orgOps.get("did:plc:nonexistent");

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      mockSession.fetchHandler.mockRejectedValue(new Error("Network error"));

      const result = await orgOps.get("did:plc:org");

      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    it("should list all accessible organizations", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          organizations: [
            {
              did: "did:plc:org1",
              handle: "org1.example.com",
              name: "Organization 1",
              accessType: "owner",
              permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: true },
            },
            {
              did: "did:plc:org2",
              handle: "org2.example.com",
              name: "Organization 2",
              description: "Second org",
              accessType: "shared",
              permissions: { read: true, create: true, update: false, delete: false, admin: false, owner: false },
            },
          ],
        }),
      });

      const result = await orgOps.list();

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0].did).toBe("did:plc:org1");
      expect(result.organizations[0].accessType).toBe("owner");
      expect(result.organizations[1].did).toBe("did:plc:org2");
      expect(result.organizations[1].accessType).toBe("shared");
    });

    it("should handle empty repositories list", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      const result = await orgOps.list();

      expect(result.organizations).toHaveLength(0);
    });

    it("should use session DID in query", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      await orgOps.list();

      expect(mockSession.fetchHandler).toHaveBeenCalledWith(
        expect.stringContaining(`userDid=${encodeURIComponent(mockSession.did ?? "")}`),
        expect.any(Object),
      );
    });

    it("should use session.sub if did is not available", async () => {
      mockSession.did = undefined;
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      await orgOps.list();

      expect(mockSession.fetchHandler).toHaveBeenCalledWith(
        expect.stringContaining(`userDid=${encodeURIComponent(mockSession.sub)}`),
        expect.any(Object),
      );
    });

    it("should throw NetworkError on failure", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(orgOps.list()).rejects.toThrow(NetworkError);
    });

    it("should add createdAt for organizations without it", async () => {
      mockSession.fetchHandler.mockResolvedValue({
        ok: true,
        json: async () => ({
          organizations: [
            {
              did: "did:plc:org",
              handle: "org.example.com",
              name: "Org",
              accessType: "owner",
              permissions: { read: true, create: true, update: true, delete: true, admin: true, owner: true },
              // No createdAt field
            },
          ],
        }),
      });

      const result = await orgOps.list();

      expect(result.organizations[0].createdAt).toBeDefined();
    });
  });
});
