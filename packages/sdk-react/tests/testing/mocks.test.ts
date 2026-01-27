/**
 * Tests for testing mock utilities.
 */

import { describe, expect, it } from "vitest";
import {
  createMockSession,
  createMockProfile,
  createMockPermissions,
  createMockOrganization,
  createMockCollaborator,
  createMockHypercert,
} from "../../src/testing/mocks.js";

describe("createMockSession", () => {
  it("should create a mock session with defaults", () => {
    const session = createMockSession();
    // Cast to access mock properties added by createMockSession
    const mockSession = session as { did?: string; handle?: string };

    expect(mockSession.did).toBe("did:plc:mock123456789");
    expect(mockSession.handle).toBe("mock.bsky.social");
  });

  it("should allow overriding session properties", () => {
    const session = createMockSession({
      did: "did:plc:custom",
      handle: "custom.bsky.social",
    });
    // Cast to access mock properties added by createMockSession
    const mockSession = session as { did?: string; handle?: string };

    expect(mockSession.did).toBe("did:plc:custom");
    expect(mockSession.handle).toBe("custom.bsky.social");
  });
});

describe("createMockProfile", () => {
  it("should create a mock profile with defaults", () => {
    const profile = createMockProfile();

    expect(profile.handle).toBe("mock.bsky.social");
    expect(profile.displayName).toBe("Mock User");
    expect(profile.description).toBe("A mock user for testing");
  });

  it("should allow overriding profile properties", () => {
    const profile = createMockProfile({
      displayName: "Custom Name",
      description: "Custom description",
    });

    expect(profile.displayName).toBe("Custom Name");
    expect(profile.description).toBe("Custom description");
  });
});

describe("createMockPermissions", () => {
  it("should create viewer permissions by default", () => {
    const permissions = createMockPermissions();

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(false);
    expect(permissions.update).toBe(false);
    expect(permissions.delete).toBe(false);
    expect(permissions.admin).toBe(false);
    expect(permissions.owner).toBe(false);
  });

  it("should create viewer permissions when specified", () => {
    const permissions = createMockPermissions("viewer");

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(false);
    expect(permissions.admin).toBe(false);
  });

  it("should create editor permissions when specified", () => {
    const permissions = createMockPermissions("editor");

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(true);
    expect(permissions.update).toBe(true);
    expect(permissions.delete).toBe(false);
    expect(permissions.admin).toBe(false);
  });

  it("should create admin permissions when specified", () => {
    const permissions = createMockPermissions("admin");

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(true);
    expect(permissions.update).toBe(true);
    expect(permissions.delete).toBe(true);
    expect(permissions.admin).toBe(true);
    expect(permissions.owner).toBe(false);
  });

  it("should create owner permissions when specified", () => {
    const permissions = createMockPermissions("owner");

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(true);
    expect(permissions.update).toBe(true);
    expect(permissions.delete).toBe(true);
    expect(permissions.admin).toBe(true);
    expect(permissions.owner).toBe(true);
  });

  it("should allow custom partial permissions", () => {
    const permissions = createMockPermissions({ read: true, create: true });

    expect(permissions.read).toBe(true);
    expect(permissions.create).toBe(true);
    expect(permissions.update).toBe(false);
    expect(permissions.delete).toBe(false);
    expect(permissions.admin).toBe(false);
    expect(permissions.owner).toBe(false);
  });
});

describe("createMockOrganization", () => {
  it("should create a mock organization with defaults", () => {
    const org = createMockOrganization();

    expect(org.did).toBe("did:plc:mockorg123456");
    expect(org.name).toBe("Mock Organization");
    expect(org.accessType).toBe("owner");
    expect(org.permissions.owner).toBe(true);
  });

  it("should allow overriding organization properties", () => {
    const org = createMockOrganization({
      name: "Custom Org",
      description: "Custom description",
    });

    expect(org.name).toBe("Custom Org");
    expect(org.description).toBe("Custom description");
  });
});

describe("createMockCollaborator", () => {
  it("should create a mock collaborator with defaults", () => {
    const collab = createMockCollaborator();

    expect(collab.userDid).toBe("did:plc:mockuser123456");
    expect(collab.grantedBy).toBe("did:plc:mockowner123456");
    expect(collab.permissions.create).toBe(true); // Editor by default
  });

  it("should allow overriding collaborator properties", () => {
    const collab = createMockCollaborator({
      userDid: "did:plc:customuser",
      permissions: createMockPermissions("admin"),
    });

    expect(collab.userDid).toBe("did:plc:customuser");
    expect(collab.permissions.admin).toBe(true);
  });
});

describe("createMockHypercert", () => {
  it("should create a mock hypercert with defaults", () => {
    const hc = createMockHypercert();

    expect(hc.title).toBe("Mock Hypercert");
    expect(hc.workScope).toBe("Testing, Environment");
    expect(hc.$type).toBe("org.hypercerts.claim.activity");
    expect(hc.uri).toContain("at://");
    expect(hc.cid).toBeTruthy();
  });

  it("should allow overriding hypercert properties", () => {
    const hc = createMockHypercert({
      title: "Custom Hypercert",
      workScope: "Climate Action" as unknown as typeof hc.workScope,
    });

    expect(hc.title).toBe("Custom Hypercert");
    expect(hc.workScope).toBe("Climate Action");
  });

  it("should set valid date ranges", () => {
    const hc = createMockHypercert();

    const from = new Date(hc.workTimeFrameFrom as string);
    const to = new Date(hc.workTimeFrameTo as string);

    expect(from).toBeInstanceOf(Date);
    expect(to).toBeInstanceOf(Date);
    expect(from.getTime()).toBeLessThan(to.getTime());
  });
});
