import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigurableAgent } from "../../src/agent/ConfigurableAgent.js";
import { createMockSession } from "../utils/repository-fixtures.js";

describe("ConfigurableAgent", () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let customServiceUrl: string;

  beforeEach(() => {
    mockSession = createMockSession();
    customServiceUrl = "https://custom-sds.example.com";
  });

  describe("constructor", () => {
    it("should create an agent with custom service URL", () => {
      const agent = new ConfigurableAgent(mockSession, customServiceUrl);

      expect(agent).toBeDefined();
      expect(agent.getServiceUrl()).toBe(customServiceUrl);
    });

    it("should extend Agent class", () => {
      const agent = new ConfigurableAgent(mockSession, customServiceUrl);

      // Should have Agent properties and methods
      expect(agent.com).toBeDefined();
      expect(agent.app).toBeDefined();
      expect(typeof agent.uploadBlob).toBe("function");
    });
  });

  describe("fetch routing", () => {
    it("should route requests to custom service URL", async () => {
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ uri: "at://test/record" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const sessionWithSpy = createMockSession({
        fetchHandler: fetchSpy,
      });

      const agent = new ConfigurableAgent(sessionWithSpy, customServiceUrl);

      // Attempt to make a call (will use the mocked fetch)
      try {
        await agent.com.atproto.repo.getRecord({
          repo: "did:plc:test",
          collection: "app.bsky.feed.post",
          rkey: "test123",
        });
      } catch {
        // Expected to fail due to mock, we just care about the fetch call
      }

      // Verify the fetch was called
      expect(fetchSpy).toHaveBeenCalled();

      // Check that the URL passed to fetch starts with our custom service URL
      const callArgs = fetchSpy.mock.calls[0];
      const calledUrl = callArgs[0] as string;

      // The URL should be constructed with our custom service as base
      expect(calledUrl).toContain(customServiceUrl);
    });

    it("should work with different service URLs", () => {
      const pdsUrl = "https://pds.example.com";
      const sdsUrl = "https://sds.example.com";
      const customUrl = "https://custom.example.com";

      const pdsAgent = new ConfigurableAgent(mockSession, pdsUrl);
      const sdsAgent = new ConfigurableAgent(mockSession, sdsUrl);
      const customAgent = new ConfigurableAgent(mockSession, customUrl);

      expect(pdsAgent.getServiceUrl()).toBe(pdsUrl);
      expect(sdsAgent.getServiceUrl()).toBe(sdsUrl);
      expect(customAgent.getServiceUrl()).toBe(customUrl);
    });
  });

  describe("authentication", () => {
    it("should use session's fetch handler for authentication", async () => {
      const authenticatedFetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const sessionWithAuth = createMockSession({
        fetchHandler: authenticatedFetchSpy,
      });

      const agent = new ConfigurableAgent(sessionWithAuth, customServiceUrl);

      try {
        await agent.com.atproto.repo.createRecord({
          repo: "did:plc:test",
          collection: "app.bsky.feed.post",
          record: { text: "test", createdAt: new Date().toISOString() },
        });
      } catch {
        // Expected to fail, we're checking the fetch call
      }

      // Verify the session's fetch handler was used (includes auth)
      expect(authenticatedFetchSpy).toHaveBeenCalled();
    });
  });

  describe("multiple instances", () => {
    it("should allow multiple agents with different service URLs from same session", () => {
      const orgA = new ConfigurableAgent(mockSession, "https://sds-org-a.example.com");
      const orgB = new ConfigurableAgent(mockSession, "https://sds-org-b.example.com");
      const pds = new ConfigurableAgent(mockSession, "https://pds.example.com");

      expect(orgA.getServiceUrl()).toBe("https://sds-org-a.example.com");
      expect(orgB.getServiceUrl()).toBe("https://sds-org-b.example.com");
      expect(pds.getServiceUrl()).toBe("https://pds.example.com");

      // Each agent should be independently configured
      expect(orgA).not.toBe(orgB);
      expect(orgB).not.toBe(pds);
      expect(orgA).not.toBe(pds);
    });
  });

  describe("integration with Repository pattern", () => {
    it("should work as drop-in replacement for standard Agent", () => {
      const agent = new ConfigurableAgent(mockSession, customServiceUrl);

      // Should have all the standard Agent namespaces
      expect(agent.com).toBeDefined();
      expect(agent.com.atproto).toBeDefined();
      expect(agent.com.atproto.repo).toBeDefined();
      expect(agent.app).toBeDefined();

      // Should have utility methods
      expect(typeof agent.uploadBlob).toBe("function");
      expect(typeof agent.resolveHandle).toBe("function");
    });
  });
});
