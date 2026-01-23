/**
 * Example: TypeScript Type Definitions for Evaluation Records
 *
 * These types provide compile-time type safety for working with evaluation records.
 */

import type { StrongRef } from "../../src/index.js";
import { isStrongRef } from "../../src/index.js";
import { EVALUATION_NSID } from "./lexicon.js";

/**
 * Evaluation record structure.
 *
 * This matches the lexicon definition and provides TypeScript type safety.
 */
export interface Evaluation {
  /** Record type identifier */
  $type: typeof EVALUATION_NSID;

  /** The hypercert being evaluated */
  subject: StrongRef;

  /** Evaluation score (0-100) */
  score: number;

  /** Optional methodology description */
  methodology?: string;

  /** When the evaluation was created (ISO 8601) */
  createdAt: string;

  /** Optional reference to a previous evaluation */
  previousEvaluation?: StrongRef;
}

/**
 * Parameters for creating an evaluation.
 *
 * This provides a cleaner API than passing the full record structure.
 */
export interface CreateEvaluationParams {
  /** URI of the hypercert being evaluated */
  subjectUri: string;

  /** CID of the hypercert being evaluated */
  subjectCid: string;

  /** Evaluation score (0-100) */
  score: number;

  /** Optional methodology description */
  methodology?: string;

  /** Optional reference to a previous evaluation */
  previousEvaluationUri?: string;

  /** Optional CID of previous evaluation */
  previousEvaluationCid?: string;
}

/**
 * Result from creating an evaluation.
 */
export interface EvaluationResult {
  /** AT-URI of the created evaluation */
  uri: string;

  /** CID of the created evaluation */
  cid: string;

  /** The evaluation record data */
  record: Evaluation;
}

/**
 * Parameters for updating an evaluation.
 *
 * This creates a new evaluation record that references the previous one.
 */
export interface UpdateEvaluationParams {
  /** URI of the hypercert */
  subjectUri: string;

  /** CID of the hypercert */
  subjectCid: string;

  /** New evaluation score */
  score: number;

  /** Optional new methodology description */
  methodology?: string;

  /** URI of the previous evaluation */
  previousEvaluationUri: string;

  /** CID of the previous evaluation */
  previousEvaluationCid: string;
}

/**
 * Type guard to check if an object is a valid Evaluation.
 *
 * Performs strict validation:
 * - Checks $type matches EVALUATION_NSID
 * - Validates subject is a proper StrongRef (uri and cid are strings)
 * - Ensures score is an integer between 0-100 (no decimals)
 * - Validates previousEvaluation is a StrongRef when present
 * - Checks createdAt is a string
 */
export function isEvaluation(obj: unknown): obj is Evaluation {
  if (!obj || typeof obj !== "object") return false;

  const record = obj as Record<string, unknown>;

  // Check required fields
  if (record.$type !== EVALUATION_NSID) return false;
  if (!isStrongRef(record.subject)) return false;
  if (typeof record.score !== "number") return false;
  if (!Number.isInteger(record.score)) return false;
  if (record.score < 0 || record.score > 100) return false;
  if (typeof record.createdAt !== "string") return false;

  // Validate optional methodology if present
  if (record.methodology !== undefined && typeof record.methodology !== "string") {
    return false;
  }

  // Validate optional previousEvaluation if present
  if (record.previousEvaluation !== undefined) {
    if (!isStrongRef(record.previousEvaluation)) return false;
  }

  return true;
}

/**
 * Validate evaluation score is in valid range.
 */
export function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 100;
}
