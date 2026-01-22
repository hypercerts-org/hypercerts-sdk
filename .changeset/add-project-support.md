---
"@hypercerts-org/sdk-core": minor
"@hypercerts-org/sdk-react": minor
---

Add comprehensive project support to SDK

**Core SDK (`@hypercerts-org/sdk-core`):**

- Add project CRUD operations (createProject, getProject, listProjects, updateProject, deleteProject)
- Add project events (projectCreated, projectUpdated, projectDeleted)
- Support for avatar and coverPhoto blob uploads
- Activities array with weight values
- Location reference support
- 34 comprehensive tests with full coverage

**React SDK (`@hypercerts-org/sdk-react`):**

- Add useProjects and useProject hooks
- Project query keys for cache management
- TypeScript types for projects (Project, CreateProjectParams, UpdateProjectParams)
- Test factory support for project hooks
- Full pagination and optimistic updates support

Projects organize multiple hypercert activities with metadata including title, shortDescription, description (Leaflet
documents), avatar, cover photo, activities with weights, and location references.
