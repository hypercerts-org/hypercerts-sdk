import { beforeEach, describe, expect, it } from "vitest";
import { SDSRequiredError } from "../../src/core/errors.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { Repository } from "../../src/repository/Repository.js";
import { createMockSession } from "../utils/repository-fixtures.js";

describe("Repository", () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let lexiconRegistry: LexiconRegistry;
  let repository: Repository;

  beforeEach(() => {
    mockSession = createMockSession();
    lexiconRegistry = new LexiconRegistry();
    repository = new Repository(
      mockSession,
      "https://pds.example.com",
      mockSession.did,
      lexiconRegistry,
      false, // Not SDS
    );
  });

  describe("constructor", () => {
    it("should create a repository with correct properties", () => {
      expect(repository.did).toBe(mockSession.did);
      expect(repository.isSDS).toBe(false);
      expect(repository.getServerUrl()).toBe("https://pds.example.com");
    });

    it("should create an SDS repository", () => {
      const sdsRepo = new Repository(
        mockSession,
        "https://sds.example.com",
        mockSession.did,
        lexiconRegistry,
        true, // SDS
      );

      expect(sdsRepo.isSDS).toBe(true);
    });
  });

  describe("repo()", () => {
    it("should create a new repository for a different DID", () => {
      const otherDid = "did:plc:otherdid123456789";
      const otherRepo = repository.repo(otherDid);

      expect(otherRepo.did).toBe(otherDid);
      expect(otherRepo.getServerUrl()).toBe(repository.getServerUrl());
      expect(otherRepo.isSDS).toBe(repository.isSDS);
    });
  });

  describe("records", () => {
    it("should return a RecordOperations instance", () => {
      const records = repository.records;
      expect(records).toBeDefined();
      expect(typeof records.create).toBe("function");
      expect(typeof records.update).toBe("function");
      expect(typeof records.get).toBe("function");
      expect(typeof records.list).toBe("function");
      expect(typeof records.delete).toBe("function");
    });

    it("should return the same instance on subsequent calls", () => {
      const records1 = repository.records;
      const records2 = repository.records;
      expect(records1).toBe(records2);
    });
  });

  describe("blobs", () => {
    it("should return a BlobOperations instance", () => {
      const blobs = repository.blobs;
      expect(blobs).toBeDefined();
      expect(typeof blobs.upload).toBe("function");
      expect(typeof blobs.get).toBe("function");
    });
  });

  describe("profile", () => {
    it("should return a ProfileOperations instance", () => {
      const profile = repository.profile;
      expect(profile).toBeDefined();
      expect(typeof profile.get).toBe("function");
      expect(typeof profile.update).toBe("function");
    });
  });

  describe("hypercerts", () => {
    it("should return a HypercertOperations instance", () => {
      const hypercerts = repository.hypercerts;
      expect(hypercerts).toBeDefined();
      expect(typeof hypercerts.create).toBe("function");
      expect(typeof hypercerts.update).toBe("function");
      expect(typeof hypercerts.get).toBe("function");
      expect(typeof hypercerts.list).toBe("function");
      expect(typeof hypercerts.delete).toBe("function");
      expect(typeof hypercerts.attachLocation).toBe("function");
      expect(typeof hypercerts.addEvidence).toBe("function");
      expect(typeof hypercerts.addContribution).toBe("function");
    });
  });

  describe("collaborators (SDS only)", () => {
    it("should throw SDSRequiredError on PDS repository", () => {
      expect(() => repository.collaborators).toThrow(SDSRequiredError);
    });

    it("should return CollaboratorOperations on SDS repository", () => {
      const sdsRepo = new Repository(
        mockSession,
        "https://sds.example.com",
        mockSession.did,
        lexiconRegistry,
        true,
      );

      const collaborators = sdsRepo.collaborators;
      expect(collaborators).toBeDefined();
      expect(typeof collaborators.grant).toBe("function");
      expect(typeof collaborators.revoke).toBe("function");
      expect(typeof collaborators.list).toBe("function");
    });
  });

  describe("organizations (SDS only)", () => {
    it("should throw SDSRequiredError on PDS repository", () => {
      expect(() => repository.organizations).toThrow(SDSRequiredError);
    });

    it("should return OrganizationOperations on SDS repository", () => {
      const sdsRepo = new Repository(
        mockSession,
        "https://sds.example.com",
        mockSession.did,
        lexiconRegistry,
        true,
      );

      const organizations = sdsRepo.organizations;
      expect(organizations).toBeDefined();
      expect(typeof organizations.create).toBe("function");
      expect(typeof organizations.get).toBe("function");
      expect(typeof organizations.list).toBe("function");
    });
  });
});
