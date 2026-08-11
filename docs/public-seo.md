# Public SEO and metadata

Every implemented page sets a unique title, description, canonical path, and public robots policy. FAQ and organization pages provide JSON-LD foundations. Heading levels, link text, and orientation copy are semantic. Authentication and portal routes remain outside the public-page metadata system and must be deployed with `noindex` policy.

The canonical origin currently derives from the browser origin. Production deployment must supply the approved public origin, prerender or server-render public routes, generate an XML sitemap from `publicRoutes`, and provide reviewed Open Graph/social images. These deployment items are not falsely claimed complete in the client-only Vite build.
