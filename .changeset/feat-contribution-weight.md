---
"@hypercerts-org/sdk-core": minor
---

**BREAKING CHANGE**: Update contribution structure to match lexicon beta.7+ inline contributor format.

**Old API (lexicon beta.5-beta.6):**

```typescript
await repo.hypercerts.create({
  contributions: [
    {
      contributors: ["did:plc:contrib1"],
      role: "Developer",
      description: "Led backend development",
    },
  ],
});
```

**New API (lexicon beta.7+):**

```typescript
await repo.hypercerts.create({
  contributions: [
    {
      contributors: ["did:plc:contrib1"],
      contributionDetails: "Developer", // string | StrongRef | CreateContributionDetailsParams
      weight: "0.75", // optional proportional weight
    },
  ],
});
```

**Migration:** Replace `role` and `description` with `contributionDetails`. Optionally add `weight` for proportional
attribution.
