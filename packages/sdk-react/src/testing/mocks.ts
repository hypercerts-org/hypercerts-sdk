/**
 * Mock factories for testing.
 *
 * @packageDocumentation
 */

import type {
  Session,
  Collaborator,
  CollaboratorPermissions,
  OrganizationInfo,
  OrgHypercertsClaimActivity,
} from "@hypercerts-org/sdk-core";
import type { Profile, Hypercert } from "../types.js";

/**
 * Creates a mock session for testing.
 *
 * @param overrides - Partial session data to override defaults
 * @returns A mock session object
 *
 * @example
 * ```typescript
 * const session = createMockSession({
 *   did: "did:plc:test123",
 *   handle: "test.bsky.social",
 * });
 * ```
 */
export function createMockSession(overrides: Partial<Session & { did?: string; handle?: string }> = {}): Session {
  const defaultSession = {
    did: "did:plc:mock123456789",
    sub: "did:plc:mock123456789",
    handle: "mock.bsky.social",
    ...overrides,
  };

  // Return as Session type (OAuthSession is complex, this covers common usage)
  return defaultSession as unknown as Session;
}

/**
 * Creates a mock profile for testing.
 *
 * @param overrides - Partial profile data to override defaults
 * @returns A mock profile object
 *
 * @example
 * ```typescript
 * const profile = createMockProfile({
 *   displayName: "Test User",
 *   description: "A test profile",
 * });
 * ```
 */
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    handle: "mock.bsky.social",
    displayName: "Mock User",
    description: "A mock user for testing",
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
 * Creates mock collaborator permissions for testing.
 *
 * @param role - Predefined role or custom permissions
 * @returns Collaborator permissions object
 *
 * @example
 * ```typescript
 * const readOnly = createMockPermissions("viewer");
 * const admin = createMockPermissions("admin");
 * const custom = createMockPermissions({ read: true, create: true });
 * ```
 */
export function createMockPermissions(
  role: "viewer" | "editor" | "admin" | "owner" | Partial<CollaboratorPermissions> = "viewer",
): CollaboratorPermissions {
  if (typeof role === "object") {
    return {
      read: false,
      create: false,
      update: false,
      delete: false,
      admin: false,
      owner: false,
      ...role,
    };
  }

  switch (role) {
    case "viewer":
      return {
        read: true,
        create: false,
        update: false,
        delete: false,
        admin: false,
        owner: false,
      };
    case "editor":
      return {
        read: true,
        create: true,
        update: true,
        delete: false,
        admin: false,
        owner: false,
      };
    case "admin":
      return {
        read: true,
        create: true,
        update: true,
        delete: true,
        admin: true,
        owner: false,
      };
    case "owner":
      return {
        read: true,
        create: true,
        update: true,
        delete: true,
        admin: true,
        owner: true,
      };
  }
}

/**
 * Creates a mock organization for testing.
 *
 * @param overrides - Partial organization data to override defaults
 * @returns A mock organization object
 *
 * @example
 * ```typescript
 * const org = createMockOrganization({
 *   name: "Test Org",
 *   description: "A test organization",
 * });
 * ```
 */
export function createMockOrganization(overrides: Partial<OrganizationInfo> = {}): OrganizationInfo {
  return {
    did: "did:plc:mockorg123456",
    handle: "mockorg.sds.example.com",
    name: "Mock Organization",
    description: "A mock organization for testing",
    createdAt: new Date().toISOString(),
    accessType: "owner",
    permissions: createMockPermissions("owner"),
    ...overrides,
  };
}

/**
 * Creates a mock collaborator for testing.
 *
 * @param overrides - Partial collaborator data to override defaults
 * @returns A mock collaborator object
 *
 * @example
 * ```typescript
 * const collab = createMockCollaborator({
 *   userDid: "did:plc:user123",
 *   permissions: createMockPermissions("editor"),
 * });
 * ```
 */
export function createMockCollaborator(overrides: Partial<Collaborator> = {}): Collaborator {
  return {
    userDid: "did:plc:mockuser123456",
    permissions: createMockPermissions("editor"),
    grantedBy: "did:plc:mockowner123456",
    grantedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock hypercert for testing.
 *
 * @param overrides - Partial hypercert data to override defaults
 * @returns A mock hypercert object
 *
 * @example
 * ```typescript
 * const hc = createMockHypercert({
 *   title: "Test Impact",
 *   workScope: "Climate",
 * });
 * ```
 */
export function createMockHypercert(overrides: Partial<Hypercert> = {}): Hypercert {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const base: Hypercert = {
    uri: "at://did:plc:mock123/org.hypercerts.claim.activity/mock-rkey",
    cid: "bafyreimockhypercertcid123456789",
    $type: "org.hypercerts.claim.activity",
    title: "Mock Hypercert",
    shortDescription: "A mock hypercert",
    description: "A mock hypercert for testing purposes",
    workScope: {
      $type: "org.hypercerts.claim.activity#workScopeString",
      scope: "Testing, Environment",
    } as unknown as OrgHypercertsClaimActivity.Main["workScope"],
    startDate: yearAgo.toISOString(),
    endDate: now.toISOString(),
    workTimeFrameFrom: yearAgo.toISOString().split("T")[0],
    workTimeFrameTo: now.toISOString().split("T")[0],
    createdAt: now.toISOString(),
  };

  return { ...base, ...overrides };
}
