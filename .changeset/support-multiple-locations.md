---
"@hypercerts-org/sdk-core": minor
---

Support multiple locations for hypercert activity claims

**Breaking Changes:**

- `CreateHypercertParams.location` is now `CreateHypercertParams.locations` (plural, array)
- `CreateHypercertResult.locationUri` is now `CreateHypercertResult.locationUris` (plural, array)
- `CreateHypercertResult.locationCid` is now `CreateHypercertResult.locationCids` (plural, array)

**New Functionality:**

- Hypercerts can now have multiple locations to support activities spanning multiple places
- Each location can be a StrongRef, string URI, or location object
- `attachLocation()` now appends to existing locations array instead of replacing

**Migration:**

```typescript
// Before (v0.10.0-beta.5 and earlier)
await repo.hypercerts.create({
  ...params,
  location: {
    lpVersion: "1.0.0",
    srs: "EPSG:4326",
    locationType: "coordinate-decimal",
    location: "https://example.com/location",
  },
});

// After (v0.10.0-beta.6+)
await repo.hypercerts.create({
  ...params,
  locations: [
    {
      lpVersion: "1.0.0",
      srs: "EPSG:4326",
      locationType: "coordinate-decimal",
      location: "https://example.com/location",
    },
  ],
});

// Now supports multiple locations
await repo.hypercerts.create({
  ...params,
  locations: [
    { location: "https://example.com/location1", ... },
    { location: "https://example.com/location2", ... },
  ],
});
```
