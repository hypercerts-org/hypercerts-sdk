---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": patch
---

Add pagination support and fix React hooks for SDS operations

**Breaking Changes (sdk-core):**
- `CollaboratorOperations.list()` now returns `{ collaborators: RepositoryAccessGrant[], cursor?: string }` instead of `RepositoryAccessGrant[]`
- `OrganizationOperations.list()` now returns `{ organizations: OrganizationInfo[], cursor?: string }` instead of `OrganizationInfo[]`

**Features:**
- Add cursor-based pagination support to collaborator and organization list operations
- Support optional `limit` and `cursor` parameters for paginated queries
- Update internal methods (`hasAccess`, `getRole`, `get`) to handle new pagination structure

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
