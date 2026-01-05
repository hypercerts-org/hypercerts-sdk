---
"@hypercerts-org/sdk-core": patch
"@hypercerts-org/sdk-react": patch
"@hypercerts-org/lexicon": patch
---

Configure npm publishing to exclude source code and development files. Packages now only include the compiled `dist/`
folder, README, and necessary runtime files (lexicon schemas). This reduces package sizes and prevents unnecessary files
from being published to npm.
