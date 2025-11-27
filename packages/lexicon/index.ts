/**
 * Hypercert lexicon definitions for AT Protocol.
 *
 * This module exports the lexicon documents and collection names
 * for all hypercert-related record types. Lexicons define the
 * schema for records stored in AT Protocol repositories.
 *
 * @packageDocumentation
 */

import defsLexicon from "./lexicons/app/certified/defs.json";
import locationLexicon from "./lexicons/app/certified/location.json";
import claimLexicon from "./lexicons/org/hypercerts/claim.json";
import contributionLexicon from "./lexicons/org/hypercerts/claim/contribution.json";
import evaluationLexicon from "./lexicons/org/hypercerts/claim/evaluation.json";
import evidenceLexicon from "./lexicons/org/hypercerts/claim/evidence.json";
import measurementLexicon from "./lexicons/org/hypercerts/claim/measurement.json";
import rightsLexicon from "./lexicons/org/hypercerts/claim/rights.json";
import strongRefLexicon from "./lexicons/com/atproto/repo/strongRef.json";
import collectionLexicon from "./lexicons/org/hypercerts/collection.json";
import type { LexiconDoc } from "@atproto/lexicon";

/**
 * All hypercert-related lexicons for registration with AT Protocol Agent.
 *
 * This array contains all lexicon documents needed to work with
 * hypercert records.
 */
export const HYPERCERT_LEXICONS: LexiconDoc[] = [
  defsLexicon as LexiconDoc,
  locationLexicon as LexiconDoc,
  claimLexicon as LexiconDoc,
  rightsLexicon as LexiconDoc,
  contributionLexicon as LexiconDoc,
  measurementLexicon as LexiconDoc,
  evaluationLexicon as LexiconDoc,
  evidenceLexicon as LexiconDoc,
  collectionLexicon as LexiconDoc,
];

/**
 * Collection NSIDs (Namespaced Identifiers) for hypercert records.
 *
 * Use these constants when performing record operations to ensure
 * correct collection names.
 */
export const HYPERCERT_COLLECTIONS = {
  /**
   * Main hypercert claim record collection.
   */
  CLAIM: "org.hypercerts.claim",

  /**
   * Rights record collection.
   */
  RIGHTS: "org.hypercerts.claim.rights",

  /**
   * Location record collection (shared certified lexicon).
   */
  LOCATION: "app.certified.location",

  /**
   * Contribution record collection.
   */
  CONTRIBUTION: "org.hypercerts.claim.contribution",

  /**
   * Measurement record collection.
   */
  MEASUREMENT: "org.hypercerts.claim.measurement",

  /**
   * Evaluation record collection.
   */
  EVALUATION: "org.hypercerts.claim.evaluation",

  /**
   * Evidence record collection.
   */
  EVIDENCE: "org.hypercerts.claim.evidence",

  /**
   * Collection record collection (groups of hypercerts).
   */
  COLLECTION: "org.hypercerts.collection",
} as const;

// Re-export individual lexicons for direct access
export {
  defsLexicon,
  locationLexicon,
  strongRefLexicon,
  claimLexicon,
  contributionLexicon,
  evaluationLexicon,
  evidenceLexicon,
  measurementLexicon,
  rightsLexicon,
  collectionLexicon,
};
