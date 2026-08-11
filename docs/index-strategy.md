# Index strategy

Migration `0022_production_reliability.sql` documents executable indexes for serial lookup, manufacturer/model state, company/manufacturer/facility contracts, assignment schedules, heartbeat time ranges, verified intervals, timeline audiences/search/time, unread notifications, message pages, jobs, and event deliveries.

B-tree indexes serve equality plus ordered paging. GIN serves full-text search. BRIN serves append-heavy chronological tables. Partial indexes cover unread or live subsets. Every new index requires a named query family and `EXPLAIN` evidence; redundant or unused indexes are removed only through a reviewed migration after observing `pg_stat_user_indexes`.
