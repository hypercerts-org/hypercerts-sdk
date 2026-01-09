---
"@hypercerts-org/sdk-core": minor
---

Update the params for create organization. Created a separate interface for it. Changed the params from handle to
handlePrefix as expected by the actual `sds.organizations.create` procedure call. Added validation to check the required
parameters in the call
