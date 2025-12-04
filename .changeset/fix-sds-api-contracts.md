---
"@hypercerts-org/sdk-core": patch
---

Fix SDS organization and collaborator operations to match API contracts

- Add required creatorDid parameter to organization.create endpoint
- Fix organization.list to parse organizations field instead of repositories
- Update accessType values to match SDS API: owner|shared|none (was owner|collaborator)
- Add permission string array parser for collaborator.list endpoint
- Update type definitions to match actual SDS API response formats
