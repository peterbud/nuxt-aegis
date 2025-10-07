# Project References
For comprehensive understanding of the project scope and technical architecture, refer to:

* Requirements Specification: /specs/requirements.md - Complete functional and non-functional requirements following EARS format

# General Guidance

* Use TypeScript and Vue for all code.
* Use camelCase for variable names, PascalCase for class names.
* Use spaces for indentation.
* Use single quotes for strings.
* Use 2 spaces for indentation
* Ignore linting errors during code generations

# Folder structure

* 'src/' - Main source code for the Nuxt module
* 'src/module.ts' - Entry point for the Nuxt module
* 'src/runtime/' - Runtime code for the module
* 'src/runtime/app' - Client-side code for managing authentication state and interactions
* 'src/runtime/app/plugins/' - Plugin for authentication state management
* 'src/runtime/app/composables/' - Composables for authentication and token management
* 'src/runtime/server/' - Server-side code for handling authentication and token management
* 'src/runtime/server/utils/' - Utility functions for token handling and provider interactions
* 'src/runtime/server/middleware/' - Middleware for protecting routes and handling authentication flows
* 'src/runtime/server/providers/' - Built-in authentication provider implementations (e.g., Google, Microsoft)
* 'src/runtime/server/routes/' - API routes for login, callback, token refresh, and logout
* 'src/runtime/types/' - TypeScript type definitions
* 'specs/' - Specifications and requirements documents
* 'tests/' - Unit and integration tests for the module