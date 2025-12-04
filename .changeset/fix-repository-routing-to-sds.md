---
"@hypercerts-org/sdk-core": patch
---

fix(sdk-core): ensure repository operations route to correct server (PDS/SDS)

**Problem:**
When using OAuth authentication to access organization repositories on SDS via `repo.repo(organizationDid)`, all operations like `hypercerts.list()` and `hypercerts.listCollections()` were incorrectly routing to the user's PDS instead of the SDS server, causing "Could not find repo" errors.

**Root Cause:**
The AT Protocol Agent was created from the OAuth session but only had its `api.xrpc.uri` property configured. Without setting the Agent's `service` property, it continued using the session's default PDS URL for all requests, even when switched to organization repositories.

**Solution:**
Set both `agent.service` and `agent.api.xrpc.uri` to the specified server URL in the Repository constructor. This ensures that:
- Initial repository creation routes to the correct server (PDS or SDS)
- Repository switching via `.repo(did)` maintains the same server routing
- All operation implementations (HypercertOperationsImpl, RecordOperationsImpl, ProfileOperationsImpl, BlobOperationsImpl) now route correctly

**Documentation:**
Added comprehensive PDS/SDS orchestration explanation to README covering:
- Server type comparison and use cases
- How repository routing works internally
- Common patterns for personal vs organization hypercerts
- Key implementation details about Agent configuration
