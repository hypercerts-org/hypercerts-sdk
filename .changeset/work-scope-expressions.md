---
"@hypercerts-org/sdk-core": minor
---

Add work scope logic expression types for boolean-based scope filtering

New type exports:

- `HypercertWorkScopeAll` - Logical AND: all nested expressions must be satisfied
- `HypercertWorkScopeAny` - Logical OR: at least one nested expression must be satisfied
- `HypercertWorkScopeNot` - Logical NOT: the nested expression must not be satisfied
- `HypercertWorkScopeAtom` - Atomic scope reference to a work scope tag
- `HypercertWorkScopeExpression` - Union type of all work scope expression types

New work scope tag params types:

- `CreateWorkScopeTagParams` - Parameters for creating new scope tags
- `UpdateWorkScopeTagParams` - Parameters for updating existing scope tags
- `WorkScopeTagParams` - Union of create/update params

These types enable building complex boolean logic trees in the `workScope` field of activity claims, supporting
sophisticated categorization like: "(Climate AND Technology) OR (Environment AND NOT FossilFuels)"

All types include comprehensive JSDoc documentation with code examples.
