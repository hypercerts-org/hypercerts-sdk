---
"@hypercerts-org/sdk-core": major
"@hypercerts-org/sdk-react": minor
---

feat: migrate to published @hypercerts-org/lexicon package

This release migrates the SDK from using a local `packages/lexicon` workspace to consuming the published
`@hypercerts-org/lexicon` package from npm.

**Benefits:**

- **Single source of truth**: Lexicon definitions now come from a dedicated, independently versioned package
- **Reduced codebase**: Removes ~3,000 lines of duplicated lexicon code from this repository
- **Better versioning**: Lexicon can be updated independently via semver dependency updates
- **Simplified architecture**: No longer maintaining duplicate lexicon tooling in monorepo
- **Improved maintainability**: Clearer separation of concerns between SDK and lexicon definitions

**Breaking Changes:**

1. **Removed `LexiconRegistry` class**: Use the `validate()` function instead
2. **Removed `ValidationResult` type**: Validation functions now throw errors on validation failure
3. **Renamed type exports** to match lexicon package conventions:
   - `OrgHypercertsClaim` → `OrgHypercertsClaimActivity`
   - `OrgHypercertsCollection` → `OrgHypercertsClaimCollection`
4. **Renamed constant exports** to use consistent naming:
   - `schemas` → `HYPERCERTS_SCHEMAS`
   - `schemaDict` → `HYPERCERTS_SCHEMA_DICT`
   - `ids` → `HYPERCERTS_NSIDS`
   - `lexicons` now exported as type-only (use `HYPERCERTS_LEXICON_JSON` or `HYPERCERTS_LEXICON_DOC` for runtime values)

**Migration Guide:**

**Validation:**

```typescript
// Before
import { LexiconRegistry, HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";
const registry = new LexiconRegistry();
registry.registerLexicons(HYPERCERT_LEXICONS);
const result = registry.validate(HYPERCERT_COLLECTIONS.CLAIM, claimData);
if (!result.valid) {
  console.error("Invalid record:", result.error);
}

// After
import { validate, HYPERCERT_COLLECTIONS } from "@hypercerts-org/sdk-core";
try {
  validate(HYPERCERT_COLLECTIONS.CLAIM, claimData);
} catch (error) {
  console.error("Invalid record:", error);
}
```

**Type imports:**

```typescript
// Before
import { OrgHypercertsClaim, OrgHypercertsCollection } from "@hypercerts-org/sdk-core";

// After
import { OrgHypercertsClaimActivity, OrgHypercertsClaimCollection } from "@hypercerts-org/sdk-core";
```

**Constant imports:**

```typescript
// Before
import { schemas, schemaDict, ids } from "@hypercerts-org/sdk-core";

// After
import { HYPERCERTS_SCHEMAS, HYPERCERTS_SCHEMA_DICT, HYPERCERTS_NSIDS } from "@hypercerts-org/sdk-core";
```

**Other Changes:**

- Added dependency on `@hypercerts-org/lexicon@0.10.0-beta.3`
- Updated all lexicon type exports to use namespaced imports from lexicon package
- Improved hypercert validation with new test coverage
- Enhanced test mocks and fixtures for better testability

**For SDK users**: If you're using `LexiconRegistry`, follow the migration guide above. If you're only using the
high-level Repository API, no changes are required.
