/**
 * Tests for query key factory.
 */

import { describe, expect, it } from "vitest";
import { atprotoKeys } from "../../src/queries/keys.js";

describe("atprotoKeys", () => {
  describe("all", () => {
    it("should return the root key", () => {
      expect(atprotoKeys.all).toEqual(["atproto"]);
    });
  });

  describe("session keys", () => {
    it("should return session key", () => {
      expect(atprotoKeys.session()).toEqual(["atproto", "session"]);
    });

    it("should return session by DID key", () => {
      const did = "did:plc:test123";
      expect(atprotoKeys.sessionByDid(did)).toEqual(["atproto", "session", did]);
    });
  });

  describe("server keys", () => {
    it("should return servers key", () => {
      expect(atprotoKeys.servers()).toEqual(["atproto", "server"]);
    });

    it("should return server by DID key", () => {
      const did = "did:plc:test123";
      expect(atprotoKeys.server(did)).toEqual(["atproto", "server", did]);
    });
  });

  describe("profile keys", () => {
    it("should return profiles key", () => {
      expect(atprotoKeys.profiles()).toEqual(["atproto", "profile"]);
    });

    it("should return profile by DID key", () => {
      const did = "did:plc:test123";
      expect(atprotoKeys.profile(did)).toEqual(["atproto", "profile", did]);
    });
  });

  describe("organization keys", () => {
    it("should return organizations key", () => {
      expect(atprotoKeys.organizations()).toEqual(["atproto", "organizations"]);
    });

    it("should return organization by DID key", () => {
      const did = "did:plc:org123";
      expect(atprotoKeys.organization(did)).toEqual(["atproto", "organizations", did]);
    });
  });

  describe("collaborator keys", () => {
    it("should return all collaborators key", () => {
      expect(atprotoKeys.allCollaborators()).toEqual(["atproto", "collaborators"]);
    });

    it("should return collaborators by repo DID key", () => {
      const repoDid = "did:plc:repo123";
      expect(atprotoKeys.collaborators(repoDid)).toEqual(["atproto", "collaborators", repoDid]);
    });
  });

  describe("hypercert keys", () => {
    it("should return all hypercerts key", () => {
      expect(atprotoKeys.allHypercerts()).toEqual(["atproto", "hypercerts"]);
    });

    it("should return hypercerts by repo DID key", () => {
      const repoDid = "did:plc:repo123";
      expect(atprotoKeys.hypercerts(repoDid)).toEqual(["atproto", "hypercerts", repoDid]);
    });

    it("should return hypercerts key with undefined repoDid as 'all'", () => {
      expect(atprotoKeys.hypercerts()).toEqual(["atproto", "hypercerts", "all"]);
    });

    it("should return hypercerts list key with params", () => {
      const repoDid = "did:plc:repo123";
      const params = { cursor: "abc", limit: 50 };
      expect(atprotoKeys.hypercertsList(repoDid, params)).toEqual([
        "atproto",
        "hypercerts",
        repoDid,
        "list",
        params,
      ]);
    });

    it("should return hypercerts list key without params", () => {
      const repoDid = "did:plc:repo123";
      expect(atprotoKeys.hypercertsList(repoDid)).toEqual([
        "atproto",
        "hypercerts",
        repoDid,
        "list",
        undefined,
      ]);
    });

    it("should return hypercert by URI key", () => {
      const uri = "at://did:plc:test/org.hypercerts.hypercert/abc";
      expect(atprotoKeys.hypercert(uri)).toEqual(["atproto", "hypercerts", "detail", uri]);
    });
  });

  describe("key hierarchy", () => {
    it("should have consistent key prefixes for invalidation", () => {
      // All keys should start with "atproto"
      expect(atprotoKeys.all[0]).toBe("atproto");
      expect(atprotoKeys.session()[0]).toBe("atproto");
      expect(atprotoKeys.profiles()[0]).toBe("atproto");
      expect(atprotoKeys.organizations()[0]).toBe("atproto");
      expect(atprotoKeys.allHypercerts()[0]).toBe("atproto");
    });

    it("should allow hierarchical invalidation", () => {
      // Profile-specific key should extend profiles key
      const profileKey = atprotoKeys.profile("did:plc:test");
      const profilesKey = atprotoKeys.profiles();

      expect(profileKey.slice(0, profilesKey.length)).toEqual(profilesKey);
    });

    it("should allow hierarchical invalidation for hypercerts", () => {
      // Hypercert detail should extend allHypercerts
      const hypercertKey = atprotoKeys.hypercert("at://did:plc:test/org.hypercerts.hypercert/abc");
      const allHypercertsKey = atprotoKeys.allHypercerts();

      expect(hypercertKey.slice(0, allHypercertsKey.length)).toEqual(allHypercertsKey);
    });
  });
});
