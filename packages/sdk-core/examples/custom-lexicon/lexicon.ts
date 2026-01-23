/**
 * Example: Custom Lexicon Definition for Hypercert Evaluations
 *
 * This lexicon defines a record type for evaluating hypercerts with scores,
 * methodology descriptions, and timestamps.
 */

import {
  createLexiconDoc,
  createStringField,
  createIntegerField,
  createStrongRefField,
  createDatetimeField,
  validateLexiconStructure,
  type LexiconDoc,
} from "../../src/index.js";

/**
 * The NSID (Namespaced Identifier) for our evaluation lexicon.
 *
 * NSIDs use reverse domain notation: org.example.evaluation
 * - org.example: Your organization's domain in reverse
 * - evaluation: The record type name
 */
export const EVALUATION_NSID = "org.example.evaluation";

/**
 * Create the evaluation lexicon using builder utilities.
 *
 * This demonstrates the recommended approach using helper functions
 * instead of writing raw JSON.
 */
export const evaluationLexicon: LexiconDoc = createLexiconDoc(
  EVALUATION_NSID,
  {
    // Every record must have a $type field that identifies its type
    $type: createStringField({
      const: EVALUATION_NSID,
      description: "Record type identifier",
    }),

    // StrongRef to the hypercert being evaluated
    subject: createStrongRefField({
      description: "The hypercert being evaluated",
    }),

    // Score from 0 to 100
    // NOTE: This example uses integer type for demonstration. In production,
    // consider using string type for numeric values to avoid precision issues
    // (see org.hypercerts.claim.measurement for reference).
    // Use integer only when you specifically need whole numbers (counts, ratings, etc.)
    score: createIntegerField({
      description: "Evaluation score",
      minimum: 0,
      maximum: 100,
    }),

    // Optional methodology description
    methodology: createStringField({
      description: "Description of how the evaluation was conducted",
      maxLength: 1000,
    }),

    // ISO 8601 timestamp
    createdAt: createDatetimeField({
      description: "When the evaluation was created",
    }),

    // Optional reference to a previous evaluation (for updates)
    previousEvaluation: createStrongRefField({
      description: "Reference to a previous evaluation, if this is an update",
    }),
  },
  // Required fields - must be provided when creating a record
  ["$type", "subject", "score", "createdAt"],
  // Key type - "tid" means the server generates unique timestamp-based IDs
  "tid",
);

// Validate the lexicon structure at module load time
if (!validateLexiconStructure(evaluationLexicon)) {
  throw new Error("Invalid evaluation lexicon structure");
}

/**
 * Alternative: Manual JSON Definition
 *
 * You can also define lexicons as plain JSON objects.
 * This is useful if you're loading from a file or generating programmatically.
 */
export const evaluationLexiconJSON = {
  lexicon: 1,
  id: EVALUATION_NSID,
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["$type", "subject", "score", "createdAt"],
        properties: {
          $type: {
            type: "string",
            const: EVALUATION_NSID,
            description: "Record type identifier",
          },
          subject: {
            type: "ref",
            ref: "com.atproto.repo.strongRef",
            description: "The hypercert being evaluated",
          },
          score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Evaluation score",
          },
          methodology: {
            type: "string",
            maxLength: 1000,
            description: "Description of how the evaluation was conducted",
          },
          createdAt: {
            type: "string",
            format: "datetime",
            description: "When the evaluation was created",
          },
          previousEvaluation: {
            type: "ref",
            ref: "com.atproto.repo.strongRef",
            description: "Reference to a previous evaluation, if this is an update",
          },
        },
      },
    },
  },
} as const;
