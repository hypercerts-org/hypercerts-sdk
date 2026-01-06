# @hypercerts-org/sdk-react

## 0.10.0-beta.0

### Minor Changes

- [#46](https://github.com/hypercerts-org/hypercerts-sdk/pull/46)
  [`eda4ac2`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eda4ac233e09764d83f042ba7df94d4c9884cc01) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Initial release of sdk-react package with React hooks and components
  for Hypercerts ATProto SDK

- [#66](https://github.com/hypercerts-org/hypercerts-sdk/pull/66)
  [`7c33673`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7c33673fd5f53d92ba160ced1d1582178fa7c455) Thanks
  [@aspiers](https://github.com/aspiers)! - feat: migrate to published @hypercerts-org/lexicon package

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
     - `lexicons` now exported as type-only (use `HYPERCERTS_LEXICON_JSON` or `HYPERCERTS_LEXICON_DOC` for runtime
       values)

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

### Patch Changes

- [#64](https://github.com/hypercerts-org/hypercerts-sdk/pull/64)
  [`f83f03a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f83f03a8e505d57d38b45f3a50213ca1035c1229) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - fix(lexicon): correct field names and types to match lexicon schema
  - Fix `workTimeframeFrom/To` -> `workTimeFrameFrom/To` (capital 'F' in Frame)
  - Make `shortDescription` required for hypercert claims per lexicon schema
  - Update all interfaces, implementations, and tests to use correct field names
  - Add comprehensive lexicon documentation to README

- [#59](https://github.com/hypercerts-org/hypercerts-sdk/pull/59)
  [`7020fcc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7020fcc9845a4d4c2f792536611fc3bb5e3c4fe3) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Configure npm publishing to exclude source code and development files.
  Packages now only include the compiled `dist/` folder, README, and necessary runtime files (lexicon schemas). This
  reduces package sizes and prevents unnecessary files from being published to npm.

- [#55](https://github.com/hypercerts-org/hypercerts-sdk/pull/55)
  [`23c3d9a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23c3d9a3b71f326df68b65420c83f7ae42c2432d) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Fix endpoints and NSIDs for SDS operations in CollaboratorOperations
  and OrganizationOperations

- [#56](https://github.com/hypercerts-org/hypercerts-sdk/pull/56)
  [`caceacb`](https://github.com/hypercerts-org/hypercerts-sdk/commit/caceacbc5572a590c750a95ccfda23fff2dd0c61) Thanks
  [@bitbeckers](https://github.com/bitbeckers)! - Add pagination support and fix React hooks for SDS operations

  **Breaking Changes (sdk-core):**
  - `CollaboratorOperations.list()` now returns `{ collaborators: RepositoryAccessGrant[], cursor?: string }` instead of
    `RepositoryAccessGrant[]`
  - `OrganizationOperations.list()` now returns `{ organizations: OrganizationInfo[], cursor?: string }` instead of
    `OrganizationInfo[]`

  **Features:**
  - Add cursor-based pagination support to collaborator and organization list operations
  - Support optional `limit` and `cursor` parameters for paginated queries
  - Update internal methods (`hasAccess`, `getRole`, `get`) to handle new pagination structure

  **Bug Fixes (sdk-core):**
  - Fix permissions parsing in `CollaboratorOperationsImpl.list()` to match actual SDS API format (object with boolean
    flags)
  - Prevent `TypeError: permissionArray.includes is not a function` by correctly handling permissions as objects
  - Fix Agent service URL configuration to route queries to the correct server (PDS or SDS)
  - Resolve "Could not find repo" errors when querying SDS repositories by ensuring Agent uses SDS service endpoint
  - Update test mocks to use the actual SDS API response format

  **Bug Fixes (sdk-react):**
  - Fix `useCollaborators` hook to correctly destructure paginated response
  - Fix `useOrganizations` hook to correctly destructure paginated response
  - All React hooks now properly handle the new pagination structure

  **Documentation:**
  - Comprehensive README updates with clear examples for all SDK operations
  - Added pagination examples throughout documentation
  - Improved code samples with realistic use cases

  **Tests:**
  - All 317 tests passing (181 sdk-core + 136 sdk-react)
  - Updated test mocks to match new pagination response structure
  - Build completes with zero warnings

- Updated dependencies
  [[`f7594f8`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f7594f838fd7e64837da702f7498e84a49b28bf5),
  [`bcde5fa`](https://github.com/hypercerts-org/hypercerts-sdk/commit/bcde5faeb11dba6d99967a434e8ec32d67b3aca5),
  [`f83f03a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/f83f03a8e505d57d38b45f3a50213ca1035c1229),
  [`4b80edc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/4b80edca4162c4ce929edb28ffffa3f99f21cb74),
  [`7020fcc`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7020fcc9845a4d4c2f792536611fc3bb5e3c4fe3),
  [`39accd9`](https://github.com/hypercerts-org/hypercerts-sdk/commit/39accd954422c901b7faf93e08be88e68a4f849a),
  [`cb3268d`](https://github.com/hypercerts-org/hypercerts-sdk/commit/cb3268d78614efaf15aecc57a5dc3bce8313f3ca),
  [`23c3d9a`](https://github.com/hypercerts-org/hypercerts-sdk/commit/23c3d9a3b71f326df68b65420c83f7ae42c2432d),
  [`eda4ac2`](https://github.com/hypercerts-org/hypercerts-sdk/commit/eda4ac233e09764d83f042ba7df94d4c9884cc01),
  [`7c33673`](https://github.com/hypercerts-org/hypercerts-sdk/commit/7c33673fd5f53d92ba160ced1d1582178fa7c455),
  [`826b50c`](https://github.com/hypercerts-org/hypercerts-sdk/commit/826b50c140a56fee4feeb6b6c83d1123e44c5118),
  [`caceacb`](https://github.com/hypercerts-org/hypercerts-sdk/commit/caceacbc5572a590c750a95ccfda23fff2dd0c61)]:
  - @hypercerts-org/sdk-core@1.0.0-beta.0
