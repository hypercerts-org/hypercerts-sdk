---
"@hypercerts-org/sdk-core": patch
---

Fix collaborator permissions parsing to align with SDS API response format. The SDS API returns permissions as objects with boolean flags (`{ read: true, create: true, ... }`) rather than string arrays. This fix simplifies the permissions parser to handle only the actual format returned by the API.
