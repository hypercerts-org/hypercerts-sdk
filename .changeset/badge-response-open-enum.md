---
"@hypercerts-org/sdk-core": minor
---

Add BadgeResponseParams types and widen response field to accept any string

- Add `BadgeResponseValue` type (`"accepted" | "rejected" | (string & {})`) — widens the closed enum to accept any
  string, aligned with beta.15 lexicon which changes this to open `knownValues`
- Add `CreateBadgeResponseParams`, `UpdateBadgeResponseParams`, `BadgeResponseParams` types following the standard SDK
  CRUD type pattern
