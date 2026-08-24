# Database Object Access Classification

RoboWorkPool clients use the authenticated RoboWorkPool API. They do not query
PostgREST, GraphQL, or PostgreSQL RPC functions directly. Accordingly, every
application object created in the exposed `public` schema is classified
`SERVER_ONLY` by migration `0040_supabase_access_and_journal_integrity.sql`.

The migration records every table, partitioned table, view, materialized view,
sequence, and function in `database_object_access_classification`. Its fields
provide the object name, classification, client roles, read/write rule,
organization scope, and notes. This catalog is populated from PostgreSQL's
catalog during migration so an object cannot be omitted from a handwritten list.

For all classified objects:

- `anon` and `authenticated` receive no direct privileges.
- Tables have RLS enabled with no browser-client policies.
- Views and materialized views are not browser-readable.
- Functions are not exposed as browser-callable RPCs.
- The database owner/backend connection retains its normal access.
- Organization, role, ownership, conversation, and manufacturer authorization
  remains enforced by the existing RoboWorkPool API services.

The same migration changes default privileges for objects subsequently created
by that migration owner. Any future direct Supabase client access must be added
through a reviewed forward migration that changes the object's classification,
adds narrowly scoped RLS policies, and adds the minimum required grants.

Supabase Storage buckets used for training data, manufacturer documents, and
contract documents remain private. No anonymous storage policy is introduced.
