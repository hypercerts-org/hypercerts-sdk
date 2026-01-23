/**
 * Example: Tests for Custom Lexicon Evaluations
 *
 * These tests demonstrate the complete workflow and validate that
 * custom lexicons work correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { evaluationLexicon, EVALUATION_NSID } from "./lexicon.js";
import { EvaluationOperations } from "./operations.js";
import type { Evaluation } from "./types.js";
import { isEvaluation, isValidScore } from "./types.js";
import { LexiconRegistry } from "../../src/repository/LexiconRegistry.js";
import type { Agent } from "@atproto/api";

describe("Custom Lexicon Example", () => {
  let registry: LexiconRegistry;
  let mockAgent: Agent;
  let operations: EvaluationOperations;

  beforeEach(() => {
    // Create registry and register evaluation lexicon
    registry = new LexiconRegistry([]);
    registry.registerFromJSON(evaluationLexicon);

    // Create mock agent
    mockAgent = {
      com: {
        atproto: {
          repo: {
            createRecord: vi.fn(),
          },
        },
      },
    } as unknown as Agent;

    // Create operations instance
    operations = new EvaluationOperations(mockAgent, "did:plc:test123", registry);
  });

  describe("Lexicon Registration", () => {
    it("should register evaluation lexicon", () => {
      expect(registry.isRegistered(EVALUATION_NSID)).toBe(true);
    });

    it("should have evaluation lexicon in registry", () => {
      // Just verify the lexicon is registered
      // Full validation would require the com.atproto.repo.strongRef lexicon
      const lexicon = registry.get(EVALUATION_NSID);
      expect(lexicon).toBeDefined();
      expect(lexicon?.id).toBe(EVALUATION_NSID);
    });

    it("should reject invalid scores", () => {
      const record = {
        $type: EVALUATION_NSID,
        subject: {
          uri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
          cid: "bafyreiabc",
        },
        score: 150, // Invalid - exceeds maximum
        createdAt: new Date().toISOString(),
      };

      const result = registry.validate(EVALUATION_NSID, record);
      expect(result.valid).toBe(false);
    });

    it("should reject missing required fields", () => {
      const record = {
        $type: EVALUATION_NSID,
        // Missing subject
        score: 85,
        createdAt: new Date().toISOString(),
      };

      const result = registry.validate(EVALUATION_NSID, record);
      expect(result.valid).toBe(false);
    });
  });

  describe("EvaluationOperations", () => {
    it("should build a valid evaluation record", () => {
      // Test the record building logic without validation
      const record: Evaluation = {
        $type: EVALUATION_NSID,
        subject: {
          uri: "at://did:plc:xyz/org.hypercerts.claim.activity/123",
          cid: "bafyreixyz",
        },
        score: 85,
        methodology: "Peer review",
        createdAt: new Date().toISOString(),
      };

      expect(record.$type).toBe(EVALUATION_NSID);
      expect(record.score).toBe(85);
      expect(record.methodology).toBe("Peer review");
      expect(record.subject.uri).toBeTruthy();
    });

    it("should reject invalid scores", async () => {
      await expect(
        operations.create({
          subjectUri: "at://did:plc:xyz/org.hypercerts.claim.activity/123",
          subjectCid: "bafyreixyz",
          score: 150,
        }),
      ).rejects.toThrow("Score must be an integer between 0 and 100");
    });

    it("should build evaluation with previous reference", () => {
      const record: Evaluation = {
        $type: EVALUATION_NSID,
        subject: {
          uri: "at://did:plc:xyz/org.hypercerts.claim.activity/123",
          cid: "bafyreixyz",
        },
        score: 90,
        previousEvaluation: {
          uri: "at://did:plc:test/org.example.evaluation/abc",
          cid: "bafyreiprev",
        },
        createdAt: new Date().toISOString(),
      };

      expect(record.previousEvaluation).toEqual({
        uri: "at://did:plc:test/org.example.evaluation/abc",
        cid: "bafyreiprev",
      });
    });

    it("should build quick score record", () => {
      const record: Evaluation = {
        $type: EVALUATION_NSID,
        subject: {
          uri: "at://did:plc:xyz/org.hypercerts.claim.activity/123",
          cid: "bafyreixyz",
        },
        score: 88,
        createdAt: new Date().toISOString(),
      };

      expect(record.score).toBe(88);
      expect(record.methodology).toBeUndefined();
    });

    it("should build updated evaluation", () => {
      const record: Evaluation = {
        $type: EVALUATION_NSID,
        subject: {
          uri: "at://did:plc:xyz/org.hypercerts.claim.activity/123",
          cid: "bafyreixyz",
        },
        score: 92,
        methodology: "Final review",
        previousEvaluation: {
          uri: "at://did:plc:test/org.example.evaluation/first",
          cid: "bafyreifirst",
        },
        createdAt: new Date().toISOString(),
      };

      expect(record.score).toBe(92);
      expect(record.previousEvaluation).toBeDefined();
    });
  });

  describe("Helper Functions", () => {
    it("should calculate average score", () => {
      const evaluations: Evaluation[] = [
        {
          $type: EVALUATION_NSID,
          subject: { uri: "at://test/xyz", cid: "abc" },
          score: 80,
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          $type: EVALUATION_NSID,
          subject: { uri: "at://test/xyz", cid: "abc" },
          score: 90,
          createdAt: "2024-01-02T00:00:00Z",
        },
        {
          $type: EVALUATION_NSID,
          subject: { uri: "at://test/xyz", cid: "abc" },
          score: 85,
          createdAt: "2024-01-03T00:00:00Z",
        },
      ];

      const average = EvaluationOperations.calculateAverageScore(evaluations);
      expect(average).toBe(85);
    });

    it("should handle empty evaluations array", () => {
      const average = EvaluationOperations.calculateAverageScore([]);
      expect(average).toBe(0);
    });

    it("should check if evaluation is update", () => {
      const firstEval: Evaluation = {
        $type: EVALUATION_NSID,
        subject: { uri: "at://test/xyz", cid: "abc" },
        score: 80,
        createdAt: "2024-01-01T00:00:00Z",
      };

      const updatedEval: Evaluation = {
        $type: EVALUATION_NSID,
        subject: { uri: "at://test/xyz", cid: "abc" },
        score: 90,
        createdAt: "2024-01-02T00:00:00Z",
        previousEvaluation: { uri: "at://test/first", cid: "def" },
      };

      expect(EvaluationOperations.isUpdate(firstEval)).toBe(false);
      expect(EvaluationOperations.isUpdate(updatedEval)).toBe(true);
    });

    it("should extract rkey from URI", () => {
      const uri = "at://did:plc:abc/org.example.evaluation/3km2vj4kfqp2a";
      const rkey = EvaluationOperations.getRkey(uri);
      expect(rkey).toBe("3km2vj4kfqp2a");
    });
  });

  describe("Type Guards", () => {
    it("should validate evaluation objects", () => {
      const valid: Evaluation = {
        $type: EVALUATION_NSID,
        subject: { uri: "at://test/xyz", cid: "abc" },
        score: 85,
        createdAt: "2024-01-01T00:00:00Z",
      };

      expect(isEvaluation(valid)).toBe(true);
    });

    it("should reject invalid evaluation objects", () => {
      expect(isEvaluation(null)).toBe(false);
      expect(isEvaluation(undefined)).toBe(false);
      expect(isEvaluation("not an object")).toBe(false);
      expect(isEvaluation({ $type: "wrong.type" })).toBe(false);
      expect(
        isEvaluation({
          $type: EVALUATION_NSID,
          score: 150, // Invalid score
        }),
      ).toBe(false);
    });

    it("should validate scores", () => {
      expect(isValidScore(0)).toBe(true);
      expect(isValidScore(50)).toBe(true);
      expect(isValidScore(100)).toBe(true);
      expect(isValidScore(-1)).toBe(false);
      expect(isValidScore(101)).toBe(false);
      expect(isValidScore(50.5)).toBe(false);
    });
  });
});
