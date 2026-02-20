import { beforeEach, describe, expect, it } from "vitest";
import { SDSRequiredError } from "../../src/core/errors.js";
import { Repository } from "../../src/repository/Repository.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import { createMockSession } from "../utils/repository-fixtures.js";

describe("Repository", () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let repository: Repository;

  beforeEach(() => {
    mockSession = createMockSession();
    repository = new Repository(
      mockSession,
      "https://pds.example.com",
      mockSession.did,
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
      expect(typeof profile.getBskyProfile).toBe("function");
      expect(typeof profile.getCertifiedProfile).toBe("function");
      expect(typeof profile.createBskyProfile).toBe("function");
      expect(typeof profile.updateBskyProfile).toBe("function");
      expect(typeof profile.createCertifiedProfile).toBe("function");
      expect(typeof profile.updateCertifiedProfile).toBe("function");
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
      expect(typeof hypercerts.addAttachment).toBe("function");
      expect(typeof hypercerts.addContribution).toBe("function");
    });
  });

  describe("collaborators (SDS only)", () => {
    it("should throw SDSRequiredError on PDS repository", () => {
      expect(() => repository.collaborators).toThrow(SDSRequiredError);
    });

    it("should return CollaboratorOperations on SDS repository", () => {
      const sdsRepo = new Repository(mockSession, "https://sds.example.com", mockSession.did, true);

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
      const sdsRepo = new Repository(mockSession, "https://sds.example.com", mockSession.did, true);

      const organizations = sdsRepo.organizations;
      expect(organizations).toBeDefined();
      expect(typeof organizations.create).toBe("function");
      expect(typeof organizations.get).toBe("function");
      expect(typeof organizations.list).toBe("function");
    });
  });

  describe("getLexiconRegistry", () => {
    it("should return LexiconRegistry instance", () => {
      const registry = repository.getLexiconRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.isRegistered).toBe("function");
      expect(typeof registry.validate).toBe("function");
    });

    it("should use registry from constructor if provided", () => {
      const customRegistry = new LexiconRegistry();

      const customLexicon = {
        lexicon: 1,
        id: "org.test.custom",
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type", "title"],
              properties: {
                $type: { type: "string", const: "org.test.custom" },
                title: { type: "string" },
              },
            },
          },
        },
      };

      customRegistry.registerFromJSON(customLexicon);

      const repoWithCustomRegistry = new Repository(
        mockSession,
        "https://pds.example.com",
        mockSession.did,
        false,
        undefined, // logger
        customRegistry,
      );

      const registry = repoWithCustomRegistry.getLexiconRegistry();
      expect(registry.isRegistered("org.test.custom")).toBe(true);
    });

    it("should pass registry to new repositories created with repo()", () => {
      const customRegistry = new LexiconRegistry();

      const customLexicon = {
        lexicon: 1,
        id: "org.test.custom",
        defs: {
          main: {
            type: "record",
            key: "tid",
            record: {
              type: "object",
              required: ["$type", "title"],
              properties: {
                $type: { type: "string", const: "org.test.custom" },
                title: { type: "string" },
              },
            },
          },
        },
      };

      customRegistry.registerFromJSON(customLexicon);

      const repoWithCustomRegistry = new Repository(
        mockSession,
        "https://pds.example.com",
        mockSession.did,
        false,
        undefined,
        customRegistry,
      );

      const otherDid = "did:plc:otherdid123456789";
      const otherRepo = repoWithCustomRegistry.repo(otherDid);

      const otherRegistry = otherRepo.getLexiconRegistry();
      expect(otherRegistry.isRegistered("org.test.custom")).toBe(true);
    });
  });
});
