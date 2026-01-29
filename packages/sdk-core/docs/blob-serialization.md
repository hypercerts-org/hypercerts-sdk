# BlobRef Serialization in AT Protocol

This document explains how blob references work in the AT Protocol and the SDK's approach to handling them correctly.

## Overview

AT Protocol uses content-addressed blobs identified by CIDs (Content Identifiers). When storing blob references in
records, the wire format requires a specific structure that differs from how `BlobRef` instances are represented in
memory.

## The BlobRef Class

The `@atproto/lexicon` package provides a `BlobRef` class that encapsulates blob metadata:

```typescript
import { BlobRef } from "@atproto/lexicon";

// BlobRef stores:
// - ref: CID object (not a string!)
// - mimeType: string
// - size: number
```

### Key Insight: CID Objects vs Strings

The `BlobRef.ref` property holds a **CID object**, not a string. This is critical for correct serialization:

```typescript
// CORRECT: ref is a CID object
const blobRef = new BlobRef(cidObject, "image/png", 1234);
blobRef.ref.toString(); // "bafyrei..."

// INCORRECT: ref is a string (will serialize wrong!)
const badBlobRef = new BlobRef("bafyrei...", "image/png", 1234);
```

## Wire Format

AT Protocol uses a specific JSON format for blobs over the wire:

```json
{
  "$type": "blob",
  "ref": { "$link": "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454" },
  "mimeType": "image/png",
  "size": 1234
}
```

The `ref` field contains a **link object** (`{ "$link": "..." }`), not a plain string.

## Serialization Functions

### `stringifyLex()` - Object to Wire Format

Converts JavaScript objects (including `BlobRef` instances) to AT Protocol wire format:

```typescript
import { stringifyLex } from "@atproto/lexicon";

const record = {
  text: "Hello",
  image: blobRef, // BlobRef instance with CID object
};

const wireFormat = stringifyLex(record);
// image becomes: { "$type": "blob", "ref": { "$link": "..." }, ... }
```

**Important**: If `BlobRef.ref` is a string instead of a CID object, `stringifyLex()` will produce incorrect output:

```json
// WRONG - ref is a plain string
{ "$type": "blob", "ref": "bafyrei...", "mimeType": "image/png", "size": 1234 }

// CORRECT - ref is a link object
{ "$type": "blob", "ref": { "$link": "bafyrei..." }, "mimeType": "image/png", "size": 1234 }
```

### `jsonStringToLex()` - Wire Format to Object

Parses AT Protocol wire format JSON into JavaScript objects, converting blob references to proper `BlobRef` instances:

```typescript
import { jsonStringToLex } from "@atproto/lexicon";

const wireJson = JSON.stringify({
  $type: "blob",
  ref: { $link: "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454" },
  mimeType: "image/png",
  size: 1234,
});

const blobRef = jsonStringToLex(wireJson) as BlobRef;
// blobRef.ref is now a CID object, not a string
```

### `BlobRef.toJSON()` - Instance to Wire Format

Converts a single `BlobRef` to wire format:

```typescript
const wireFormat = blobRef.toJSON();
// { "$type": "blob", "ref": { "$link": "..." }, "mimeType": "...", "size": ... }
```

### `BlobRef.ipld()` - IPLD Representation

Returns the IPLD representation (internal format with raw CID object):

```typescript
const ipld = blobRef.ipld();
// { "$type": "blob", "ref": <CID object>, "mimeType": "...", "size": ... }
```

**Note**: `ipld()` returns the CID object directly, not a link object. Use `toJSON()` for wire format.

## SDK Implementation

### Blob Upload Flow

When uploading blobs, the SDK returns `BlobRef` instances with proper CID objects:

```typescript
// BlobOperationsImpl.upload() returns BlobRef with CID object
async upload(blob: Blob): Promise<BlobRef> {
  // For PDS: XRPC response parsing already creates proper BlobRef
  const result = await this.agent.com.atproto.repo.uploadBlob(data, { encoding });
  return result.data.blob; // Already a BlobRef with CID object

  // For SDS: Parse response using jsonStringToLex
  const jsonData = await response.json();
  const result = jsonStringToLex(JSON.stringify(jsonData)) as { blob: BlobRef };
  return result.blob; // Proper BlobRef with CID object
}
```

### Creating Records with Blobs

The SDK passes `BlobRef` instances directly to records. The AT Protocol agent handles serialization via
`stringifyLex()`:

```typescript
// In HypercertOperationsImpl
const imageBlobRef = await this.blobs.upload(params.image);
hypercertRecord.image = imageBlobRef; // BlobRef with CID object

// When creating the record, stringifyLex() converts to wire format
await this.agent.com.atproto.repo.createRecord({
  repo: this.repoDid,
  collection: "org.hypercerts.claim.activity",
  record: hypercertRecord, // image will serialize correctly
});
```

## Common Pitfalls

### 1. Creating BlobRef with String CID

```typescript
// WRONG - will serialize incorrectly
const blobRef = new BlobRef(cid.toString(), mimeType, size);

// CORRECT - pass the CID object
const blobRef = new BlobRef(cidObject, mimeType, size);

// Or use jsonStringToLex to parse wire format
const blobRef = jsonStringToLex(jsonString) as BlobRef;
```

### 2. Manual JSON Construction

```typescript
// WRONG - bypasses proper serialization
const record = {
  image: {
    $type: "blob",
    ref: { $link: "bafyrei..." },
    mimeType: "image/png",
    size: 1234,
  },
};

// CORRECT - use BlobRef instance
const record = {
  image: blobRef, // Let stringifyLex handle serialization
};
```

### 3. Version Mismatches

Different versions of `@atproto/lexicon` have separate `BlobRef` classes. A `BlobRef` from one version won't pass
`instanceof` checks against another version's class:

```typescript
// In SDK (using @atproto/lexicon@0.5.2)
const blobRef = new BlobRef(...);

// In validation (using @atproto/lexicon@0.6.1)
blobRef instanceof BlobRef; // false! Different class objects
```

**Solution**: Normalize records by round-tripping through wire format before validation:

```typescript
import { jsonStringToLex, stringifyLex } from "@atproto/lexicon";

/**
 * Normalizes a record by round-tripping through AT Protocol wire format.
 * This ensures all BlobRef instances are from the same @atproto/lexicon version,
 * which is required for instanceof checks in validation to pass.
 */
function normalizeRecord<T>(record: T): T {
  const wireFormat = stringifyLex(record);
  return jsonStringToLex(wireFormat) as T;
}

// Before validation, normalize the record
const normalized = normalizeRecord(collectionRecord);
const result = validate(normalized, "org.hypercerts.claim.collection", "main", false);
```

This works because:

1. `stringifyLex()` converts all `BlobRef` instances to wire format JSON
2. `jsonStringToLex()` parses that JSON back, creating new `BlobRef` instances from the current package version
3. The new `BlobRef` instances pass `instanceof` checks during validation

### Why This Happens

The SDK has multiple versions of `@atproto/lexicon` in its dependency tree:

- `@atproto/api` (XRPC layer) uses `@atproto/lexicon@0.5.2`
- `@hypercerts-org/lexicon` (validation) uses `@atproto/lexicon@0.6.1`
- SDK itself uses `@atproto/lexicon@0.6.1`

When XRPC parses server responses, it creates `BlobRef` instances using v0.5.2. When validation checks
`value instanceof BlobRef`, it checks against v0.6.1's class - which fails because they're different class objects.

## Testing with BlobRef

When writing tests, create proper `BlobRef` instances using `jsonStringToLex()`:

```typescript
import { BlobRef, jsonStringToLex } from "@atproto/lexicon";

// Helper to create test BlobRef with proper CID object
function createTestBlobRef(cid: string, mimeType: string, size: number): BlobRef {
  const json = JSON.stringify({
    $type: "blob",
    ref: { $link: cid },
    mimeType,
    size,
  });
  return jsonStringToLex(json) as BlobRef;
}

// Use in tests
const mockBlobRef = createTestBlobRef("bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454", "image/png", 1234);
```

## Summary

| Function            | Input                     | Output                    | Use Case                |
| ------------------- | ------------------------- | ------------------------- | ----------------------- |
| `stringifyLex()`    | JS object with BlobRef    | JSON string (wire format) | Sending to server       |
| `jsonStringToLex()` | JSON string (wire format) | JS object with BlobRef    | Parsing server response |
| `BlobRef.toJSON()`  | BlobRef instance          | Wire format object        | Manual serialization    |
| `BlobRef.ipld()`    | BlobRef instance          | IPLD format (raw CID)     | Internal representation |

**Key Rule**: Always ensure `BlobRef.ref` contains a CID object, not a string. Use `jsonStringToLex()` to parse wire
format into proper `BlobRef` instances.
