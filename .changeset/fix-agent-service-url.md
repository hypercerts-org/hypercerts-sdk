---
"@hypercerts-org/sdk-core": patch
---

Fix Agent service URL configuration to ensure queries are routed to the correct server (PDS or SDS). The Agent now explicitly uses the serverUrl provided to the Repository constructor, resolving "Could not find repo" errors when querying SDS repositories.
