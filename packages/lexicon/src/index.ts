/**
 * Hypercert lexicon definitions for AT Protocol.
 *
 * This module exports the lexicon documents, collection names,
 * and generated TypeScript types for all hypercert-related record types.
 *
 * @packageDocumentation
 */

import defsLexicon from "../lexicons/app/certified/defs.json";
import locationLexicon from "../lexicons/app/certified/location.json";
import claimLexicon from "../lexicons/org/hypercerts/claim.json";
import contributionLexicon from "../lexicons/org/hypercerts/claim/contribution.json";
import evaluationLexicon from "../lexicons/org/hypercerts/claim/evaluation.json";
import evidenceLexicon from "../lexicons/org/hypercerts/claim/evidence.json";
import measurementLexicon from "../lexicons/org/hypercerts/claim/measurement.json";
import rightsLexicon from "../lexicons/org/hypercerts/claim/rights.json";
import strongRefLexicon from "../lexicons/com/atproto/repo/strongRef.json";
import collectionLexicon from "../lexicons/org/hypercerts/collection.json";
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

// Re-export generated types as namespaces (avoiding conflicts)
export * as AppCertifiedDefs from "./types/app/certified/defs.js";
export * as AppCertifiedLocation from "./types/app/certified/location.js";
export * as ComAtprotoRepoStrongRef from "./types/com/atproto/repo/strongRef.js";
export * as OrgHypercertsClaim from "./types/org/hypercerts/claim.js";
export * as OrgHypercertsClaimContribution from "./types/org/hypercerts/claim/contribution.js";
export * as OrgHypercertsClaimEvaluation from "./types/org/hypercerts/claim/evaluation.js";
export * as OrgHypercertsClaimEvidence from "./types/org/hypercerts/claim/evidence.js";
export * as OrgHypercertsClaimMeasurement from "./types/org/hypercerts/claim/measurement.js";
export * as OrgHypercertsClaimRights from "./types/org/hypercerts/claim/rights.js";
export * as OrgHypercertsCollection from "./types/org/hypercerts/collection.js";

// Re-export lexicon schemas, validation, and IDs
export { schemas, schemaDict, lexicons, validate, ids } from "./lexicons.js";

// Re-export utilities
export * from "./util.js";
