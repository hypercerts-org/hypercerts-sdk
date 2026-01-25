---
"@hypercerts-org/sdk-core": minor
---

Add `contributionWeight` field support to contributor structure in hypercert creation.

Consumers can now optionally specify a `weight` property when providing contributions:

```typescript
await repo.hypercerts.create({
  // ...
  contributions: [
    {
      contributors: ["did:plc:abc"],
      role: "Developer",
      weight: "0.75", // New optional field
    },
  ],
});
```

The weight is stored as a string to avoid floating-point precision issues.
