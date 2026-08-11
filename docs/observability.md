# Observability

Metrics cover API and database latency, errors, pool saturation, Redis hit rate, queue depth/age/dead letters, worker heartbeats, heartbeat throughput/validation, timeline/search latency, upload failures, payment failures, and backup age. Dashboards separate customer impact from infrastructure symptoms.

Logs are structured and contain service, severity, request ID, correlation ID, safe user/organization identifiers, route or job type, duration, and outcome. Secrets, credentials, signatures, tokens, payment details, private training content, and raw heartbeat payloads are prohibited. Traces propagate correlation IDs through API, outbox, consumers, and jobs.
