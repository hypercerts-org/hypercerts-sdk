---
"@hypercerts-org/sdk-core": minor
---

Rename evidence records to attachments and update schema to match lexicon changes

**Breaking Changes:**

**API Symbol Renames:**

- `addEvidence()` → `addAttachment()`
- `CreateHypercertEvidenceParams` → `CreateAttachmentParams`
- `evidenceUris` → `attachmentUris` in create results
- `evidenceAdded` → `attachmentAdded` event
- Evidence type exports replaced with Attachment equivalents

**Schema Field Changes:**

**Subject Fields:**

- `subjectUri` (string) → `subjects` (array of StrongRefs or a single uri or StrongRef)
- `subject` (StrongRef) → `subjects` (array of StrongRefs or a single uri or StrongRef)

**Content Fields:**

- `content` (string | Blob) | Array<(string | Blob)> → `content` (required array of URI/Blob refs)
- Content is now required and can be an array with multiple items or a single item. SDK will convert to an array

**Removed Fields:**

- `relationType` - removed from attachment schema
- `contributors` - removed from attachment schema
- `locations` - removed from attachment schema

**Payload Mapping Examples:**

```typescript
// Old evidence payload
{
  subjectUri: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
  content: "https://example.com/report.pdf",
  title: "Report",
  relationType: "supports"
}

// New attachment payload
{
  subjects: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
  content: "https://example.com/report.pdf",
  title: "Report"
  // relationType removed
}
// or arrays:
{
  subjects: ["at://did:plc:abc/org.hypercerts.claim.activity/xyz", "at://did:plc:abc/org.hypercerts.claim.activity/zyx"]
  content: ["https://reportfile.com/pdf", File]
}
```
