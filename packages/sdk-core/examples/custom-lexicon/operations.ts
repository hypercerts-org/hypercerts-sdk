/**
 * Example: Custom Operations Class for Evaluations
 *
 * This demonstrates how to build a domain-specific API using BaseOperations.
 */

import { BaseOperations, ValidationError } from "../../src/index.js";
import type { Agent } from "@atproto/api";
import type { LexiconRegistry } from "../../src/index.js";
import type { Evaluation, CreateEvaluationParams, UpdateEvaluationParams, EvaluationResult } from "./types.js";
import { EVALUATION_NSID } from "./lexicon.js";
import { isValidScore } from "./types.js";

/**
 * Operations class for creating and managing evaluation records.
 *
 * This extends BaseOperations to provide a clean, type-safe API for
 * working with evaluations.
 */
export class EvaluationOperations extends BaseOperations<CreateEvaluationParams, EvaluationResult> {
  constructor(agent: Agent, repoDid: string, registry: LexiconRegistry) {
    super(agent, repoDid, registry);
  }

  /**
   * Create a new evaluation for a hypercert.
   *
   * @param params - Evaluation parameters
   * @returns The created evaluation record
   * @throws {ValidationError} If the evaluation data is invalid
   * @throws {NetworkError} If the network request fails
   *
   * @example
   * ```typescript
   * const evaluation = await evaluations.create({
   *   subjectUri: hypercert.hypercertUri,
   *   subjectCid: hypercert.hypercertCid,
   *   score: 85,
   *   methodology: "Peer review by experts",
   * });
   * ```
   */
  async create(params: CreateEvaluationParams): Promise<EvaluationResult> {
    // Validate score
    if (!isValidScore(params.score)) {
      throw new ValidationError(`Score must be an integer between 0 and 100, got ${params.score}`);
    }

    // Build the evaluation record
    const record: Evaluation = {
      $type: EVALUATION_NSID,
      subject: this.createStrongRef(params.subjectUri, params.subjectCid),
      score: params.score,
      methodology: params.methodology,
      createdAt: new Date().toISOString(),
    };

    // Add previous evaluation reference if provided
    if (params.previousEvaluationUri && params.previousEvaluationCid) {
      record.previousEvaluation = this.createStrongRef(params.previousEvaluationUri, params.previousEvaluationCid);
    }

    // Create the record with validation
    const { uri, cid } = await this.validateAndCreate(EVALUATION_NSID, record);

    return { uri, cid, record };
  }

  /**
   * Update an evaluation by creating a new evaluation that references the previous one.
   *
   * Note: AT Protocol records are immutable, so "updating" means creating a new
   * record that references the old one.
   *
   * @param params - Update parameters including previous evaluation reference
   * @returns The new evaluation record
   *
   * @example
   * ```typescript
   * const updated = await evaluations.update({
   *   subjectUri: hypercert.hypercertUri,
   *   subjectCid: hypercert.hypercertCid,
   *   score: 90,
   *   methodology: "Re-evaluated after new evidence",
   *   previousEvaluationUri: firstEval.uri,
   *   previousEvaluationCid: firstEval.cid,
   * });
   * ```
   */
  async update(params: UpdateEvaluationParams): Promise<EvaluationResult> {
    return this.create({
      subjectUri: params.subjectUri,
      subjectCid: params.subjectCid,
      score: params.score,
      methodology: params.methodology,
      previousEvaluationUri: params.previousEvaluationUri,
      previousEvaluationCid: params.previousEvaluationCid,
    });
  }

  /**
   * Create a quick evaluation with just a score.
   *
   * This is a convenience method for simple use cases.
   *
   * @example
   * ```typescript
   * const evaluation = await evaluations.quickScore(
   *   hypercert.hypercertUri,
   *   hypercert.hypercertCid,
   *   85
   * );
   * ```
   */
  async quickScore(subjectUri: string, subjectCid: string, score: number): Promise<EvaluationResult> {
    return this.create({ subjectUri, subjectCid, score });
  }

  /**
   * Get the average score from multiple evaluations.
   *
   * This is a helper method for calculating aggregate scores.
   *
   * @param evaluations - Array of evaluation records
   * @returns Average score rounded to nearest integer
   *
   * @example
   * ```typescript
   * const scores = [eval1.record, eval2.record, eval3.record];
   * const average = EvaluationOperations.calculateAverageScore(scores);
   * console.log(`Average score: ${average}/100`);
   * ```
   */
  static calculateAverageScore(evaluations: Evaluation[]): number {
    if (evaluations.length === 0) return 0;
    const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0);
    return Math.round(sum / evaluations.length);
  }

  /**
   * Check if an evaluation is an update (has a previousEvaluation reference).
   *
   * @param evaluation - The evaluation record to check
   * @returns True if this is an update, false if it's the first evaluation
   */
  static isUpdate(evaluation: Evaluation): boolean {
    return evaluation.previousEvaluation !== undefined;
  }

  /**
   * Extract the rkey (record key) from an evaluation URI.
   *
   * This is useful for building queries or displaying shortened identifiers.
   *
   * @param uri - The evaluation AT-URI
   * @returns The record key (TID)
   *
   * @example
   * ```typescript
   * const rkey = EvaluationOperations.getRkey(evaluation.uri);
   * console.log(`Evaluation ID: ${rkey}`);
   * ```
   */
  static getRkey(uri: string): string {
    const parts = uri.split("/");
    return parts[parts.length - 1];
  }
}
