---
"@hypercerts-org/sdk-core": minor
---

Implement ConfigurableAgent for proper multi-server routing

This release introduces the `ConfigurableAgent` class that enables proper routing of AT Protocol requests to different servers (PDS, SDS, or custom instances) while maintaining OAuth authentication from a single session.

**Breaking Changes:**
- Repository now uses `ConfigurableAgent` internally instead of standard `Agent`
- This fixes the issue where invalid `agent.service` and `agent.api.xrpc.uri` property assignments were causing TypeScript errors

**New Features:**
- `ConfigurableAgent` class exported from `@hypercerts-org/sdk-core`
- Support for simultaneous connections to multiple SDS instances with one OAuth session
- Proper request routing based on configured service URL rather than session defaults

**Bug Fixes:**
- Remove invalid Agent property assignments that caused TypeScript compilation errors (TS2339)
- Replace all `any` types in test files with proper type annotations
- Eliminate build warnings from missing type declarations

**Architecture:**
The new routing system wraps the OAuth session's fetch handler to prepend the target server URL, ensuring requests go to the intended destination while maintaining full authentication (DPoP, access tokens, etc.). This enables use cases like:
- Routing to SDS while authenticated via PDS
- Accessing multiple organization SDS instances simultaneously
- Testing against different server environments
- Dynamic switching between PDS and SDS operations

**Migration:**
No action required - the change is transparent to existing code. The Repository API remains unchanged.
