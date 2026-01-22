/**
 * Example: Using Custom Lexicons with the Hypercerts SDK
 *
 * This example demonstrates the complete workflow for creating and using
 * custom lexicons to evaluate hypercerts.
 *
 * Run this example:
 *   pnpm tsx examples/custom-lexicon/usage.ts
 */

import { createATProtoSDK } from "../../src/index.js";
import { evaluationLexicon } from "./lexicon.js";
// import { EvaluationOperations } from "./operations.js"; // Used in example code below

/**
 * Main example function demonstrating the complete workflow.
 */
async function main() {
  console.log("🚀 Custom Lexicon Example\n");

  // ============================================================================
  // Step 1: Initialize SDK
  // ============================================================================

  console.log("1️⃣  Initializing SDK...");

  const sdk = createATProtoSDK({
    oauth: {
      clientId: "your-client-id",
      redirectUri: "http://localhost:3000/callback",
    },
  });

  // ============================================================================
  // Step 2: Register Custom Lexicon
  // ============================================================================

  console.log("2️⃣  Registering custom lexicon...");

  const registry = sdk.getLexiconRegistry();
  registry.registerFromJSON(evaluationLexicon);

  console.log("   ✓ Registered: org.example.evaluation\n");

  // ============================================================================
  // Step 3: Authenticate (commented out - requires real OAuth flow)
  // ============================================================================

  console.log("3️⃣  Authenticating...");
  console.log("   ⚠️  Skipping authentication in this example");
  console.log("   💡 In a real app, you would call:");
  console.log("      const session = await sdk.authorize({ identifier: 'user.bsky.social' });");
  console.log("      const repo = sdk.repository(session);\n");

  // For demonstration, we'll show what the code would look like:
  console.log("📝 Example Code:\n");

  printExampleCode();
}

/**
 * Print example code showing how to use the custom lexicon.
 */
function printExampleCode() {
  console.log(`
// ============================================================================
// Create a Hypercert
// ============================================================================

const hypercert = await repo.hypercerts.create({
  title: "Climate Research Project",
  description: "Advanced carbon capture research",
  workTimeframeFrom: "2024-01-01",
  workTimeframeTo: "2024-12-31",
  impactScope: ["Climate", "Environment"],
  workScope: ["Research", "Development"],
  rights: ["Public Display"],
  allowlistEntries: [],
});

console.log(\`Created hypercert: \${hypercert.hypercertUri}\`);

// ============================================================================
// Create Custom Operations Instance
// ============================================================================

const evaluations = new EvaluationOperations(
  repo.agent,
  repo.repoDid,
  repo.getLexiconRegistry()
);

// ============================================================================
// Create an Evaluation (Method 1: Using Custom Operations)
// ============================================================================

const evaluation = await evaluations.create({
  subjectUri: hypercert.hypercertUri,
  subjectCid: hypercert.hypercertCid,
  score: 85,
  methodology: "Peer review by three independent climate experts",
});

console.log(\`Created evaluation: \${evaluation.uri}\`);
console.log(\`Score: \${evaluation.record.score}/100\`);

// ============================================================================
// Create an Evaluation (Method 2: Direct Record Creation)
// ============================================================================

const evaluation2 = await repo.records.create({
  collection: "org.example.evaluation",
  record: {
    $type: "org.example.evaluation",
    subject: {
      uri: hypercert.hypercertUri,
      cid: hypercert.hypercertCid,
    },
    score: 90,
    methodology: "Updated review after additional evidence submission",
    createdAt: new Date().toISOString(),
  },
});

// ============================================================================
// Update an Evaluation (Creates New Record Referencing Previous)
// ============================================================================

const updatedEvaluation = await evaluations.update({
  subjectUri: hypercert.hypercertUri,
  subjectCid: hypercert.hypercertCid,
  score: 92,
  methodology: "Final review after project completion",
  previousEvaluationUri: evaluation.uri,
  previousEvaluationCid: evaluation.cid,
});

console.log(\`Updated evaluation: \${updatedEvaluation.uri}\`);
console.log(\`References previous: \${evaluation.uri}\`);

// ============================================================================
// Quick Score (Convenience Method)
// ============================================================================

const quickEval = await evaluations.quickScore(
  hypercert.hypercertUri,
  hypercert.hypercertCid,
  88
);

console.log(\`Quick evaluation score: \${quickEval.record.score}/100\`);

// ============================================================================
// Calculate Average Score
// ============================================================================

const allEvaluations = [
  evaluation.record,
  evaluation2.record,
  updatedEvaluation.record,
  quickEval.record,
];

const averageScore = EvaluationOperations.calculateAverageScore(allEvaluations);
console.log(\`Average score across all evaluations: \${averageScore}/100\`);

// ============================================================================
// Validation Examples
// ============================================================================

// ✅ Valid evaluation - will succeed
await evaluations.create({
  subjectUri: hypercert.hypercertUri,
  subjectCid: hypercert.hypercertCid,
  score: 75,
});

// ❌ Invalid score - will throw ValidationError
try {
  await evaluations.create({
    subjectUri: hypercert.hypercertUri,
    subjectCid: hypercert.hypercertCid,
    score: 150, // Exceeds maximum of 100
  });
} catch (error) {
  console.error("Validation failed:", error.message);
}

// ❌ Missing required field - will throw ValidationError
try {
  await repo.records.create({
    collection: "org.example.evaluation",
    record: {
      $type: "org.example.evaluation",
      // Missing 'subject' field
      score: 80,
      createdAt: new Date().toISOString(),
    },
  });
} catch (error) {
  console.error("Validation failed:", error.message);
}
`);
}

/**
 * Run the example.
 */
main().catch((error) => {
  console.error("Error running example:", error);
  process.exit(1);
});
