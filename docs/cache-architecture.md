# Cache architecture

Redis caches dashboard projections, configuration, feature flags, organization settings, safe discovery results, and bounded search results. Cache keys include schema version, organization scope, permission scope, and normalized query input. Sensitive cross-organization responses are never shared.

Writes publish domain events. Database triggers enqueue tag invalidations transactionally; the cache-invalidation worker removes tagged values. TTL is a safety bound, not the primary consistency mechanism. Cache failure degrades to PostgreSQL, while authentication, permissions, payments, verified time, and authoritative financial balances never depend on cached truth. Monitor hits, misses, invalidation lag, errors, and memory eviction.
