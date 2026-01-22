# Sidecar Pattern Guide

The sidecar pattern is a way to create related records that reference a main record using strongRefs. This guide
explains how to use the sidecar pattern with the Hypercerts SDK.

## Table of Contents

- [Overview](#overview)
- [What is the Sidecar Pattern?](#what-is-the-sidecar-pattern)
- [When to Use Sidecars](#when-to-use-sidecars)
- [Basic Sidecar Creation](#basic-sidecar-creation)
- [Multiple Sidecars](#multiple-sidecars)
- [Main Record with Sidecars](#main-record-with-sidecars)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

## Overview

The sidecar pattern enables you to:

1. **Create related records** that reference a main entity
2. **Add metadata** without modifying the original record
3. **Build relationships** between records using strongRefs
4. **Implement workflows** with dependent records
5. **Organize complex data** across multiple record types

## What is the Sidecar Pattern?

In the sidecar pattern, you have:

- **Main Record**: The primary entity (e.g., a hypercert, project, or organization)
- **Sidecar Records**: Related entities that reference the main record using strongRefs

### Example Structure

```
┌──────────────────────┐
│   Main Record        │
│   (Hypercert)        │
│                      │
│   uri: at://...      │
│   cid: bafyrei...    │
└──────────────────────┘
           ▲
           │ strongRef
           │
    ┌──────┴──────┬──────────────┬──────────────┐
    │             │              │              │
┌───┴────┐   ┌───┴────┐    ┌───┴────┐    ┌───┴────┐
│Sidecar │   │Sidecar │    │Sidecar │    │Sidecar │
│(Eval)  │   │(Comment)    │(Evidence)   │(Rating)│
└────────┘   └────────┘    └────────┘    └────────┘
```

Each sidecar contains a `subject` field (or similar) that references the main record:

```typescript
{
  $type: "org.myapp.evaluation",
  subject: {
    uri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
    cid: "bafyreiabc123..."
  },
  score: 85,
  // ... other fields
}
```

## When to Use Sidecars

### Use sidecars when:

- **Adding metadata** that doesn't fit in the main record schema
- **Creating modular features** that can be added independently
- **Enabling extensions** by third parties
- **Tracking changes** or history without modifying the original
- **Building workflows** where records depend on each other

### Common Use Cases

1. **Evaluations**: Add scores/ratings to hypercerts
2. **Comments**: Enable community discussion on hypercerts
3. **Evidence**: Attach supporting documentation
4. **Endorsements**: Signal support or verification
5. **Projects**: Group multiple hypercerts under a parent
6. **Milestones**: Track progress on claims
7. **Metadata**: Add tags, categories, or classifications

## Basic Sidecar Creation

### Step 1: Create the Main Record

```typescript
import { createATProtoSDK } from "@hypercerts-org/sdk-core";

const sdk = createATProtoSDK({...});
const session = await sdk.authorize({...});
const repo = sdk.repository(session);

// Create a hypercert (main record)
const hypercert = await repo.hypercerts.create({
  title: "Climate Research Project",
  description: "Carbon capture study",
  workTimeframeFrom: "2024-01-01",
  workTimeframeTo: "2024-12-31",
  impactScope: ["Climate"],
  workScope: ["Research"],
  rights: ["Public Display"],
  allowlistEntries: [],
});

console.log(`Created hypercert: ${hypercert.hypercertUri}`);
```

### Step 2: Create a Sidecar Record

```typescript
import { createSidecarRecord } from "@hypercerts-org/sdk-core";

// Create an evaluation sidecar
const evaluation = await createSidecarRecord(repo, "org.myapp.evaluation", {
  $type: "org.myapp.evaluation",
  subject: {
    uri: hypercert.hypercertUri,
    cid: hypercert.hypercertCid,
  },
  score: 85,
  methodology: "Peer review",
  createdAt: new Date().toISOString(),
});

console.log(`Created evaluation sidecar: ${evaluation.uri}`);
```

### Using the Helper Function

The `attachSidecar` function provides a cleaner API:

```typescript
import { attachSidecar } from "@hypercerts-org/sdk-core";

const result = await attachSidecar(repo, {
  mainRecord: {
    uri: hypercert.hypercertUri,
    cid: hypercert.hypercertCid,
  },
  sidecar: {
    collection: "org.myapp.evaluation",
    record: {
      $type: "org.myapp.evaluation",
      subject: {
        uri: hypercert.hypercertUri,
        cid: hypercert.hypercertCid,
      },
      score: 85,
      methodology: "Peer review",
      createdAt: new Date().toISOString(),
    },
  },
});

console.log(`Main: ${result.mainRecord.uri}`);
console.log(`Sidecar: ${result.sidecarRecord.uri}`);
```

## Multiple Sidecars

### Batch Create Sidecars

When you need to create multiple sidecars for a single main record:

```typescript
import { batchCreateSidecars } from "@hypercerts-org/sdk-core";

const mainRecord = {
  uri: hypercert.hypercertUri,
  cid: hypercert.hypercertCid,
};

const sidecars = await batchCreateSidecars(repo, [
  {
    collection: "org.myapp.evaluation",
    record: {
      $type: "org.myapp.evaluation",
      subject: mainRecord,
      score: 85,
      createdAt: new Date().toISOString(),
    },
  },
  {
    collection: "org.myapp.comment",
    record: {
      $type: "org.myapp.comment",
      subject: mainRecord,
      text: "Excellent work!",
      author: "Expert Reviewer",
      createdAt: new Date().toISOString(),
    },
  },
  {
    collection: "org.myapp.evidence",
    record: {
      $type: "org.myapp.evidence",
      subject: mainRecord,
      url: "https://example.com/evidence.pdf",
      description: "Supporting documentation",
      createdAt: new Date().toISOString(),
    },
  },
]);

console.log(`Created ${sidecars.length} sidecar records`);
```

## Main Record with Sidecars

### Create Main + Sidecars in One Operation

The `createWithSidecars` function orchestrates creating a main record followed by multiple sidecars:

```typescript
import { createWithSidecars } from "@hypercerts-org/sdk-core";

const result = await createWithSidecars(repo, {
  main: {
    collection: "org.hypercerts.project",
    record: {
      $type: "org.hypercerts.project",
      title: "Climate Initiative 2024",
      description: "Multi-faceted climate work",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      createdAt: new Date().toISOString(),
    },
  },
  sidecars: [
    {
      collection: "org.hypercerts.claim.activity",
      record: {
        $type: "org.hypercerts.claim.activity",
        title: "Tree Planting Campaign",
        description: "Planted 10,000 trees",
        workTimeframeFrom: "2024-01-01",
        workTimeframeTo: "2024-06-30",
        impactScope: ["Environment"],
        workScope: ["Restoration"],
        rights: ["Public Display"],
        allowlistEntries: [],
      },
    },
    {
      collection: "org.hypercerts.claim.activity",
      record: {
        $type: "org.hypercerts.claim.activity",
        title: "Carbon Measurement Study",
        description: "Measured carbon capture",
        workTimeframeFrom: "2024-07-01",
        workTimeframeTo: "2024-12-31",
        impactScope: ["Climate"],
        workScope: ["Research"],
        rights: ["Public Display"],
        allowlistEntries: [],
      },
    },
  ],
});

console.log(`Created project: ${result.main.uri}`);
console.log(`Created ${result.sidecars.length} hypercert sidecars`);

// Access the created records
const projectUri = result.main.uri;
const treePlantingUri = result.sidecars[0].uri;
const carbonStudyUri = result.sidecars[1].uri;
```

## Advanced Patterns

### Nested Sidecars

Sidecars can reference other sidecars, creating a hierarchy:

```typescript
// Create main hypercert
const hypercert = await repo.hypercerts.create({...});

// Create first-level sidecar (evaluation)
const evaluation = await createSidecarRecord(repo, "org.myapp.evaluation", {
  $type: "org.myapp.evaluation",
  subject: {
    uri: hypercert.hypercertUri,
    cid: hypercert.hypercertCid,
  },
  score: 85,
  createdAt: new Date().toISOString(),
});

// Create second-level sidecar (comment on evaluation)
const comment = await createSidecarRecord(repo, "org.myapp.comment", {
  $type: "org.myapp.comment",
  subject: {
    uri: evaluation.uri,
    cid: evaluation.cid,
  },
  text: "I agree with this score",
  createdAt: new Date().toISOString(),
});
```

Structure:

```
Hypercert
  └── Evaluation
      └── Comment
```

### Bidirectional References

You can create two-way references between records:

```typescript
// Create main hypercert
const hypercert = await repo.hypercerts.create({...});

// Create evidence sidecar
const evidence = await createSidecarRecord(repo, "org.myapp.evidence", {
  $type: "org.myapp.evidence",
  subject: {
    uri: hypercert.hypercertUri,
    cid: hypercert.hypercertCid,
  },
  url: "https://example.com/proof.pdf",
  createdAt: new Date().toISOString(),
});

// Update hypercert to reference the evidence
// Note: This requires the hypercert lexicon to support an evidence field
await repo.hypercerts.attachEvidence({
  hypercertUri: hypercert.hypercertUri,
  evidence: {
    uri: evidence.uri,
    cid: evidence.cid,
  },
});
```

### Collection Pattern

Create a collection that references multiple records:

```typescript
// Create multiple hypercerts
const hypercert1 = await repo.hypercerts.create({...});
const hypercert2 = await repo.hypercerts.create({...});
const hypercert3 = await repo.hypercerts.create({...});

// Create a collection referencing all of them
const collection = await repo.hypercerts.createCollection({
  title: "Climate Projects 2024",
  shortDescription: "Our impact portfolio",
  claims: [
    {
      uri: hypercert1.hypercertUri,
      cid: hypercert1.hypercertCid,
      weight: "0.4",
    },
    {
      uri: hypercert2.hypercertUri,
      cid: hypercert2.hypercertCid,
      weight: "0.35",
    },
    {
      uri: hypercert3.hypercertUri,
      cid: hypercert3.hypercertCid,
      weight: "0.25",
    },
  ],
});
```

### Temporal Sidecars

Track changes over time with timestamped sidecars:

```typescript
// Initial evaluation
const eval1 = await createSidecarRecord(repo, "org.myapp.evaluation", {
  $type: "org.myapp.evaluation",
  subject: { uri: hypercert.hypercertUri, cid: hypercert.hypercertCid },
  score: 75,
  createdAt: "2024-01-01T00:00:00Z",
});

// Re-evaluation after 6 months
const eval2 = await createSidecarRecord(repo, "org.myapp.evaluation", {
  $type: "org.myapp.evaluation",
  subject: { uri: hypercert.hypercertUri, cid: hypercert.hypercertCid },
  score: 90,
  createdAt: "2024-06-01T00:00:00Z",
  previousEvaluation: {
    uri: eval1.uri,
    cid: eval1.cid,
  },
});
```

## Best Practices

### Design

1. **Keep sidecars focused**: Each sidecar type should serve a single purpose
2. **Use strongRefs consistently**: Always reference the exact version with `{ uri, cid }`
3. **Include timestamps**: Add `createdAt` to track when sidecars were created
4. **Plan for queries**: Consider how you'll query sidecars later
5. **Version your schema**: Include schema version in `$type` if needed

### Performance

1. **Batch when possible**: Use `batchCreateSidecars` for multiple sidecars
2. **Create in parallel**: Independent sidecars can be created concurrently
3. **Cache main record refs**: Store the main record's strongRef to reuse
4. **Limit sidecar count**: Too many sidecars can impact loading performance
5. **Use pagination**: Query sidecars in batches for large datasets

### Data Integrity

1. **Validate before creation**: Register lexicons and validate sidecars
2. **Handle failures**: If sidecar creation fails, decide whether to rollback
3. **Check permissions**: Ensure users can create sidecars for the main record
4. **Prevent duplicates**: Check if a sidecar already exists before creating
5. **Use transactions**: If the platform supports it, use atomic operations

### UX Considerations

1. **Show loading states**: Creating sidecars takes time, provide feedback
2. **Display relationships**: Show how sidecars relate to the main record
3. **Enable discovery**: Make it easy to find all sidecars for a record
4. **Support filtering**: Allow users to filter sidecars by type or criteria
5. **Provide context**: Show when and why sidecars were created

### Code Organization

1. **Separate concerns**: Keep sidecar logic separate from main record logic
2. **Create utilities**: Build helper functions for common sidecar operations
3. **Type everything**: Use TypeScript interfaces for sidecar records
4. **Document patterns**: Explain when and how to use each sidecar type
5. **Test thoroughly**: Write tests for sidecar creation and querying

## Example: Complete Workflow

Here's a complete example showing a real-world sidecar workflow:

```typescript
import {
  createATProtoSDK,
  createWithSidecars,
  batchCreateSidecars,
  attachSidecar,
} from "@hypercerts-org/sdk-core";

// 1. Initialize SDK
const sdk = createATProtoSDK({...});
const session = await sdk.authorize({...});
const repo = sdk.repository(session);

// 2. Create a hypercert with immediate evidence
const result = await createWithSidecars(repo, {
  main: {
    collection: "org.hypercerts.claim.activity",
    record: {
      $type: "org.hypercerts.claim.activity",
      title: "Community Garden Project",
      description: "Created a community garden for local food production",
      workTimeframeFrom: "2024-01-01",
      workTimeframeTo: "2024-06-30",
      impactScope: ["Community", "Environment"],
      workScope: ["Agriculture", "Education"],
      rights: ["Public Display"],
      allowlistEntries: [],
    },
  },
  sidecars: [
    {
      collection: "org.myapp.evidence",
      record: {
        $type: "org.myapp.evidence",
        url: "https://example.com/photos.zip",
        description: "Photos of the completed garden",
        createdAt: new Date().toISOString(),
      },
    },
  ],
});

const hypercertRef = {
  uri: result.main.uri,
  cid: result.main.cid,
};

// 3. Later, add an evaluation
const evaluation = await attachSidecar(repo, {
  mainRecord: hypercertRef,
  sidecar: {
    collection: "org.myapp.evaluation",
    record: {
      $type: "org.myapp.evaluation",
      subject: hypercertRef,
      score: 92,
      methodology: "Site visit and community feedback",
      createdAt: new Date().toISOString(),
    },
  },
});

// 4. Add multiple community comments
await batchCreateSidecars(repo, [
  {
    collection: "org.myapp.comment",
    record: {
      $type: "org.myapp.comment",
      subject: hypercertRef,
      text: "This garden has transformed our neighborhood!",
      author: "Community Member",
      createdAt: new Date().toISOString(),
    },
  },
  {
    collection: "org.myapp.comment",
    record: {
      $type: "org.myapp.comment",
      subject: hypercertRef,
      text: "Great initiative, well executed.",
      author: "Local Official",
      createdAt: new Date().toISOString(),
    },
  },
]);

console.log("Complete workflow executed successfully!");
```

## Next Steps

- Learn about [Custom Lexicons](./custom-lexicons.md) for defining sidecar record types
- See the [complete example](../examples/custom-lexicon/) with full implementation
- Read about [AT Protocol Records](https://atproto.com/specs/record-key) in the official docs
- Explore the [SDK API Reference](../README.md#api-reference)
