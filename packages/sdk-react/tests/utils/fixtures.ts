/**
 * Test fixtures for sdk-react tests.
 *
 * Re-exports fixtures from sdk-core and adds React-specific fixtures.
 */

import type { Session, CollaboratorPermissions, OrganizationInfo } from "@hypercerts-org/sdk-core";
import type { Profile, Hypercert } from "../../src/types.js";

/**
 * Create a mock session for testing.
 */
export function createMockSession(overrides: Partial<Session & { did?: string; handle?: string }> = {}): Session {
  const defaultSession = {
    did: "did:plc:test123456789",
    sub: "did:plc:test123456789",
    handle: "test.bsky.social",
    ...overrides,
  };

  return defaultSession as unknown as Session;
}

/**
 * Create mock collaborator permissions.
 */
export function createMockPermissions(
  role: "viewer" | "editor" | "admin" | "owner" = "viewer"
): CollaboratorPermissions {
  switch (role) {
    case "viewer":
      return { read: true, create: false, update: false, delete: false, admin: false, owner: false };
    case "editor":
      return { read: true, create: true, update: true, delete: false, admin: false, owner: false };
    case "admin":
      return { read: true, create: true, update: true, delete: true, admin: true, owner: false };
    case "owner":
      return { read: true, create: true, update: true, delete: true, admin: true, owner: true };
  }
}

/**
 * Create a mock profile for testing.
 */
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    handle: "test.bsky.social",
    displayName: "Test User",
    description: "A test profile for testing",
    avatar: "https://example.com/avatar.jpg",
    banner: "https://example.com/banner.jpg",
    website: "https://example.com",
    followersCount: 100,
    followsCount: 50,
    postsCount: 25,
    ...overrides,
  };
}

/**
 * Create a mock organization for testing.
 */
export function createMockOrganization(overrides: Partial<OrganizationInfo> = {}): OrganizationInfo {
  return {
    did: "did:plc:testorg123456",
    handle: "testorg.sds.example.com",
    name: "Test Organization",
    description: "A test organization",
    createdAt: new Date().toISOString(),
    accessType: "owner",
    permissions: createMockPermissions("owner"),
    ...overrides,
  };
}

/**
 * Create a mock hypercert for testing.
 */
export function createMockHypercert(overrides: Partial<Hypercert> = {}): Hypercert {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  return {
    uri: "at://did:plc:test123/org.hypercerts.hypercert/test-rkey",
    cid: "bafyreitesthypercertcid123456789",
    $type: "org.hypercerts.hypercert",
    title: "Test Hypercert",
    description: "A test hypercert for testing purposes",
    workScope: "Testing",
    workTimeframeFrom: yearAgo.toISOString().split("T")[0],
    workTimeframeTo: now.toISOString().split("T")[0],
    createdAt: now.toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock hypercerts for list testing.
 */
export function createMockHypercertList(count: number = 5): Hypercert[] {
  return Array.from({ length: count }, (_, i) =>
    createMockHypercert({
      uri: `at://did:plc:test123/org.hypercerts.hypercert/test-rkey-${i}`,
      cid: `bafyreitesthypercertcid${i}`,
      title: `Test Hypercert ${i + 1}`,
    })
  );
}

/**
 * Create a mock SDK config for testing.
 */
export function createMockSDKConfig() {
  return {
    oauth: {
      clientId: "https://example.com/client-metadata.json",
      redirectUri: "https://example.com/callback",
      scope: "atproto",
      jwksUri: "https://example.com/jwks.json",
      jwkPrivate: JSON.stringify({ keys: [{ kid: "test", kty: "EC", crv: "P-256", x: "x", y: "y", d: "d" }] }),
    },
    servers: {
      pds: "https://bsky.social",
      sds: "https://sds.example.com",
    },
  };
}
