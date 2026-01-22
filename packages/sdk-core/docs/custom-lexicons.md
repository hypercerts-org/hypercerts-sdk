# Custom Lexicons Guide

This guide explains how to create and use custom lexicons with the Hypercerts SDK. Custom lexicons allow you to define
new record types that can reference hypercerts and other records using strongRefs.

## Table of Contents

- [Overview](#overview)
- [What are Lexicons?](#what-are-lexicons)
- [When to Use Custom Lexicons](#when-to-use-custom-lexicons)
- [Creating a Custom Lexicon](#creating-a-custom-lexicon)
- [Registering Your Lexicon](#registering-your-lexicon)
- [Using Custom Records](#using-custom-records)
- [Building Custom Operations](#building-custom-operations)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)

## Overview

Custom lexicons enable you to:

1. **Define custom record types** with strongly-typed schemas
2. **Reference hypercerts** and other records using strongRefs
3. **Validate records** before creation on the client side
4. **Build domain-specific operations** for your custom types
5. **Create related records** using the sidecar pattern

## What are Lexicons?

Lexicons are JSON schemas that define the structure of records in AT Protocol. They specify:

- **Field names and types** (string, integer, boolean, datetime, etc.)
- **Required vs optional fields**
- **Constraints** (min/max length, min/max value, enum values)
- **References** to other records using strongRefs
- **Record key type** (server-generated TID or custom key)

### Example Lexicon

```json
{
  "lexicon": 1,
  "id": "org.myapp.evaluation",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["$type", "subject", "score", "createdAt"],
        "properties": {
          "$type": {
            "type": "string",
            "const": "org.myapp.evaluation"
          },
          "subject": {
            "type": "ref",
            "ref": "com.atproto.repo.strongRef",
            "description": "The hypercert being evaluated"
          },
          "score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "description": "Score from 0 to 100"
          },
          "methodology": {
            "type": "string",
            "maxLength": 500,
            "description": "Optional methodology description"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```

## When to Use Custom Lexicons

Consider custom lexicons when you need to:

- **Add metadata** to hypercerts (evaluations, ratings, reviews)
- **Create relationships** between hypercerts and other entities
- **Track additional data** not covered by standard hypercert fields
- **Build domain-specific features** on top of hypercerts
- **Implement workflows** that require custom record types

### Common Use Cases

1. **Evaluations**: Score or rate hypercerts based on methodology
2. **Comments**: Add community feedback to hypercerts
3. **Endorsements**: Signal support for specific hypercerts
4. **Projects**: Group multiple hypercerts under a parent entity
5. **Milestones**: Track progress on hypercert claims
6. **Attestations**: Verify specific aspects of hypercerts

## Creating a Custom Lexicon

### Method 1: Using Builder Utilities (Recommended)

The SDK provides builder utilities to construct lexicons programmatically:

```typescript
import {
  createLexiconDoc,
  createStringField,
  createIntegerField,
  createStrongRefField,
  createDatetimeField,
} from "@hypercerts-org/sdk-core";

const evaluationLexicon = createLexiconDoc(
  "org.myapp.evaluation",
  {
    $type: createStringField({ const: "org.myapp.evaluation" }),
    subject: createStrongRefField({
      description: "The hypercert being evaluated",
    }),
    score: createIntegerField({
      description: "Score from 0 to 100",
      minimum: 0,
      maximum: 100,
    }),
    methodology: createStringField({
      description: "Optional methodology description",
      maxLength: 500,
    }),
    createdAt: createDatetimeField(),
  },
  ["$type", "subject", "score", "createdAt"], // Required fields
  "tid", // Use server-generated TIDs
);
```

### Method 2: Manual JSON

You can also write the JSON directly:

```typescript
const evaluationLexicon = {
  lexicon: 1,
  id: "org.myapp.evaluation",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["$type", "subject", "score", "createdAt"],
        properties: {
          $type: { type: "string", const: "org.myapp.evaluation" },
          subject: {
            type: "ref",
            ref: "com.atproto.repo.strongRef",
          },
          score: { type: "integer", minimum: 0, maximum: 100 },
          methodology: { type: "string", maxLength: 500 },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};
```

### Field Types

Available field types:

```typescript
// String fields
createStringField({ minLength: 1, maxLength: 200 });
createStringField({ enum: ["draft", "published", "archived"] });
createStringField({ format: "uri" }); // uri, at-uri, did, handle, datetime, etc.

// Numeric fields
createIntegerField({ minimum: 0, maximum: 100 });
createNumberField({ minimum: 0.0, maximum: 1.0 });

// Other types
createBooleanField({ default: false });
createDatetimeField(); // ISO 8601 datetime string
createStrongRefField(); // Reference to another record
createBlobField({ accept: ["image/png"], maxSize: 1000000 });

// Arrays
createArrayField(createStringField({ maxLength: 50 }), { minLength: 1, maxLength: 10 });

// Objects
createObjectField({
  properties: {
    name: createStringField(),
    value: createIntegerField(),
  },
  required: ["name"],
});
```

## Registering Your Lexicon

After creating your lexicon, register it with the SDK:

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

// Initialize SDK
const sdk = createATProtoSDK({
  oauth: {
    clientId: "your-client-id",
    redirectUri: "http://localhost:3000/callback",
  },
});

// Register your custom lexicon
const registry = sdk.getLexiconRegistry();
registry.registerFromJSON(evaluationLexicon);
```

The SDK will now validate records against your lexicon before creating them.

## Using Custom Records

### Method 1: Direct Record Creation

```typescript
// Authenticate and get repository
const session = await sdk.authorize({ identifier: "user.bsky.social" });
const repo = sdk.repository(session);

// Create a hypercert first
const hypercert = await repo.hypercerts.create({
  title: "Climate Research Project",
  description: "Carbon capture study 2024",
  // ... other hypercert fields
});

// Create an evaluation record referencing the hypercert
const evaluation = await repo.records.create({
  collection: "org.myapp.evaluation",
  record: {
    $type: "org.myapp.evaluation",
    subject: {
      uri: hypercert.hypercertUri,
      cid: hypercert.hypercertCid,
    },
    score: 85,
    methodology: "Peer review by three independent experts",
    createdAt: new Date().toISOString(),
  },
});

console.log(`Created evaluation: ${evaluation.uri}`);
```

### Method 2: Using Helper Utilities

```typescript
import { createStrongRefFromResult } from "@hypercerts-org/sdk-core";

const evaluation = await repo.records.create({
  collection: "org.myapp.evaluation",
  record: {
    $type: "org.myapp.evaluation",
    subject: createStrongRefFromResult(hypercert), // Simpler!
    score: 85,
    createdAt: new Date().toISOString(),
  },
});
```

### Validation

If your record doesn't match the registered lexicon, you'll get a validation error:

```typescript
try {
  await repo.records.create({
    collection: "org.myapp.evaluation",
    record: {
      $type: "org.myapp.evaluation",
      subject: { uri: "...", cid: "..." },
      score: 150, // ❌ Exceeds maximum of 100
      createdAt: new Date().toISOString(),
    },
  });
} catch (error) {
  console.error("Validation failed:", error.message);
  // "Invalid record for collection org.myapp.evaluation: score must be at most 100"
}
```

## Building Custom Operations

For a better developer experience, create domain-specific operation classes:

### Step 1: Define TypeScript Types

```typescript
import type { StrongRef } from "@hypercerts-org/sdk-core";

export interface Evaluation {
  $type: "org.myapp.evaluation";
  subject: StrongRef;
  score: number;
  methodology?: string;
  createdAt: string;
}

export interface CreateEvaluationParams {
  subjectUri: string;
  subjectCid: string;
  score: number;
  methodology?: string;
}

export interface EvaluationResult {
  uri: string;
  cid: string;
  record: Evaluation;
}
```

### Step 2: Create Operations Class

```typescript
import { BaseOperations } from "@hypercerts-org/sdk-core";
import type { Agent } from "@atproto/api";
import type { LexiconRegistry } from "@hypercerts-org/sdk-core";

export class EvaluationOperations extends BaseOperations<CreateEvaluationParams, EvaluationResult> {
  constructor(agent: Agent, repoDid: string, registry: LexiconRegistry) {
    super(agent, repoDid, registry);
  }

  async create(params: CreateEvaluationParams): Promise<EvaluationResult> {
    const record: Evaluation = {
      $type: "org.myapp.evaluation",
      subject: this.createStrongRef(params.subjectUri, params.subjectCid),
      score: params.score,
      methodology: params.methodology,
      createdAt: new Date().toISOString(),
    };

    const { uri, cid } = await this.validateAndCreate("org.myapp.evaluation", record);

    return { uri, cid, record };
  }

  async getBySubject(subjectUri: string): Promise<Evaluation[]> {
    // Query records by subject (would need to implement repo.records.list)
    // This is a placeholder for demonstration
    throw new Error("Not implemented");
  }
}
```

### Step 3: Use Custom Operations

```typescript
// Create operations instance
const evaluations = new EvaluationOperations(repo.agent, repo.repoDid, repo.getLexiconRegistry());

// Use the domain-specific API
const evaluation = await evaluations.create({
  subjectUri: hypercert.hypercertUri,
  subjectCid: hypercert.hypercertCid,
  score: 85,
  methodology: "Peer review",
});

console.log(`Evaluation score: ${evaluation.record.score}`);
```

## Complete Example

Here's a complete example putting it all together:

```typescript
import {
  createATProtoSDK,
  createLexiconDoc,
  createStringField,
  createIntegerField,
  createStrongRefField,
  createDatetimeField,
  BaseOperations,
} from "@hypercerts-org/sdk-core";

// 1. Define lexicon
const evaluationLexicon = createLexiconDoc(
  "org.myapp.evaluation",
  {
    $type: createStringField({ const: "org.myapp.evaluation" }),
    subject: createStrongRefField(),
    score: createIntegerField({ minimum: 0, maximum: 100 }),
    methodology: createStringField({ maxLength: 500 }),
    createdAt: createDatetimeField(),
  },
  ["$type", "subject", "score", "createdAt"],
);

// 2. Initialize SDK and register lexicon
const sdk = createATProtoSDK({
  oauth: {
    clientId: "your-client-id",
    redirectUri: "http://localhost:3000/callback",
  },
});

sdk.getLexiconRegistry().registerFromJSON(evaluationLexicon);

// 3. Authenticate
const session = await sdk.authorize({ identifier: "user.bsky.social" });
const repo = sdk.repository(session);

// 4. Create a hypercert
const hypercert = await repo.hypercerts.create({
  title: "Climate Research",
  description: "Carbon capture study",
  workTimeframeFrom: "2024-01-01",
  workTimeframeTo: "2024-12-31",
  impactScope: ["Climate"],
  workScope: ["Research"],
  rights: ["Public Display"],
  allowlistEntries: [],
});

// 5. Create an evaluation
const evaluation = await repo.records.create({
  collection: "org.myapp.evaluation",
  record: {
    $type: "org.myapp.evaluation",
    subject: {
      uri: hypercert.hypercertUri,
      cid: hypercert.hypercertCid,
    },
    score: 90,
    methodology: "Assessed by climate science experts",
    createdAt: new Date().toISOString(),
  },
});

console.log(`Created evaluation: ${evaluation.uri}`);
console.log(`Hypercert received score: 90/100`);
```

## Best Practices

### Naming Conventions

- **NSID format**: Use reverse domain notation: `org.yourapp.recordtype`
- **Field names**: Use camelCase: `createdAt`, `workScope`, `impactScore`
- **Type field**: Always include `$type` field with the NSID as a constant

### Schema Design

1. **Keep records focused**: One record type per concern
2. **Use strongRefs for relationships**: Always reference other records with `{ uri, cid }`
3. **Include timestamps**: Add `createdAt` and optionally `updatedAt`
4. **Make fields optional when appropriate**: Required fields must always be provided
5. **Add descriptions**: Document fields in the lexicon for better developer experience

### Validation

1. **Register before use**: Always register lexicons before creating records
2. **Validate locally**: The SDK validates on the client before sending to server
3. **Handle errors gracefully**: Catch `ValidationError` and provide user feedback
4. **Use skipValidation sparingly**: Only skip validation if absolutely necessary

### Performance

1. **Register once**: Register lexicons at SDK initialization, not per request
2. **Reuse operations**: Create operation instances once and reuse them
3. **Batch operations**: Use utilities like `batchCreateSidecars` for multiple records
4. **Cache references**: Store strongRefs when creating multiple related records

### Security

1. **Validate user input**: Don't trust client data, validate before creating records
2. **Check permissions**: Ensure users have permission to create custom records
3. **Sanitize content**: Escape or sanitize text fields to prevent injection attacks
4. **Rate limit**: Consider rate limiting custom record creation

### TypeScript

1. **Generate types**: Create TypeScript interfaces for your records
2. **Use type guards**: Implement type guards for runtime type checking
3. **Export types**: Make types available for other developers using your lexicon
4. **Document types**: Add JSDoc comments to interfaces

## Next Steps

- Learn about the [Sidecar Pattern](./sidecar-pattern.md) for creating related records
- See the [complete example](../examples/custom-lexicon/) with tests
- Read about [AT Protocol Lexicons](https://atproto.com/specs/lexicon) in the official docs
- Explore the [SDK API Reference](../README.md#api-reference)
