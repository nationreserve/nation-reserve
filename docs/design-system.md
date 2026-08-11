# RoboWorkPool design system

Version `1.0.0-foundation` lives in `packages/design-system`. Semantic CSS variables—not raw colors—encode surface, text, action, status, financial, and robot meanings. Components consume these variables and support `system`, `light`, and `dark` themes. The gallery at `/development/components` is the repository's isolated component-development environment; it uses deterministic fixtures and no backend.

Use shared buttons, fields, feedback, tables, status, money, time, identifiers, page states, workflow, and explanation components. Do not add a local status color or financial label. Every interactive control needs an accessible name and visible focus. Component APIs follow semantic versioning: patch for fixes, minor for compatible additions, major for breaking APIs or visual behavior.
