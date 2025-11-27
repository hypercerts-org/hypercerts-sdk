/**
 * Hypercert lexicon definitions for ATProto Agent registration
 * These lexicons define the schema for hypercert records in ATProto repositories
 */

import defsLexicon from "./defs.json";
import hypercertLexicon from "./hypercert.json";
import collectionLexicon from "./hypercertCollection.json";
import contributionLexicon from "./hypercertContribution.json";
import evaluationLexicon from "./hypercertEvaluation.json";
import locationLexicon from "./hypercertLocation.json";
import measurementLexicon from "./hypercertMeasurement.json";
import rightsLexicon from "./hypercertRights.json";
import type { LexiconDoc } from "@atproto/lexicon";

/**
 * All hypercert-related lexicons for registration with ATProto Agent
 */
export const HYPERCERT_LEXICONS: LexiconDoc[] = [
  defsLexicon as LexiconDoc,
  hypercertLexicon as LexiconDoc,
  rightsLexicon as LexiconDoc,
  locationLexicon as LexiconDoc,
  contributionLexicon as LexiconDoc,
  measurementLexicon as LexiconDoc,
  evaluationLexicon as LexiconDoc,
  collectionLexicon as LexiconDoc,
];

/**
 * Collection names for hypercert records
 */
export const HYPERCERT_COLLECTIONS = {
  RECORD: "org.hypercerts.claim.record",
  RIGHTS: "org.hypercerts.claim.rights",
  LOCATION: "org.hypercerts.claim.location",
  CONTRIBUTION: "org.hypercerts.claim.contribution",
  MEASUREMENT: "org.hypercerts.claim.measurement",
  EVALUATION: "org.hypercerts.claim.evaluation",
  COLLECTION: "org.hypercerts.collection",
} as const;
