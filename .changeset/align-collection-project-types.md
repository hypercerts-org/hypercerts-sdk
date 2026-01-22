---
"@hypercerts-org/sdk-core": minor
---

feat: align collection/project types with lexicon + add inline location support

This is a BREAKING change.

**Type Alignment with Lexicon:**

- Changed `createCollection` to use lexicon-aligned `items` array instead of `claims`
- Updated avatar/banner handling to use proper lexicon union types
- Simplified project methods to delegate to collection methods
- Added `CreateCollectionParams`, `UpdateCollectionParams`, and result types derived from lexicon
- Improved type safety by deriving SDK input types from lexicon definitions

**Inline Location Support:**

`AttachLocationParams` now supports three ways to specify location:

1. **StrongRef** - Direct reference with uri and cid (no record creation)
2. **AT-URI string** - Reference to existing location record
3. **Location object** - Full location data to create a new location record

**Changes:**

- Add `AttachLocationParams` union type supporting StrongRef, string URI, or location object
- Add optional `location` field to `CreateCollectionParams`
- Add optional `location` field to `UpdateCollectionParams` (supports `null` to remove)
- Update `CreateCollectionResult` to include optional `locationUri` field
- Implement location handling in `createCollection()` - supports all three forms
- Add tests for collection creation with StrongRef, string URI, and location object

**Example Usage:**

```typescript
// Create a project with location (StrongRef - direct reference)
const project = await repo.hypercerts.createProject({
  title: "Climate Initiative",
  items: [...],
  location: { uri: "at://did:plc:alice/app.certified.location/abc", cid: "bafy..." },
});

// Create with location (AT-URI string - fetches CID)
const project2 = await repo.hypercerts.createProject({
  title: "Forest Project",
  items: [...],
  location: "at://did:plc:bob/app.certified.location/xyz",
});

// Create with location (location object - creates new record)
const project3 = await repo.hypercerts.createProject({
  title: "Ocean Project",
  items: [...],
  location: {
    lpVersion: "1.0",
    srs: "EPSG:4326",
    locationType: "coordinate-decimal",
    location: "37.7749, -122.4194",
  },
});

// Update project to change location
await repo.hypercerts.updateProject(project.uri, {
  location: "at://did:plc:alice/app.certified.location/new",
});

// Remove location
await repo.hypercerts.updateProject(project.uri, {
  location: null,
});
```
